import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import {
  db,
  businessesTable,
  ticketsTable,
  type Business,
  type BusinessCategory,
  type Ticket,
  type TicketStatus,
} from "@workspace/db";

const scrypt = promisify(scryptCallback);
const activeStatuses = ["Waiting", "Called", "Serving"] as const;
const waitingStatuses = ["Called", "Serving"] as const;
const endedStatuses = ["Completed", "Skipped"] as const;

export class QueueUpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "QueueUpError";
  }
}

type BusinessFields = {
  name: string;
  slug: string;
  category: BusinessCategory;
  averageServiceMinutes: number;
  maxActiveCapacity: number;
  isPaused: boolean;
};

type SettingsInput = Partial<
  Pick<
    BusinessFields,
    "name" | "category" | "averageServiceMinutes" | "maxActiveCapacity"
  >
>;

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hashAccessCode(accessCode: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(accessCode, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyAccessCode(
  accessCode: string,
  storedHash: string,
): Promise<boolean> {
  const [saltHex, keyHex] = storedHash.split(":");
  if (!saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex + keyHex)) {
    return false;
  }
  try {
    const actual = (await scrypt(
      accessCode,
      Buffer.from(saltHex, "hex"),
      64,
    )) as Buffer;
    const expected = Buffer.from(keyHex, "hex");
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "business"
  );
}

function toBusinessResponse(business: Business): BusinessFields & { id: string } {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    category: business.category,
    averageServiceMinutes: business.averageServiceMinutes,
    maxActiveCapacity: business.maxActiveCapacity,
    isPaused: business.isPaused,
  };
}

export async function createBusiness(input: {
  name: string;
  category: BusinessCategory;
  averageServiceMinutes: number;
  maxActiveCapacity: number;
  accessCode: string;
}): Promise<Business> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 100) {
    throw new QueueUpError(400, "Business name must be between 2 and 100 characters");
  }
  const adminAccessCodeHash = await hashAccessCode(input.accessCode);
  const slug = `${slugify(name)}-${randomBytes(5).toString("hex")}`;
  const [business] = await db
    .insert(businessesTable)
    .values({
      name,
      slug,
      category: input.category,
      averageServiceMinutes: input.averageServiceMinutes,
      maxActiveCapacity: input.maxActiveCapacity,
      adminAccessCodeHash,
    })
    .returning();
  return business;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.slug, slug))
    .limit(1);
  return business ?? null;
}

export async function getBusinessView(slug: string): Promise<BusinessFields & { id: string }> {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");
  return toBusinessResponse(business);
}

async function getActiveTickets(businessId: string): Promise<Ticket[]> {
  return db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.businessId, businessId),
        inArray(ticketsTable.status, activeStatuses),
      ),
    )
    .orderBy(asc(ticketsTable.createdAt), asc(ticketsTable.id));
}

function currentTicket(activeTickets: Ticket[]): Ticket | null {
  return (
    activeTickets.find((ticket) =>
      (waitingStatuses as readonly string[]).includes(ticket.status),
    ) ?? null
  );
}

function activeQueueSummary(business: Business, activeTickets: Ticket[]) {
  const waitingCount = activeTickets.filter(
    (ticket) => ticket.status === "Waiting",
  ).length;
  const nowServing = currentTicket(activeTickets);
  return {
    waitingCount,
    activeCount: activeTickets.length,
    availableSpots: Math.max(0, business.maxActiveCapacity - activeTickets.length),
    currentTicketNumber: nowServing?.ticketNumber ?? null,
  };
}

function remainingCurrentServiceMinutes(
  business: Business,
  activeTickets: Ticket[],
): number {
  const serving = currentTicket(activeTickets);
  if (!serving) return 0;
  if (!serving.startedAt) return business.averageServiceMinutes;
  const elapsedMinutes = (Date.now() - serving.startedAt.getTime()) / 60_000;
  return Math.max(0, business.averageServiceMinutes - elapsedMinutes);
}

