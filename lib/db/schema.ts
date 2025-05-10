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

// Relations for new entities
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  team: one(teams, {
    fields: [organizations.teamId],
    references: [teams.id],
  }),
}));

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

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

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

export type KeyDecisionItem = typeof keyDecisionItems.$inferSelect;
export type InsertKeyDecisionItem = typeof keyDecisionItems.$inferInsert;

// 会议表 (对应IMeeting接口)
export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  
  // 会议基本信息
  meetingDate: timestamp('meeting_date', { withTimezone: true }),
  documentNo: varchar('document_no', { length: 100 }),
  meetingTopic: text('meeting_topic'),
  conclusion: text('conclusion'),
  summary: text('summary'),
  documentName: text('document_name'),
  isTripleOneMeeting: boolean('is_triple_one_meeting').default(false),
  
  // 处理状态
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// 关键决策项表 (对应IKeyDecisionItem接口)
export const keyDecisionItems = pgTable('key_decision_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  
  // 关键决策项信息
  categoryType: varchar('category_type', { length: 50 }).notNull(),  // majorDecision, personnelAppointment, majorProject, largeAmount
  details: text('details'),
  amount: text('amount'),  // 存储带货币符号的文本金额
  departments: text('departments'),  // 以逗号分隔的部门文本
  personnel: text('personnel'),  // 以逗号分隔的人员文本
  decisionBasis: text('decision_basis'),
  originalText: text('original_text'),
  
  // 处理状态
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// 注意：已移除旧的 analysisResults 表/视图，因为我们现在直接使用 meetings 和 keyDecisionItems 表
// 相关代码已更新为使用新的数据结构

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

export const filesRelations = relations(files, ({ one }) => ({
  auditUnit: one(auditUnits, {
    fields: [files.auditUnitId],
    references: [auditUnits.id]
  }),
  uploadedBy: one(users, {
    fields: [files.userId],
    references: [users.id]
  }),
  category: one(fileCategories, {
    fields: [files.categoryId],
    references: [fileCategories.id]
  })
}));

export const fileCategoriesRelations = relations(fileCategories, ({ many }) => ({
  files: many(files)
}));


export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  file: one(files, {
    fields: [meetings.fileId],
    references: [files.id]
  }),
  keyDecisionItems: many(keyDecisionItems)
}));

export const keyDecisionItemsRelations = relations(keyDecisionItems, ({ one }) => ({
  meeting: one(meetings, {
    fields: [keyDecisionItems.meetingId],
    references: [meetings.id]
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
