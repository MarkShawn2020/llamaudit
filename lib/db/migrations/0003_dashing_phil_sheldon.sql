CREATE TABLE "analysis_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"meeting_time" timestamp with time zone,
	"meeting_number" varchar(100),
	"meeting_topic" text,
	"meeting_conclusion" text,
	"content_summary" text,
	"event_category" varchar(50),
	"event_details" text,
	"amount_involved" numeric(20, 2),
	"related_departments" text,
	"related_personnel" text,
	"decision_basis" text,
	"original_text" text,
	"confidence" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analysis_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"audit_unit_id" uuid NOT NULL,
	"created_by" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"task_type" varchar(50) DEFAULT 'three_important_one_big' NOT NULL,
	"task_config" jsonb
);
--> statement-breakpoint
CREATE TABLE "audit_unit_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_unit_id" uuid NOT NULL,
	"rule_type" varchar(100) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"rule_description" text,
	"rule_config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "audit_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"address" text,
	"contact_person" varchar(100),
	"phone" varchar(50),
	"email" varchar(255),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "audit_units_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "compliance_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_unit_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"is_compliant" boolean NOT NULL,
	"issue_description" text,
	"severity" varchar(50) DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "file_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	CONSTRAINT "file_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "task_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "file_type" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "file_path" text NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "file_size" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "is_analyzed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "upload_date" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "audit_unit_id" uuid;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_task_id_analysis_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."analysis_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_tasks" ADD CONSTRAINT "analysis_tasks_audit_unit_id_audit_units_id_fk" FOREIGN KEY ("audit_unit_id") REFERENCES "public"."audit_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_tasks" ADD CONSTRAINT "analysis_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_unit_rules" ADD CONSTRAINT "audit_unit_rules_audit_unit_id_audit_units_id_fk" FOREIGN KEY ("audit_unit_id") REFERENCES "public"."audit_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_unit_rules" ADD CONSTRAINT "audit_unit_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_units" ADD CONSTRAINT "audit_units_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_results" ADD CONSTRAINT "compliance_results_audit_unit_id_audit_units_id_fk" FOREIGN KEY ("audit_unit_id") REFERENCES "public"."audit_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_results" ADD CONSTRAINT "compliance_results_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_results" ADD CONSTRAINT "compliance_results_rule_id_audit_unit_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."audit_unit_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_task_id_analysis_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."analysis_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_category_id_file_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."file_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_audit_unit_id_audit_units_id_fk" FOREIGN KEY ("audit_unit_id") REFERENCES "public"."audit_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "size";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "url";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "storage_path";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "storage_provider";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "deleted_at";