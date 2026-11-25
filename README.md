# QueueUp

QueueUp lets service businesses run a digital waiting line. Customers join from a public link without an account, owners manage tickets from a protected dashboard, and a public display shows ticket numbers without exposing customer names.

## Run the app

The project has two managed services:

- QueueUp web app: `pnpm --filter @workspace/queueup run dev`
- QueueUp API: `pnpm --filter @workspace/api-server run dev`

Use the project's **Run** button to start the configured services and open the web preview. The shared PostgreSQL database is configured through `DATABASE_URL`. The API also needs `SESSION_SECRET` to sign owner sessions; configure it through Replit Secrets rather than putting it in source code.

Apply development database schema changes with:

```sh
pnpm --filter @workspace/db run push
```

## Create and manage a queue

1. Open the QueueUp home page and choose **Create a queue**.
2. Enter the business details, average service duration, active queue capacity, and an owner access code. Confirm the access code.
3. Save the customer booking link, owner dashboard link, and public display link shown after setup.
4. Share the booking link with customers. They enter a name and receive a sequential ticket number. They do not need an account, email, or phone number.
5. Sign in at the owner dashboard with the access code. Call the next customer, start service, complete or skip a ticket, recall the current ticket, pause bookings, or update business settings.
6. Open the display link on a TV or reception screen. It refreshes automatically and shows ticket numbers only.

Customers can reopen their ticket in the same browser. A private access token and a browser-generated duplicate-prevention token are stored locally; the owner access code is not.

## Queue behavior

- Tickets are assigned in FIFO order with a business-specific sequence.
- Only one ticket can be called or served at a time.
- Waiting positions and wait estimates are calculated by the API and refresh automatically.
- Completed and skipped tickets remain in the database for dashboard history and counts.
- Public business and display endpoints never return customer names.
- Owner access codes are salted and hashed. Owner sessions use signed, HTTP-only cookies.

## Verification

Run the workspace type checks:

```sh
pnpm run typecheck
```

For a manual walkthrough, create a queue, open its booking page, join once, reload the ticket page, and verify that the ticket remains visible. In the owner dashboard, call the ticket, start service, complete it, then try pause/resume and settings. Open the public display in another tab and confirm the current number changes without refreshing.
