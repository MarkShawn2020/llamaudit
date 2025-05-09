'use client';

import { useState, useCallback } from 'react';
import { AnalysisStatus, FileStatus, GroupedResults } from '../types';
import { analyzeDifyFiles, loadAnalysisResults } from '@/lib/actions/dify-chat-actions';
import { logger } from '@/lib/logger';

// 空结果分组
const emptyGroupedResults: GroupedResults = {
  majorDecisions: [],
  personnelAppointments: [],
  majorProjects: [],
  largeAmounts: []
};

/**
 * 分析结果管理 Hook
 * @param fileIds 文件ID列表
 * @param updateFilesStatus 更新文件分析状态的回调
 */
export function useAnalysisResults(
  fileIds: string[], 
  updateFilesStatus: (fileIds: string[], status: FileStatus) => void
) {
  const [groupedResults, setGroupedResults] = useState<GroupedResults>(emptyGroupedResults);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // 处理分析请求
  const handleAnalyze = useCallback(async (selectedFileIds: string[]) => {
    if (selectedFileIds.length === 0) return;
    
    try {
      setIsAnalyzing(true);
      // 更新所选文件状态为分析中
      updateFilesStatus(selectedFileIds, 'analyzing');
      
      logger.info(`开始分析文件`, { fileCount: selectedFileIds.length });
      
      // 调用Dify API进行文件分析
      const newGroupedResults = await analyzeDifyFiles(selectedFileIds);
      
      setGroupedResults(newGroupedResults);
      
      // 更新文件状态为已分析
      updateFilesStatus(selectedFileIds, 'analyzed');
      logger.info('分析完成，结果已分组', {
        majorDecisions: newGroupedResults.majorDecisions.length,
        personnelAppointments: newGroupedResults.personnelAppointments.length,
        majorProjects: newGroupedResults.majorProjects.length,
        largeAmounts: newGroupedResults.largeAmounts.length
      });
    } catch (error) {
      logger.error('分析过程中发生错误:', { error });
      // 更新文件状态为错误
      updateFilesStatus(selectedFileIds, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [updateFilesStatus]);

  // 加载分析结果
  const loadResults = useCallback(async () => {
    if (fileIds.length === 0) return;
    
    try {
      setLoadingResults(true);
      logger.info('加载已存在的分析结果', { fileCount: fileIds.length });
      
      // 从数据库加载已存在的分析结果
      const existingResults = await loadAnalysisResults(fileIds);
      
      setGroupedResults(existingResults);
      logger.info('已加载分析结果', {
        majorDecisions: existingResults.majorDecisions.length,
        personnelAppointments: existingResults.personnelAppointments.length,
        majorProjects: existingResults.majorProjects.length,
        largeAmounts: existingResults.largeAmounts.length
      });
    } catch (error) {
      logger.error('加载分析结果时发生错误:', { error });
    } finally {
      setLoadingResults(false);
    }
  }, [fileIds]);

  // 初始加载结果
  // useEffect(() => {
  //   loadResults();
  // }, [loadResults]);

  return {
    groupedResults,
    isAnalyzing,
    loadingResults,
    handleAnalyze
  };
}
