// 使用数据库模式定义类型

import { IMeeting } from '@/types/analysis';

// 已废弃，使用新的 IMeeting 和 IKeyDecisionItem 接口
// 此处仅利用定义一个兼容类型，方便迁移期间使用
export interface AnalysisResult {
  id: string;
  fileId: string;
  itemIndex: number;
  meetingTime?: Date;
  meetingNumber?: string;
  meetingTopic?: string;
  meetingConclusion?: string;
  contentSummary?: string;
  eventCategory?: string;
  eventDetails?: string;
  amountInvolved?: string;
  relatedDepartments?: string;
  relatedPersonnel?: string;
  decisionBasis?: string;
  originalText?: string;
  status?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}


// 分组结果类型 - 已废弃，仅为了兼容旧的API
export interface GroupedResults {
  // 重大问题决策相关分析结果
  majorDecisions: AnalysisResult[];
  // 重要干部任免相关分析结果
  personnelAppointments: AnalysisResult[];
  // 重大项目投资安排投资安排相关分析结果
  majorProjects: AnalysisResult[];
  // 大额资金使用使用相关分析结果
  largeAmounts: AnalysisResult[];
}

// 文件分析分组类型 - 改用新的会议和决策项数据结构
export interface FileAnalysisGroup {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadDate?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  meetings: IMeeting[];
}
