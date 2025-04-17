import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  json,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  decimal,
} from 'drizzle-orm/pg-core';
import { StorageProvider } from '../file-storage';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  auditUnits: many(auditUnits, { relationName: 'userCreatedAuditUnits' }),
  uploadedFiles: many(files, { relationName: 'userUploadedFiles' }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

// Audit Organization entities
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
});

export const documentTypes = pgTable('document_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  fileType: varchar('file_type', { length: 255 }).notNull(),
  documentTypeId: integer('document_type_id')
    .notNull()
    .references(() => documentTypes.id),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => users.id),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  extractedInfo: boolean('extracted_info').default(false),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
});

export const meetingMinutes = pgTable('meeting_minutes', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id')
    .notNull()
    .references(() => documents.id),
  meetingDate: timestamp('meeting_date'),
  documentNumber: varchar('document_number', { length: 100 }),
  meetingTopic: text('meeting_topic'),
  meetingConclusion: text('meeting_conclusion'),
  contentSummary: text('content_summary'),
  eventType: varchar('event_type', { length: 50 }),
  eventDetails: text('event_details'),
  involvedAmount: real('involved_amount'),
  relatedDepartments: text('related_departments'),
  relatedPersonnel: text('related_personnel'),
  decisionBasis: text('decision_basis'),
  originalText: text('original_text'),
  extractedAt: timestamp('extracted_at').notNull().defaultNow(),
});

export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id')
    .notNull()
    .references(() => documents.id),
  contractNumber: varchar('contract_number', { length: 100 }),
  signingDate: timestamp('signing_date'),
  contractName: varchar('contract_name', { length: 255 }),
  partyA: varchar('party_a', { length: 255 }),
  partyB: varchar('party_b', { length: 255 }),
  amountWithTax: real('amount_with_tax'),
  amountWithoutTax: real('amount_without_tax'),
  paymentTerms: text('payment_terms'),
  performancePeriod: text('performance_period'),
  obligations: text('obligations'),
  acceptanceCriteria: text('acceptance_criteria'),
  liabilityForBreach: text('liability_for_breach'),
  extractedAt: timestamp('extracted_at').notNull().defaultNow(),
});

export const complianceRules = pgTable('compliance_rules', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  ruleConfig: json('rule_config').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
});

export const complianceChecks = pgTable('compliance_checks', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id')
    .notNull()
    .references(() => documents.id),
  ruleId: integer('rule_id')
    .notNull()
    .references(() => complianceRules.id),
  passed: boolean('passed'),
  details: text('details'),
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
});

// Relations for new entities
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  team: one(teams, {
    fields: [organizations.teamId],
    references: [teams.id],
  }),
  documents: many(documents),
}));

export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  documentType: one(documentTypes, {
    fields: [documents.documentTypeId],
    references: [documentTypes.id],
  }),
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [documents.teamId],
    references: [teams.id],
  }),
  meetingMinutes: many(meetingMinutes),
  contracts: many(contracts),
  complianceChecks: many(complianceChecks),
}));

