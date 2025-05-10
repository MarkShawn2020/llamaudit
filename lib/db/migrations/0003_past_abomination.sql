CREATE TABLE "llm_analysis_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"file_ids" json NOT NULL,
	"prompt" text,
	"raw_response" text,
	"response_format" varchar(20) DEFAULT 'markdown',
	"processing_time" real,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error" text,
	"model_name" varchar(100),
	"from_file" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "llm_analysis_tasks_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
DROP TABLE "audit_unit_rules" CASCADE;--> statement-breakpoint
DROP TABLE "compliance_results" CASCADE;--> statement-breakpoint
DROP TABLE "key_decision_items" CASCADE;--> statement-breakpoint
DROP TABLE "meetings" CASCADE;--> statement-breakpoint
ALTER TABLE "llm_analysis_tasks" ADD CONSTRAINT "llm_analysis_tasks_from_file_files_id_fk" FOREIGN KEY ("from_file") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;