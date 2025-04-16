import { toast } from "sonner";
import { 
  createAnalysisTask, 
  saveAnalysisResults, 
  type AnalysisResultInput,
  type AnalysisResponse
} from "@/lib/actions/analysis-actions";
import { MeetingAnalysisResult } from "@/lib/api/document-api";

/**
 * 创建分析任务
 * @param projectId 项目ID
 * @param name 任务名称
 */
export async function createAnalysisTaskForProject(
  projectId: string, 
  name: string
): Promise<string> {
  try {
    const { taskId } = await createAnalysisTask(projectId, name);
    return taskId;
  } catch (error) {
    console.error('创建分析任务失败:', error);
    toast.error('创建分析任务失败');
    throw error;
  }
}

/**
 * 保存分析结果到数据库
 * @param projectId 项目ID
 * @param results 分析结果数组
 */
export async function saveDocumentAnalysisResults(
  projectId: string,
  results: MeetingAnalysisResult[]
): Promise<AnalysisResponse> {
  try {
    // 只处理状态为completed的结果
    const completedResults = results.filter(result => result.status === 'completed');
    
    if (completedResults.length === 0) {
      return { 
        success: false, 
        message: '没有可保存的分析结果' 
      };
    }

    // 创建分析任务
    const taskName = `文档分析任务 ${new Date().toLocaleString('zh-CN')}`;
    const { taskId } = await createAnalysisTask(projectId, taskName);

    // 转换格式
    const formattedResults: AnalysisResultInput[] = completedResults.map(result => ({
      fileId: result.id,
      meetingTime: result.meetingTime,
      meetingNumber: result.meetingNumber,
      meetingTopic: result.meetingTopic,
      meetingConclusion: result.meetingConclusion,
      contentSummary: result.contentSummary,
      eventCategory: result.eventCategory,
      eventDetails: result.eventDetails,
      amountInvolved: result.amountInvolved,
      relatedDepartments: result.relatedDepartments,
      relatedPersonnel: result.relatedPersonnel,
      decisionBasis: result.decisionBasis,
      originalText: result.originalText
    }));

    // 保存分析结果
    const response = await saveAnalysisResults(projectId, taskId, formattedResults);
    
    if (response.success) {
      toast.success(response.message || '保存分析结果成功');
    } else {
      toast.error(response.message || '保存分析结果失败');
    }
    
    return response;
  } catch (error) {
    console.error('保存分析结果失败:', error);
    toast.error('保存分析结果失败');
    return {
      success: false,
      message: error instanceof Error ? error.message : '保存分析结果失败'
    };
  }
} 