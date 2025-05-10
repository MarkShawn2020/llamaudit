// 使用数据库模式定义类型
import { analysisResults } from '@/lib/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

// 文件状态类型
export type FileStatus = 'pending' | 'analyzing' | 'analyzed' | 'error';

// 分析结果状态类型
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'error';

// 从数据库schema中导出分析结果类型
export type AnalysisResult = InferSelectModel<typeof analysisResults>;


// 分组结果类型 - 依照三重一大分类
export interface GroupedResults {
  // 重大决策相关分析结果
  majorDecisions: AnalysisResult[];
  // 重要干部任免相关分析结果
  personnelAppointments: AnalysisResult[];
  // 重大项目相关分析结果
  majorProjects: AnalysisResult[];
  // 大额资金相关分析结果
  largeAmounts: AnalysisResult[];
}

export interface FileAnalysisGroup {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadDate?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  results: AnalysisResult[];
} 