function customerTicketResponse(
  ticket: Ticket,
  business: Business,
  activeTickets: Ticket[],
) {
  const activeIndex = activeTickets.findIndex((item) => item.id === ticket.id);
  const isActive = activeIndex >= 0;
  const customersAhead =
    ticket.status === "Waiting" && isActive ? activeIndex : 0;
  const current = currentTicket(activeTickets);
  let estimatedWaitMinutes = 0;
  if (ticket.status === "Waiting") {
    const precedingWaiting =
      activeIndex < 0
        ? 0
        : activeTickets
            .slice(0, activeIndex)
            .filter((item) => item.status === "Waiting").length;
    estimatedWaitMinutes =
      remainingCurrentServiceMinutes(business, activeTickets) +
      precedingWaiting * business.averageServiceMinutes;
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    customerName: ticket.customerName,
    status: ticket.status,
    customersAhead,
    activeQueueSize: activeTickets.length,
    estimatedWaitMinutes: Math.max(0, Math.ceil(estimatedWaitMinutes)),
    currentTicketNumber: current?.ticketNumber ?? null,
    businessName: business.name,
    isPaused: business.isPaused,
    updatedAt: new Date(),
  };
}

export async function getPublicBusiness(slug: string) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");
  const activeTickets = await getActiveTickets(business.id);
  return {
    business: toBusinessResponse(business),
    queue: activeQueueSummary(business, activeTickets),
  };
}

export async function getQueueDisplay(slug: string) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");
  const activeTickets = await getActiveTickets(business.id);
  const current = currentTicket(activeTickets);
  const nextTicketNumbers = activeTickets
    .filter((ticket) => ticket.status === "Waiting")
    .slice(0, 5)
    .map((ticket) => ticket.ticketNumber);
  return {
    businessName: business.name,
    currentTicketNumber: current?.ticketNumber ?? null,
    nextTicketNumbers,
    waitingCount: activeTickets.filter((ticket) => ticket.status === "Waiting")
      .length,
    isPaused: business.isPaused,
    updatedAt: new Date(),
  };
}

export async function joinQueue(
  slug: string,
  input: { customerName: string; clientToken: string },
) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");

  const clientTokenHash = hashToken(input.clientToken);
  const ticketAccessToken = randomBytes(32).toString("base64url");
  const ticketAccessTokenHash = hashToken(ticketAccessToken);
  const customerName = input.customerName.trim();
  if (!customerName) throw new QueueUpError(400, "Customer name is required");

  const created = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM queueup_businesses WHERE id = ${business.id} FOR UPDATE`,
    );
    const [lockedBusiness] = await tx
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, business.id))
      .limit(1);
    if (!lockedBusiness) throw new QueueUpError(404, "Business not found");
    if (lockedBusiness.isPaused) {
      throw new QueueUpError(409, "This queue is paused right now");
    }

    const [duplicate] = await tx
      .select({ id: ticketsTable.id })
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.businessId, lockedBusiness.id),
          eq(ticketsTable.clientTokenHash, clientTokenHash),
          inArray(ticketsTable.status, activeStatuses),
        ),
      )
      .limit(1);
    if (duplicate) {
      throw new QueueUpError(
        409,
        "This browser already has an active ticket for this queue",
      );
    }

    const activeTickets = await tx
      .select({ id: ticketsTable.id })
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.businessId, lockedBusiness.id),
          inArray(ticketsTable.status, activeStatuses),
        ),
      );
    if (activeTickets.length >= lockedBusiness.maxActiveCapacity) {
      throw new QueueUpError(409, "This queue has reached its capacity");
    }

    const [updatedBusiness] = await tx
      .update(businessesTable)
      .set({
        ticketCounter: sql`${businessesTable.ticketCounter} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(businessesTable.id, lockedBusiness.id))
      .returning();
    if (!updatedBusiness) throw new QueueUpError(404, "Business not found");

    const ticketNumber = `A-${String(updatedBusiness.ticketCounter).padStart(3, "0")}`;
    const [ticket] = await tx
      .insert(ticketsTable)
      .values({
        businessId: updatedBusiness.id,
        ticketNumber,
        customerName,
        clientTokenHash,
        ticketAccessTokenHash,
      })
      .returning();

    const queue = await tx
      .select()
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.businessId, updatedBusiness.id),
          inArray(ticketsTable.status, activeStatuses),
        ),
      )
      .orderBy(asc(ticketsTable.createdAt), asc(ticketsTable.id));

    return {
      ticket,
      business: updatedBusiness,
      activeTickets: queue,
    };
  });

  return {
    ...customerTicketResponse(
      created.ticket,
      created.business,
      created.activeTickets,
    ),
    ticketAccessToken,
  };
}

