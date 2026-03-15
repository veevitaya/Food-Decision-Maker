import { db } from "../db";
import { sql } from "drizzle-orm";

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id serial PRIMARY KEY,
    owner_id integer NOT NULL REFERENCES restaurant_owners(id) ON DELETE CASCADE,
    subject text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    priority text NOT NULL DEFAULT 'medium',
    messages jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )
`);
await db.execute(sql`CREATE INDEX IF NOT EXISTS support_tickets_owner_id_idx ON support_tickets(owner_id)`);
console.log("support_tickets table created");
process.exit(0);
