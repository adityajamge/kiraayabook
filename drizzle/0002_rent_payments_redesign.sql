-- Create payments table
CREATE TABLE "payments" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"         uuid NOT NULL REFERENCES "organisations"("id"),
  "property_id"    uuid NOT NULL REFERENCES "properties"("id"),
  "tenant_id"      uuid NOT NULL REFERENCES "tenants"("id"),
  "rent_record_id" uuid NOT NULL REFERENCES "rent_records"("id"),
  "amount"         integer NOT NULL,
  "paid_date"      date NOT NULL,
  "payment_mode"   text,
  "note"           text,
  "created_at"     timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "payments_org_id_rent_record_id_idx" ON "payments" ("org_id", "rent_record_id");--> statement-breakpoint
CREATE INDEX "payments_org_id_tenant_id_idx" ON "payments" ("org_id", "tenant_id");--> statement-breakpoint

-- Migrate existing paid records into payments before dropping columns
INSERT INTO "payments" ("org_id", "property_id", "tenant_id", "rent_record_id", "amount", "paid_date", "payment_mode")
SELECT "org_id", "property_id", "tenant_id", "id", "amount", COALESCE("paid_date", CURRENT_DATE), "payment_mode"
FROM "rent_records"
WHERE "status" = 'paid';--> statement-breakpoint

-- Rename columns on rent_records
ALTER TABLE "rent_records" RENAME COLUMN "amount" TO "amount_due";--> statement-breakpoint
ALTER TABLE "rent_records" RENAME COLUMN "period_start" TO "cycle_start";--> statement-breakpoint
ALTER TABLE "rent_records" RENAME COLUMN "period_end" TO "cycle_end";--> statement-breakpoint

-- Drop obsolete columns
ALTER TABLE "rent_records" DROP COLUMN "due_date";--> statement-breakpoint
ALTER TABLE "rent_records" DROP COLUMN "paid_date";--> statement-breakpoint
ALTER TABLE "rent_records" DROP COLUMN "payment_mode";--> statement-breakpoint

-- Drop old indexes and unique constraint
DROP INDEX IF EXISTS "rent_records_tenant_id_due_date_uidx";--> statement-breakpoint
DROP INDEX IF EXISTS "rent_records_org_id_status_due_date_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "rent_records_org_id_tenant_id_due_date_idx";--> statement-breakpoint

-- Create new unique constraint and indexes
CREATE UNIQUE INDEX "rent_records_tenant_id_cycle_start_uidx" ON "rent_records" ("tenant_id", "cycle_start");--> statement-breakpoint
CREATE INDEX "rent_records_org_id_status_cycle_start_idx" ON "rent_records" ("org_id", "status", "cycle_start");--> statement-breakpoint
CREATE INDEX "rent_records_org_id_tenant_id_cycle_start_idx" ON "rent_records" ("org_id", "tenant_id", "cycle_start");
