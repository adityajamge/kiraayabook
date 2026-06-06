ALTER TABLE "documents" ALTER COLUMN "property_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "property_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rent_records" ALTER COLUMN "property_id" SET NOT NULL;