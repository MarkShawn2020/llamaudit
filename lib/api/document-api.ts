import { toast } from "sonner";

/**
 * 三重一大事项接口
 */
export interface ImportantBigItem {
  // 事项ID (内部生成的UUID)
  itemId: string;
  // 会议时间
  meetingTime?: string;
  // 文号
  meetingNumber?: string;
  // 会议议题
  meetingTopic?: string;
  // 会议结论
  meetingConclusion?: string;
  // 内容摘要
  contentSummary?: string;
  // 事项类别（重大决策、重要干部任免、重大项目、大额资金）
  eventCategory?: string; 
  // 事项详情
  eventDetails?: string;
  // 涉及金额
  amountInvolved?: string;
  // 相关部门
  relatedDepartments?: string;
  // 相关人员
  relatedPersonnel?: string;
  // 决策依据
  decisionBasis?: string;
  // 原文
  originalText?: string;
}

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
  // 三重一大事项列表 (一个文件可能包含多个事项)
  items?: ImportantBigItem[];
  // 兼容旧代码的单事项字段
  meetingTime?: string;
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
          // 随机生成1-3个三重一大事项
          const itemCount = Math.floor(Math.random() * 3) + 1;
          const items: ImportantBigItem[] = [];
          
          // 生成模拟数据
          for (let i = 0; i < itemCount; i++) {
            const eventTypes = ['重大决策', '重要干部任免', '重大项目', '大额资金'];
            const eventCategory = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            
            items.push({
              itemId: `item-${fileId}-${i}`,
              meetingTime: `2023年${10 + i}月${15 + i}日`,
              meetingNumber: `企发[2023]${42 + i}号`,
              meetingTopic: `关于${eventCategory}${i + 1}号方案的议题`,
              meetingConclusion: `一致通过该${eventCategory}方案`,
              contentSummary: `讨论了${eventCategory}方案的实施细节和影响`,
              eventCategory,
              eventDetails: `${eventCategory}详情：涉及范围广泛，影响重大`,
              amountInvolved: eventCategory === '大额资金' ? `${(i + 1) * 1000}万元` : undefined,
              relatedDepartments: '财务部、工程部、法务部',
              relatedPersonnel: '张三、李四、王五',
              decisionBasis: '公司发展战略规划及市场调研报告',
              originalText: `会议讨论了${eventCategory}方案，与会人员一致通过...`
            });
          }
          
          // 构建完整结果
          const result: MeetingAnalysisResult = {
            ...pendingResult,
            status: 'completed',
            parseDate: new Date().toISOString(),
            items
          };
          
          // 为了兼容旧代码，设置第一个事项的信息到顶层字段
          if (items.length > 0) {
            const firstItem = items[0];
            Object.assign(result, {
              meetingTime: firstItem.meetingTime,
              meetingNumber: firstItem.meetingNumber,
              meetingTopic: firstItem.meetingTopic,
              meetingConclusion: firstItem.meetingConclusion,
              contentSummary: firstItem.contentSummary,
              eventCategory: firstItem.eventCategory,
              eventDetails: firstItem.eventDetails,
              amountInvolved: firstItem.amountInvolved,
              relatedDepartments: firstItem.relatedDepartments,
              relatedPersonnel: firstItem.relatedPersonnel,
              decisionBasis: firstItem.decisionBasis,
              originalText: firstItem.originalText
            });
          }
          
          resolve(result);
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