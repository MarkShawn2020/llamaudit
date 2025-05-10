CREATE TABLE "key_decision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"category_type" varchar(50) NOT NULL,
	"details" text,
	"amount" text,
	"departments" text,
	"personnel" text,
	"decision_basis" text,
	"original_text" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"meeting_date" timestamp with time zone,
	"document_no" varchar(100),
	"meeting_topic" text,
	"conclusion" text,
	"summary" text,
	"document_name" text,
	"is_triple_one_meeting" boolean DEFAULT false,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "analysis_results" CASCADE;--> statement-breakpoint
ALTER TABLE "key_decision_items" ADD CONSTRAINT "key_decision_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;