export const meetingMinutesRelations = relations(meetingMinutes, ({ one }) => ({
  document: one(documents, {
    fields: [meetingMinutes.documentId],
    references: [documents.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  document: one(documents, {
    fields: [contracts.documentId],
    references: [documents.id],
  }),
}));

export const complianceRulesRelations = relations(complianceRules, ({ one, many }) => ({
  creator: one(users, {
    fields: [complianceRules.createdBy],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [complianceRules.teamId],
    references: [teams.id],
  }),
  complianceChecks: many(complianceChecks),
}));

export const complianceChecksRelations = relations(complianceChecks, ({ one }) => ({
  document: one(documents, {
    fields: [complianceChecks.documentId],
    references: [documents.id],
  }),
  rule: one(complianceRules, {
    fields: [complianceChecks.ruleId],
    references: [complianceRules.id],
  }),
}));

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type DocumentType = typeof documentTypes.$inferSelect;
export type NewDocumentType = typeof documentTypes.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type MeetingMinutes = typeof meetingMinutes.$inferSelect;
export type NewMeetingMinutes = typeof meetingMinutes.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
export type ComplianceRule = typeof complianceRules.$inferSelect;
export type NewComplianceRule = typeof complianceRules.$inferInsert;
export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type NewComplianceCheck = typeof complianceChecks.$inferInsert;

// 文件类别表
export const fileCategories = pgTable('file_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description')
});

// 被审计单位表
export const auditUnits = pgTable('audit_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  address: text('address'),
  contactPerson: varchar('contact_person', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by').references(() => users.id)
});

// 文件表
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  categoryId: integer('category_id').references(() => fileCategories.id),
  isAnalyzed: boolean('is_analyzed').default(false),
  uploadDate: timestamp('upload_date', { withTimezone: true }).defaultNow(),
  userId: uuid('user_id').references(() => users.id),
  auditUnitId: uuid('audit_unit_id').references(() => auditUnits.id, { onDelete: 'cascade' }),
  metadata: text('metadata'),
  storageProvider: text('storage_provider'),
  storagePath: text('storage_path')
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

// 三重一大分析结果表
export const analysisResults = pgTable('analysis_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  
  // 分析项目编号（一个文件可能有多个三重一大事项）
  itemIndex: integer('item_index').notNull().default(0),
  
  // 会议纪要信息
  meetingTime: timestamp('meeting_time', { withTimezone: true }),
  meetingNumber: varchar('meeting_number', { length: 100 }),
  meetingTopic: text('meeting_topic'),
  meetingConclusion: text('meeting_conclusion'),
  contentSummary: text('content_summary'),
  
  // 三重一大分类
  eventCategory: varchar('event_category', { length: 50 }),
  eventDetails: text('event_details'),
  amountInvolved: decimal('amount_involved', { precision: 20, scale: 2 }),
  
  // 相关人员与部门
  relatedDepartments: text('related_departments'),
  relatedPersonnel: text('related_personnel'),
  decisionBasis: text('decision_basis'),
  
  // 原文与其他信息
  originalText: text('original_text'),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// 设置分析结果复合唯一约束（文件ID + 项目索引）
export const analysisResultsUnique = sql`
  ALTER TABLE ${analysisResults} ADD CONSTRAINT analysis_results_unique UNIQUE(file_id, item_index);
`;

// 审计单位规则表
export const auditUnitRules = pgTable('audit_unit_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditUnitId: uuid('audit_unit_id').notNull().references(() => auditUnits.id, { onDelete: 'cascade' }),
  ruleType: varchar('rule_type', { length: 100 }).notNull(),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  ruleDescription: text('rule_description'),
  ruleConfig: jsonb('rule_config').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by').references(() => users.id)
});

// 设置规则唯一约束
export const auditUnitRulesUnique = sql`
  ALTER TABLE ${auditUnitRules} ADD CONSTRAINT audit_unit_rules_unique UNIQUE(audit_unit_id, rule_name);
`;

// 合规检查结果表
export const complianceResults = pgTable('compliance_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditUnitId: uuid('audit_unit_id').notNull().references(() => auditUnits.id, { onDelete: 'cascade' }),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  ruleId: uuid('rule_id').notNull().references(() => auditUnitRules.id),
  isCompliant: boolean('is_compliant').notNull(),
  issueDescription: text('issue_description'),
  severity: varchar('severity', { length: 50 }).notNull().default('medium'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const auditUnitsRelations = relations(auditUnits, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [auditUnits.createdBy],
    references: [users.id],
    relationName: 'userCreatedAuditUnits'
  }),
  files: many(files),
  rules: many(auditUnitRules)
}));

export const fileCategoriesRelations = relations(fileCategories, ({ many }) => ({
  files: many(files)
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  auditUnit: one(auditUnits, {
    fields: [files.auditUnitId],
    references: [auditUnits.id]
  }),
  category: one(fileCategories, {
    fields: [files.categoryId],
    references: [fileCategories.id]
  }),
  uploadedBy: one(users, {
    fields: [files.userId],
    references: [users.id],
    relationName: 'userUploadedFiles'
  }),
  analysisResults: many(analysisResults)
}));

export const analysisResultsRelations = relations(analysisResults, ({ one }) => ({
  file: one(files, {
    fields: [analysisResults.fileId],
    references: [files.id]
  })
}));

export const auditUnitRulesRelations = relations(auditUnitRules, ({ one, many }) => ({
  auditUnit: one(auditUnits, {
    fields: [auditUnitRules.auditUnitId],
    references: [auditUnits.id]
  }),
  createdBy: one(users, {
    fields: [auditUnitRules.createdBy],
    references: [users.id]
  }),
  complianceResults: many(complianceResults)
}));

export const complianceResultsRelations = relations(complianceResults, ({ one }) => ({
  auditUnit: one(auditUnits, {
    fields: [complianceResults.auditUnitId],
    references: [auditUnits.id]
  }),
  file: one(files, {
    fields: [complianceResults.fileId],
    references: [files.id]
  }),
  rule: one(auditUnitRules, {
    fields: [complianceResults.ruleId],
    references: [auditUnitRules.id]
  })
}));
