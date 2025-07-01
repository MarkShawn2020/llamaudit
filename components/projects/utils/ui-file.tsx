// 扩展文件类型以适配UI需求
import {FileStatus} from "@/components/projects/utils/file-status";

export interface UIFile {
    id: string;
    originalName: string;
    fileSize: number;
    fileType: string;
    filePath: string;
    status: FileStatus;
    userId: string;
    isAnalyzed?: boolean;
    progress?: number; // 上传进度 0-100
    analysisResult?: string; // 分析结果
    error?: string; // 错误信息
    uploadDate: string;
    syncToKnowledgeBase?: boolean; // 是否同步到知识库
}