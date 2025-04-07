import { toast } from "sonner";

/**
 * 会议纪要解析结果接口
 */
export interface MeetingAnalysisResult {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  parseDate?: string;
  // 以下为三重一大会议解析内容
  meetingTime?: string;
  meetingNumber?: string;
  meetingTopic?: string;
  meetingConclusion?: string;
  contentSummary?: string;
  eventCategory?: string; // 事项类别（重大决策、重要干部任免、重大项目、大额资金）
  eventDetails?: string;
  amountInvolved?: string;
  relatedDepartments?: string;
  relatedPersonnel?: string;
  decisionBasis?: string;
  originalText?: string;
  error?: string;
}

/**
 * 解析会议纪要文档，提取三重一大相关信息
 * 
 * @param fileId 文件ID
 * @returns 文件解析状态和结果
 */
export async function analyzeMeetingDocument(fileId: string): Promise<MeetingAnalysisResult> {
  try {
    // 这里只是模拟API调用，实际上需要调用后端API
    // 先返回pending状态
    const pendingResult: MeetingAnalysisResult = {
      id: fileId,
      fileName: `document-${fileId}.docx`, // 模拟文件名
      status: 'processing',
    };
    
    // 模拟API请求延迟
    const response = await new Promise<MeetingAnalysisResult>((resolve) => {
      // 模拟2-5秒的解析时间
      const delay = 2000 + Math.random() * 3000;
      
      setTimeout(() => {
        // 模拟95%的成功率
        if (Math.random() > 0.05) {
          resolve({
            ...pendingResult,
            status: 'completed',
            meetingTime: '2023年10月15日',
            meetingNumber: '企发[2023]42号',
            meetingTopic: '关于XX项目投资决策的会议',
            meetingConclusion: '一致通过该项目投资计划',
            contentSummary: '讨论了XX项目的投资规模、回报率及风险评估',
            eventCategory: Math.random() > 0.5 ? '重大项目' : '大额资金',
            eventDetails: '项目总投资约5000万元，建设周期18个月',
            amountInvolved: '5000万元',
            relatedDepartments: '财务部、工程部、法务部',
            relatedPersonnel: '张三、李四、王五',
            decisionBasis: '公司发展战略规划及市场调研报告',
            parseDate: new Date().toISOString(),
          });
        } else {
          // 模拟解析失败的情况
          resolve({
            ...pendingResult,
            status: 'error',
            error: '无法识别文档内容或文档格式不支持',
          });
        }
      }, delay);
    });
    
    return response;
  } catch (error) {
    console.error('解析文档时出错:', error);
    toast.error('文档解析失败，请重试');
    
    return {
      id: fileId,
      fileName: `document-${fileId}.docx`,
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 批量解析会议纪要文档
 * 
 * @param fileIds 文件ID数组
 * @returns 解析结果的Promise数组
 */
export function analyzeMeetingDocuments(fileIds: string[]): Promise<MeetingAnalysisResult>[] {
  return fileIds.map(fileId => analyzeMeetingDocument(fileId));
} 