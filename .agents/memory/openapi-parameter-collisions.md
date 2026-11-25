---
name: OpenAPI parameter collisions
description: A non-obvious Orval naming collision in the workspace OpenAPI codegen.
---

For an operation with both path parameters and query parameters, the generated Zod files may export the same `<Operation>Params` name as both a schema value and a TypeScript type, causing a TS2308 duplicate export. In QueueUp's ticket lookup, a required `X-Ticket-Token` header avoids the collision and keeps the secret out of URLs.

**Why:** Orval's generated names for query parameter types can overlap its Zod schema name for path parameters.

**How to apply:** If codegen reports a duplicate `*Params` export, inspect the generated Zod schema and types before changing the operation ID. For sensitive access values, prefer a required header over a query string, then rerun API codegen.
