ALTER TABLE "audit_units" ADD COLUMN "dify_base_url" varchar(500) DEFAULT 'https://api.dify.ai/v1';--> statement-breakpoint
ALTER TABLE "audit_units" ADD COLUMN "dify_dataset_api_key" text;--> statement-breakpoint
ALTER TABLE "audit_units" ADD COLUMN "dify_config_updated_at" timestamp with time zone;