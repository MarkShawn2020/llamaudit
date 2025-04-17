import {
  getProjectAnalysisResults as getProjectAnalysisResultsAction
} from "@/lib/actions/analysis-actions";
import { toast } from "sonner";

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
 * 获取项目的分析结果
 */
export async function getProjectAnalysis(projectId: string) {
  try {
    const results = await getProjectAnalysisResults(projectId);
    return results;
  } catch (error) {
    console.error('获取项目分析结果失败:', error);
    toast.error('获取项目分析结果失败');
    return [];
  }
}
