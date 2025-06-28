CREATE TABLE "knowledge_bases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_unit_id" uuid NOT NULL,
	"dify_dataset_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"indexing_technique" varchar(50) DEFAULT 'high_quality',
	"permission" varchar(20) DEFAULT 'only_me',
	"embedding_model" varchar(100),
	"embedding_model_provider" varchar(50),
	"retrieval_config" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "knowledge_bases_dify_dataset_id_unique" UNIQUE("dify_dataset_id")
);
--> statement-breakpoint
CREATE TABLE "qa_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_base_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"sources" jsonb,
	"metadata" jsonb,
	"response_time" real,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "knowledge_base_id" uuid;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "dify_document_id" varchar(255);--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "indexing_status" varchar(50) DEFAULT 'waiting';--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_audit_unit_id_audit_units_id_fk" FOREIGN KEY ("audit_unit_id") REFERENCES "public"."audit_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_conversations" ADD CONSTRAINT "qa_conversations_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_conversations" ADD CONSTRAINT "qa_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE set null ON UPDATE no action;