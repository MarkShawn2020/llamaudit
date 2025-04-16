-- 用户表
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "name" varchar(255),
  "password_hash" varchar(255) NOT NULL,
  "role" varchar(50) NOT NULL DEFAULT 'user',
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- 团队表
CREATE TABLE IF NOT EXISTS "teams" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "stripe_customer_id" text UNIQUE,
  "stripe_subscription_id" text UNIQUE,
  "stripe_product_id" text,
  "plan_name" varchar(50),
  "subscription_status" varchar(20)
);

-- 团队成员表
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "team_id" integer NOT NULL,
  "role" varchar(50) NOT NULL,
  "joined_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "fk_team_members_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id"),
  CONSTRAINT "fk_team_members_team_id" FOREIGN KEY ("team_id") REFERENCES "teams" ("id")
);

-- 活动日志表
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" integer NOT NULL,
  "user_id" uuid,
  "action" text NOT NULL,
  "timestamp" timestamp NOT NULL DEFAULT now(),
  "ip_address" varchar(45),
  CONSTRAINT "fk_activity_logs_team_id" FOREIGN KEY ("team_id") REFERENCES "teams" ("id"),
  CONSTRAINT "fk_activity_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);

-- 邀请表
CREATE TABLE IF NOT EXISTS "invitations" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" integer NOT NULL,
  "email" varchar(255) NOT NULL,
  "role" varchar(50) NOT NULL,
  "invited_by" uuid NOT NULL,
  "invited_at" timestamp NOT NULL DEFAULT now(),
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  CONSTRAINT "fk_invitations_team_id" FOREIGN KEY ("team_id") REFERENCES "teams" ("id"),
  CONSTRAINT "fk_invitations_invited_by" FOREIGN KEY ("invited_by") REFERENCES "users" ("id")
);

-- 组织表
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(100) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "team_id" integer NOT NULL,
  CONSTRAINT "fk_organizations_team_id" FOREIGN KEY ("team_id") REFERENCES "teams" ("id")
);

-- 文档类型表
CREATE TABLE IF NOT EXISTS "document_types" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- 文档表
CREATE TABLE IF NOT EXISTS "documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "file_path" text NOT NULL,
  "file_type" varchar(255) NOT NULL,
  "document_type_id" integer NOT NULL,
  "organization_id" integer NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "uploaded_at" timestamp NOT NULL DEFAULT now(),
  "extracted_info" boolean DEFAULT false,
  "team_id" integer NOT NULL,
  CONSTRAINT "fk_documents_document_type_id" FOREIGN KEY ("document_type_id") REFERENCES "document_types" ("id"),
  CONSTRAINT "fk_documents_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id"),
  CONSTRAINT "fk_documents_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id"),
  CONSTRAINT "fk_documents_team_id" FOREIGN KEY ("team_id") REFERENCES "teams" ("id")
);

-- 会议纪要表
CREATE TABLE IF NOT EXISTS "meeting_minutes" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_id" integer NOT NULL,
  "meeting_date" timestamp,
  "document_number" varchar(100),
  "meeting_topic" text,
  "meeting_conclusion" text,
  "content_summary" text,
  "event_type" varchar(50),
  "event_details" text,
  "involved_amount" real,
  "related_departments" text,
  "related_personnel" text,
  "decision_basis" text,
  "original_text" text,
  "extracted_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "fk_meeting_minutes_document_id" FOREIGN KEY ("document_id") REFERENCES "documents" ("id")
);

-- 合同表
CREATE TABLE IF NOT EXISTS "contracts" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_id" integer NOT NULL,
  "contract_number" varchar(100),
  "signing_date" timestamp,
  "contract_name" varchar(255),
  "party_a" varchar(255),
  "party_b" varchar(255),
  "amount_with_tax" real,
  "amount_without_tax" real,
  "payment_terms" text,
  "performance_period" text,
  "obligations" text,
  "acceptance_criteria" text,
  "liability_for_breach" text,
  "extracted_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "fk_contracts_document_id" FOREIGN KEY ("document_id") REFERENCES "documents" ("id")
);

-- 合规规则表
CREATE TABLE IF NOT EXISTS "compliance_rules" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "rule_type" varchar(50) NOT NULL,
  "rule_config" json NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "team_id" integer NOT NULL,
  CONSTRAINT "fk_compliance_rules_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id"),
  CONSTRAINT "fk_compliance_rules_team_id" FOREIGN KEY ("team_id") REFERENCES "teams" ("id")
);

