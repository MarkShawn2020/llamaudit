import { and, desc, eq } from 'drizzle-orm';
import { db } from './drizzle';
import {
    complianceChecks,
    complianceRules,
    contracts,
    documentTypes,
    documents,
    meetingMinutes,
    organizations,
    users
} from './schema';

// 组织管理
export async function getOrganizations(teamId: number) {
    return db
        .select()
        .from(organizations)
        .where(eq(organizations.teamId, teamId))
        .orderBy(desc(organizations.createdAt));
}

export async function getOrganizationById(id: number, teamId: number) {
    return db
        .select()
        .from(organizations)
        .where(and(eq(organizations.id, id), eq(organizations.teamId, teamId)))
        .then((orgs) => (orgs.length ? orgs[0] : null));
}

export async function createOrganization(data: {
    code: string;
    name: string;
    teamId: number;
}) {
    return db.insert(organizations).values({
        code: data.code,
        name: data.name,
        teamId: data.teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();
}

export async function updateOrganization(
    id: number,
    teamId: number,
    data: Partial<{ code: string; name: string }>
) {
    return db
        .update(organizations)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(and(eq(organizations.id, id), eq(organizations.teamId, teamId)))
        .returning();
}

export async function deleteOrganization(id: number, teamId: number) {
    return db
        .delete(organizations)
        .where(and(eq(organizations.id, id), eq(organizations.teamId, teamId)))
        .returning();
}

// 文档类型管理
export async function getDocumentTypes() {
    return db.select().from(documentTypes).orderBy(desc(documentTypes.createdAt));
}

export async function getDocumentTypeById(id: number) {
    return db
        .select()
        .from(documentTypes)
        .where(eq(documentTypes.id, id))
        .then((types) => (types.length ? types[0] : null));
}

export async function createDocumentType(data: { name: string; description?: string }) {
    return db.insert(documentTypes).values({
        name: data.name,
        description: data.description,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();
}

// 文档管理
export async function getDocuments(
    teamId: number,
    filters?: {
        organizationId?: number;
        documentTypeId?: number;
        extractedInfo?: boolean;
    }
) {
    // 构建条件数组
    const conditions = [eq(documents.teamId, teamId)];

    if (filters?.organizationId) {
        conditions.push(eq(documents.organizationId, filters.organizationId));
    }

    if (filters?.documentTypeId) {
        conditions.push(eq(documents.documentTypeId, filters.documentTypeId));
    }

    if (filters?.extractedInfo !== undefined) {
        conditions.push(eq(documents.extractedInfo, filters.extractedInfo));
    }

    return db
        .select({
            document: documents,
            documentType: documentTypes,
            organization: organizations,
            uploader: {
                id: users.id,
                name: users.name,
                email: users.email,
            },
        })
        .from(documents)
        .innerJoin(documentTypes, eq(documents.documentTypeId, documentTypes.id))
        .innerJoin(organizations, eq(documents.organizationId, organizations.id))
        .innerJoin(users, eq(documents.uploadedBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(documents.uploadedAt));
}

export async function getDocumentById(id: number, teamId: number) {
    return db
        .select({
            document: documents,
            documentType: documentTypes,
            organization: organizations,
            uploader: {
                id: users.id,
                name: users.name,
                email: users.email,
            },
        })
        .from(documents)
        .innerJoin(documentTypes, eq(documents.documentTypeId, documentTypes.id))
        .innerJoin(organizations, eq(documents.organizationId, organizations.id))
        .innerJoin(users, eq(documents.uploadedBy, users.id))
        .where(and(eq(documents.id, id), eq(documents.teamId, teamId)))
        .then((docs) => (docs.length ? docs[0] : null));
}


export async function updateDocumentExtractedStatus(
    id: number,
    teamId: number,
    extractedInfo: boolean
) {
    return db
        .update(documents)
        .set({ extractedInfo })
        .where(and(eq(documents.id, id), eq(documents.teamId, teamId)))
        .returning();
}

export async function deleteDocument(id: number, teamId: number) {
    return db
        .delete(documents)
        .where(and(eq(documents.id, id), eq(documents.teamId, teamId)))
        .returning();
}

// 会议纪要提取结果
export async function getMeetingMinutes(documentId: number) {
    return db
        .select()
        .from(meetingMinutes)
        .where(eq(meetingMinutes.documentId, documentId))
        .then((mins) => (mins.length ? mins[0] : null));
}

export async function createMeetingMinutes(data: {
    documentId: number;
    meetingDate?: Date;
    documentNumber?: string;
    meetingTopic?: string;
    meetingConclusion?: string;
    contentSummary?: string;
    eventType?: string;
    eventDetails?: string;
    involvedAmount?: number;
    relatedDepartments?: string;
    relatedPersonnel?: string;
    decisionBasis?: string;
    originalText?: string;
}) {
    return db.insert(meetingMinutes).values({
        ...data,
        extractedAt: new Date(),
    }).returning();
}

// 合同提取结果
export async function getContract(documentId: number) {
    return db
        .select()
        .from(contracts)
        .where(eq(contracts.documentId, documentId))
        .then((cons) => (cons.length ? cons[0] : null));
}

export async function createContract(data: {
    documentId: number;
    contractNumber?: string;
    signingDate?: Date;
    contractName?: string;
    partyA?: string;
    partyB?: string;
    amountWithTax?: number;
    amountWithoutTax?: number;
    paymentTerms?: string;
    performancePeriod?: string;
    obligations?: string;
    acceptanceCriteria?: string;
    liabilityForBreach?: string;
}) {
    return db.insert(contracts).values({
        ...data,
        extractedAt: new Date(),
    }).returning();
}

// 合规规则
export async function getComplianceRules(teamId: number) {
    return db
        .select({
            rule: complianceRules,
            creator: {
                id: users.id,
                name: users.name,
                email: users.email,
            },
        })
        .from(complianceRules)
        .innerJoin(users, eq(complianceRules.createdBy, users.id))
        .where(eq(complianceRules.teamId, teamId))
        .orderBy(desc(complianceRules.createdAt));
}

export async function getComplianceRuleById(id: number, teamId: number) {
    return db
        .select({
            rule: complianceRules,
            creator: {
                id: users.id,
                name: users.name,
                email: users.email,
            },
        })
        .from(complianceRules)
        .innerJoin(users, eq(complianceRules.createdBy, users.id))
        .where(and(eq(complianceRules.id, id), eq(complianceRules.teamId, teamId)))
        .then((rules) => (rules.length ? rules[0] : null));
}

export async function updateComplianceRule(
    id: number,
    teamId: number,
    data: Partial<{
        name: string;
        description: string;
        ruleType: string;
        ruleConfig: any;
    }>
) {
    return db
        .update(complianceRules)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(and(eq(complianceRules.id, id), eq(complianceRules.teamId, teamId)))
        .returning();
}

export async function deleteComplianceRule(id: number, teamId: number) {
    return db
        .delete(complianceRules)
        .where(and(eq(complianceRules.id, id), eq(complianceRules.teamId, teamId)))
        .returning();
}

// 合规检查
export async function getComplianceChecks(documentId: number) {
    return db
        .select({
            check: complianceChecks,
            rule: complianceRules,
        })
        .from(complianceChecks)
        .innerJoin(complianceRules, eq(complianceChecks.ruleId, complianceRules.id))
        .where(eq(complianceChecks.documentId, documentId))
        .orderBy(desc(complianceChecks.checkedAt));
}

export async function createComplianceCheck(data: {
    documentId: number;
    ruleId: number;
    passed: boolean;
    details?: string;
}) {
    return db.insert(complianceChecks).values({
        documentId: data.documentId,
        ruleId: data.ruleId,
        passed: data.passed,
        details: data.details,
        checkedAt: new Date(),
    }).returning();
} 