export async function getCustomerTicket(
  slug: string,
  ticketId: string,
  accessToken: string,
) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");
  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.id, ticketId),
        eq(ticketsTable.businessId, business.id),
      ),
    )
    .limit(1);
  if (!ticket) throw new QueueUpError(404, "Ticket not found");

  const providedHash = Buffer.from(hashToken(accessToken), "hex");
  const expectedHash = Buffer.from(ticket.ticketAccessTokenHash, "hex");
  if (
    providedHash.length !== expectedHash.length ||
    !timingSafeEqual(providedHash, expectedHash)
  ) {
    throw new QueueUpError(403, "Ticket access token is invalid");
  }

  const activeTickets = await getActiveTickets(business.id);
  return customerTicketResponse(ticket, business, activeTickets);
}

function managementTicket(ticket: Ticket) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    customerName: ticket.customerName,
    status: ticket.status,
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt,
    startedAt: ticket.startedAt,
    completedAt: ticket.completedAt,
    recallCount: ticket.recallCount,
  };
}

export async function getManagementDashboard(slug: string) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");

  const activeTickets = await getActiveTickets(business.id);
  const [waitingResult] = await db
    .select({ value: count() })
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.businessId, business.id),
        eq(ticketsTable.status, "Waiting"),
      ),
    );
  const [servingResult] = await db
    .select({ value: count() })
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.businessId, business.id),
        eq(ticketsTable.status, "Serving"),
      ),
    );
  const [completedResult] = await db
    .select({ value: count() })
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.businessId, business.id),
        eq(ticketsTable.status, "Completed"),
      ),
    );
  const startedTickets = await db
    .select({
      createdAt: ticketsTable.createdAt,
      startedAt: ticketsTable.startedAt,
    })
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.businessId, business.id),
        isNotNull(ticketsTable.startedAt),
      ),
    )
    .orderBy(desc(ticketsTable.createdAt))
    .limit(500);
  const waitDurations = startedTickets
    .filter((ticket) => ticket.startedAt)
    .map((ticket) =>
      Math.max(0, ticket.startedAt!.getTime() - ticket.createdAt.getTime()),
    );
  const averageWaitingMinutes =
    waitDurations.length === 0
      ? 0
      : Math.round(
          waitDurations.reduce((total, wait) => total + wait, 0) /
            waitDurations.length /
            60_000,
        );

  const history = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.businessId, business.id),
        inArray(ticketsTable.status, endedStatuses),
      ),
    )
    .orderBy(desc(ticketsTable.createdAt))
    .limit(15);

  return {
    business: toBusinessResponse(business),
    stats: {
      waitingCustomers: waitingResult?.value ?? 0,
      currentlyServing: servingResult?.value ?? 0,
      completedTickets: completedResult?.value ?? 0,
      averageWaitingMinutes,
    },
    tickets: [
      ...activeTickets.map(managementTicket),
      ...history.map(managementTicket),
    ],
  };
}

