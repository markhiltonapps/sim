ALTER TYPE "public"."credential_type" ADD VALUE 'nango';--> statement-breakpoint
ALTER TABLE "credential" ADD COLUMN "nango_connection_id" text;--> statement-breakpoint
CREATE INDEX "credential_nango_connection_id_idx" ON "credential" USING btree ("nango_connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credential_workspace_nango_unique" ON "credential" USING btree ("workspace_id","provider_id","nango_connection_id") WHERE nango_connection_id IS NOT NULL;
