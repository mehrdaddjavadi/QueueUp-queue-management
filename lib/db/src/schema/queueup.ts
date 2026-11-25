import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessCategoryEnum = pgEnum("queueup_business_category", [
  "Barbershop",
  "Medical Clinic",
  "Beauty Salon",
  "Restaurant",
  "Car Wash",
  "Repair Shop",
  "Other",
]);

export const ticketStatusEnum = pgEnum("queueup_ticket_status", [
  "Waiting",
  "Called",
  "Serving",
  "Completed",
  "Skipped",
]);

export const businessesTable = pgTable(
  "queueup_businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    category: businessCategoryEnum("category").notNull(),
    averageServiceMinutes: integer("average_service_minutes").notNull(),
    maxActiveCapacity: integer("max_active_capacity").notNull(),
    adminAccessCodeHash: text("admin_access_code_hash").notNull(),
    isPaused: boolean("is_paused").notNull().default(false),
    ticketCounter: integer("ticket_counter").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("queueup_businesses_slug_unique").on(table.slug),
    index("queueup_businesses_created_at_idx").on(table.createdAt),
  ],
);

export const ticketsTable = pgTable(
  "queueup_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    ticketNumber: varchar("ticket_number", { length: 24 }).notNull(),
    customerName: varchar("customer_name", { length: 80 }).notNull(),
    clientTokenHash: varchar("client_token_hash", { length: 64 }).notNull(),
    ticketAccessTokenHash: varchar("ticket_access_token_hash", {
      length: 64,
    }).notNull(),
    status: ticketStatusEnum("status").notNull().default("Waiting"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    calledAt: timestamp("called_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    recallCount: integer("recall_count").notNull().default(0),
    lastCalledAt: timestamp("last_called_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("queueup_tickets_business_number_unique").on(
      table.businessId,
      table.ticketNumber,
    ),
    uniqueIndex("queueup_tickets_active_client_unique")
      .on(table.businessId, table.clientTokenHash)
      .where(
        sql`${table.status} IN ('Waiting', 'Called', 'Serving')`,
      ),
    index("queueup_tickets_business_status_created_idx").on(
      table.businessId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTicketSchema = createInsertSchema(ticketsTable).omit({
  id: true,
  createdAt: true,
  calledAt: true,
  startedAt: true,
  completedAt: true,
  skippedAt: true,
  lastCalledAt: true,
});

export type BusinessCategory =
  (typeof businessCategoryEnum.enumValues)[number];
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];
export type Business = typeof businessesTable.$inferSelect;
export type Ticket = typeof ticketsTable.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