export async function updateBusinessSettings(
  slug: string,
  input: SettingsInput,
) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");
  const updates = { ...input };
  if (updates.name !== undefined) {
    updates.name = updates.name.trim();
    if (updates.name.length < 2 || updates.name.length > 100) {
      throw new QueueUpError(400, "Business name must be between 2 and 100 characters");
    }
  }
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM queueup_businesses WHERE id = ${business.id} FOR UPDATE`,
    );
    await tx
      .update(businessesTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businessesTable.id, business.id));
  });
  return getManagementDashboard(slug);
}

export async function updateQueueState(slug: string, isPaused: boolean) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM queueup_businesses WHERE id = ${business.id} FOR UPDATE`,
    );
    await tx
      .update(businessesTable)
      .set({ isPaused, updatedAt: new Date() })
      .where(eq(businessesTable.id, business.id));
  });
  return getManagementDashboard(slug);
}

export async function callNextCustomer(slug: string) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM queueup_businesses WHERE id = ${business.id} FOR UPDATE`,
    );
    const [current] = await tx
      .select({ id: ticketsTable.id })
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.businessId, business.id),
          inArray(ticketsTable.status, waitingStatuses),
        ),
      )
      .limit(1);
    if (current) {
      throw new QueueUpError(
        409,
        "Finish or skip the current customer before calling another",
      );
    }

    const [next] = await tx
      .select()
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.businessId, business.id),
          eq(ticketsTable.status, "Waiting"),
        ),
      )
      .orderBy(asc(ticketsTable.createdAt), asc(ticketsTable.id))
      .limit(1);
    if (!next) throw new QueueUpError(409, "There are no customers waiting");
    const now = new Date();
    await tx
      .update(ticketsTable)
      .set({ status: "Called", calledAt: now, lastCalledAt: now })
      .where(eq(ticketsTable.id, next.id));
  });
  return getManagementDashboard(slug);
}

export async function recallCurrentCustomer(slug: string) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM queueup_businesses WHERE id = ${business.id} FOR UPDATE`,
    );
    const [current] = await tx
      .select()
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.businessId, business.id),
          inArray(ticketsTable.status, waitingStatuses),
        ),
      )
      .limit(1);
    if (!current) throw new QueueUpError(409, "There is no current customer");
    await tx
      .update(ticketsTable)
      .set({
        recallCount: current.recallCount + 1,
        lastCalledAt: new Date(),
      })
      .where(eq(ticketsTable.id, current.id));
  });
  return getManagementDashboard(slug);
}

export async function updateTicketStatus(
  slug: string,
  ticketId: string,
  action: "start" | "complete" | "skip",
) {
  const business = await getBusinessBySlug(slug);
  if (!business) throw new QueueUpError(404, "Business not found");

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM queueup_businesses WHERE id = ${business.id} FOR UPDATE`,
    );
    const [ticket] = await tx
      .select()
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.businessId, business.id),
          eq(ticketsTable.id, ticketId),
        ),
      )
      .limit(1);
    if (!ticket) throw new QueueUpError(404, "Ticket not found");

    const now = new Date();
    if (action === "start") {
      if (ticket.status !== "Called") {
        throw new QueueUpError(409, "Only a called customer can start service");
      }
      await tx
        .update(ticketsTable)
        .set({ status: "Serving", startedAt: now })
        .where(eq(ticketsTable.id, ticket.id));
    } else if (action === "complete") {
      if (ticket.status !== "Serving") {
        throw new QueueUpError(409, "Only a serving customer can be completed");
      }
      await tx
        .update(ticketsTable)
        .set({ status: "Completed", completedAt: now })
        .where(eq(ticketsTable.id, ticket.id));
    } else {
      if (!(activeStatuses as readonly TicketStatus[]).includes(ticket.status)) {
        throw new QueueUpError(409, "Only an active ticket can be skipped");
      }
      await tx
        .update(ticketsTable)
        .set({ status: "Skipped", skippedAt: now })
        .where(eq(ticketsTable.id, ticket.id));
    }
  });
  return getManagementDashboard(slug);
}
