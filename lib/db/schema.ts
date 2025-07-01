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

// Define relations for fileCategories
export const fileCategoriesRelations = relations(fileCategories, ({ many }) => ({
  files: many(files)
}));

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
  knowledgeBaseId: uuid('knowledge_base_id').references(() => knowledgeBases.id, { onDelete: 'set null' }),
  difyDocumentId: varchar('dify_document_id', { length: 255 }), // Dify 文档 ID
  indexingStatus: varchar('indexing_status', { length: 50 }).default('waiting'), // 索引状态
  metadata: text('metadata'),
  storageProvider: text('storage_provider'),
  storagePath: text('storage_path')
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

// Define relations for files
export const filesRelations = relations(files, ({ one, many }) => ({
  category: one(fileCategories, {
    fields: [files.categoryId],
    references: [fileCategories.id]
  }),
  auditUnit: one(auditUnits, {
    fields: [files.auditUnitId],
    references: [auditUnits.id]
  }),
  knowledgeBase: one(knowledgeBases, {
    fields: [files.knowledgeBaseId],
    references: [knowledgeBases.id]
  }),
  uploadedBy: one(users, {
    fields: [files.userId],
    references: [users.id],
    relationName: 'userUploadedFiles'
  }),
  llmAnalysisTasks: many(llmAnalysisTasks, { relationName: 'fileLlmAnalysisTasks' }),
}));

// LLM 分析任务跟踪表
export const llmAnalysisTasks = pgTable('llm_analysis_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: varchar('task_id', { length: 100 }).notNull().unique(), // 外部API的任务ID
  status: varchar('status', { length: 50 }).notNull(), // pending, processing, completed, failed, cancelled
  fileIds: json('file_ids').notNull(), // 分析的文件ID数组
  prompt: text('prompt'), // 用于分析的提示词
  rawResponse: text('raw_response'), // 大模型的原始回复内容
  responseFormat: varchar('response_format', { length: 20 }).default('markdown'), // 回复格式：markdown, json等
  processingTime: real('processing_time'), // 处理时间(秒)
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  error: text('error'), // 错误信息
  modelName: varchar('model_name', { length: 100 }), // 使用的模型名称
  fromFile: uuid('from_file').references(() => files.id),
  metadata: jsonb('metadata'), // 其他元数据
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const llmAnalysisTasksRelations = relations(llmAnalysisTasks, ({ one }) => ({
  fromFile: one(files, {
    fields: [llmAnalysisTasks.fromFile],
    references: [files.id],
    relationName: 'fileLlmAnalysisTasks'
  })
}));

export type LlmAnalysisTask = typeof llmAnalysisTasks.$inferSelect;
export type InsertLlmAnalysisTask = typeof llmAnalysisTasks.$inferInsert;

// 知识库表
export const knowledgeBases = pgTable('knowledge_bases', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditUnitId: uuid('audit_unit_id').notNull().references(() => auditUnits.id, { onDelete: 'cascade' }),
  difyDatasetId: varchar('dify_dataset_id', { length: 255 }).notNull().unique(), // Dify 知识库 ID
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  indexingTechnique: varchar('indexing_technique', { length: 50 }).default('high_quality'), // 索引方法
  permission: varchar('permission', { length: 20 }).default('only_me'), // 权限设置
  embeddingModel: varchar('embedding_model', { length: 100 }), // 嵌入模型
  embeddingModelProvider: varchar('embedding_model_provider', { length: 50 }), // 嵌入模型提供商
  retrievalConfig: jsonb('retrieval_config'), // 检索配置
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// 问答记录表
export const qaConversations = pgTable('qa_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeBaseId: uuid('knowledge_base_id').notNull().references(() => knowledgeBases.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  question: text('question').notNull(),
  answer: text('answer'),
  sources: jsonb('sources'), // 引用的文档片段
  metadata: jsonb('metadata'), // 额外的元数据，如检索配置等
  responseTime: real('response_time'), // 响应时间(秒)
  confidence: real('confidence'), // 置信度分数
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBases.$inferInsert;
export type QaConversation = typeof qaConversations.$inferSelect;
export type NewQaConversation = typeof qaConversations.$inferInsert;

// 知识库关系
export const knowledgeBasesRelations = relations(knowledgeBases, ({ one, many }) => ({
  auditUnit: one(auditUnits, {
    fields: [knowledgeBases.auditUnitId],
    references: [auditUnits.id]
  }),
  createdBy: one(users, {
    fields: [knowledgeBases.createdBy],
    references: [users.id]
  }),
  files: many(files),
  qaConversations: many(qaConversations)
}));

// 问答记录关系
export const qaConversationsRelations = relations(qaConversations, ({ one }) => ({
  knowledgeBase: one(knowledgeBases, {
    fields: [qaConversations.knowledgeBaseId],
    references: [knowledgeBases.id]
  }),
  user: one(users, {
    fields: [qaConversations.userId],
    references: [users.id]
  })
}));

// 被审计单位关系
export const auditUnitsRelations = relations(auditUnits, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [auditUnits.createdBy],
    references: [users.id],
    relationName: 'userCreatedAuditUnits'
  }),
  files: many(files),
  knowledgeBases: many(knowledgeBases)
}));
