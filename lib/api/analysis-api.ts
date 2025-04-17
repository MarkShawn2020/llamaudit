import { toast } from "sonner";
import { 
  createAnalysisTask, 
  saveAnalysisResults, 
  getProjectAnalysisResults as getProjectAnalysisResultsAction,
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
 * 获取项目的所有分析结果
 * @param projectId 项目ID
 */
export async function getProjectAnalysisResults(projectId: string) {
  try {
    return await getProjectAnalysisResultsAction(projectId);
  } catch (error) {
    console.error('获取项目分析结果失败:', error);
    toast.error('获取项目分析结果失败');
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

    // 将所有文件的所有三重一大事项平铺成一个数组
    const allItems: AnalysisResultInput[] = [];
    
    completedResults.forEach(result => {
      // 如果文件包含多个三重一大事项（新格式）
        result.items?.forEach(item => {
          allItems.push({
            fileId: result.id,
            meetingTime: item.meetingTime,
            meetingNumber: item.meetingNumber,
            meetingTopic: item.meetingTopic,
            meetingConclusion: item.meetingConclusion,
            contentSummary: item.contentSummary,
            eventCategory: item.eventCategory,
            eventDetails: item.eventDetails,
            amountInvolved: item.amountInvolved,
            relatedDepartments: item.relatedDepartments,
            relatedPersonnel: item.relatedPersonnel,
            decisionBasis: item.decisionBasis,
            originalText: item.originalText
          });
        });
    });

    // 检查是否有有效的事项需要保存
    if (allItems.length === 0) {
      return { 
        success: false, 
        message: '没有有效的三重一大事项可保存' 
      };
    }

    // 保存分析结果
    const response = await saveAnalysisResults(projectId, taskId, allItems);
    
    if (response.success) {
      toast.success(`成功保存${allItems.length}条三重一大事项`);
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