-- 合规检查表
CREATE TABLE IF NOT EXISTS "compliance_checks" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_id" integer NOT NULL,
  "rule_id" integer NOT NULL,
  "passed" boolean,
  "details" text,
  "checked_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "fk_compliance_checks_document_id" FOREIGN KEY ("document_id") REFERENCES "documents" ("id"),
  CONSTRAINT "fk_compliance_checks_rule_id" FOREIGN KEY ("rule_id") REFERENCES "compliance_rules" ("id")
);

-- 文件类别表
CREATE TABLE IF NOT EXISTS "file_categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL UNIQUE,
  "description" text
);

-- 被审计单位表
CREATE TABLE IF NOT EXISTS "audit_units" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
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
  CONSTRAINT "fk_audit_units_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id")
);

-- 文件表
CREATE TABLE IF NOT EXISTS "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "original_name" varchar(255) NOT NULL,
  "file_path" text NOT NULL,
  "file_size" bigint NOT NULL,
  "file_type" varchar(100) NOT NULL,
  "category_id" integer,
  "is_analyzed" boolean DEFAULT false,
  "upload_date" timestamp with time zone DEFAULT now(),
  "user_id" uuid,
  "audit_unit_id" uuid,
  "metadata" text,
  CONSTRAINT "fk_files_category_id" FOREIGN KEY ("category_id") REFERENCES "file_categories" ("id"),
  CONSTRAINT "fk_files_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id"),
  CONSTRAINT "fk_files_audit_unit_id" FOREIGN KEY ("audit_unit_id") REFERENCES "audit_units" ("id") ON DELETE CASCADE
);

-- 分析任务表
CREATE TABLE IF NOT EXISTS "analysis_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "audit_unit_id" uuid NOT NULL,
  "created_by" uuid,
  "status" varchar(50) NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now(),
  "completed_at" timestamp with time zone,
  "task_type" varchar(50) NOT NULL DEFAULT 'three_important_one_big',
  "task_config" jsonb,
  CONSTRAINT "fk_analysis_tasks_audit_unit_id" FOREIGN KEY ("audit_unit_id") REFERENCES "audit_units" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_analysis_tasks_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id")
);

-- 任务文件关联表
CREATE TABLE IF NOT EXISTS "task_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'pending',
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "error_message" text,
  CONSTRAINT "fk_task_files_task_id" FOREIGN KEY ("task_id") REFERENCES "analysis_tasks" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_task_files_file_id" FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE CASCADE,
  CONSTRAINT "task_files_unique" UNIQUE("task_id", "file_id")
);

-- 三重一大分析结果表
CREATE TABLE IF NOT EXISTS "analysis_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  
  -- 会议纪要信息
  "meeting_time" timestamp with time zone,
  "meeting_number" varchar(100),
  "meeting_topic" text,
  "meeting_conclusion" text,
  "content_summary" text,
  
  -- 三重一大分类
  "event_category" varchar(50),
  "event_details" text,
  "amount_involved" decimal(20, 2),
  
  -- 相关人员与部门
  "related_departments" text,
  "related_personnel" text,
  "decision_basis" text,
  
  -- 原文与其他信息
  "original_text" text,
  "confidence" decimal(5, 2),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "fk_analysis_results_task_id" FOREIGN KEY ("task_id") REFERENCES "analysis_tasks" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_analysis_results_file_id" FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE CASCADE,
  CONSTRAINT "analysis_results_unique" UNIQUE("task_id", "file_id")
);

-- 审计单位规则表
CREATE TABLE IF NOT EXISTS "audit_unit_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "audit_unit_id" uuid NOT NULL,
  "rule_type" varchar(100) NOT NULL,
  "rule_name" varchar(255) NOT NULL,
  "rule_description" text,
  "rule_config" jsonb NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "created_by" uuid,
  CONSTRAINT "fk_audit_unit_rules_audit_unit_id" FOREIGN KEY ("audit_unit_id") REFERENCES "audit_units" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_audit_unit_rules_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id"),
  CONSTRAINT "audit_unit_rules_unique" UNIQUE("audit_unit_id", "rule_name")
);

-- 合规检查结果表
CREATE TABLE IF NOT EXISTS "compliance_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "audit_unit_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "rule_id" uuid NOT NULL,
  "is_compliant" boolean NOT NULL,
  "issue_description" text,
  "severity" varchar(50) NOT NULL DEFAULT 'medium',
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "fk_compliance_results_audit_unit_id" FOREIGN KEY ("audit_unit_id") REFERENCES "audit_units" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_compliance_results_file_id" FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_compliance_results_rule_id" FOREIGN KEY ("rule_id") REFERENCES "audit_unit_rules" ("id")
); 