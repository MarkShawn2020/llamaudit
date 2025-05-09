'use client';

import { useState, useCallback } from 'react';
import { AnalysisStatus, FileStatus } from '../types';
import { analyzeDifyFiles, loadAnalysisResults } from '@/lib/actions/dify-chat-actions';
import { logger } from '@/lib/logger';
import { IMeeting } from '@/types/analysis';

// 空会议结果数组
const emptyMeetings: IMeeting[] = [];

/**
 * 分析结果管理 Hook
 * @param fileIds 文件ID列表
 * @param updateFilesStatus 更新文件分析状态的回调
 */
export function useAnalysisResults(
  fileIds: string[], 
  updateFilesStatus: (fileIds: string[], status: FileStatus) => void
) {
  const [meetings, setMeetings] = useState<IMeeting[]>(emptyMeetings);
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
      
      // 调用Dify API进行文件分析 - 这里需要修改API以返回新的数据结构
      // 旧API返回的是GroupedResults，现在我们需要转换成新的数据格式
      const oldResults = await analyzeDifyFiles(selectedFileIds);
      
      // 从旧数据结构中构建一个虚拟会议
      // 实际实现时应当修改API返回结构
      const fakeMeetings: IMeeting[] = [];
      if (oldResults) {
        // 每个三重一大类型创建一个虚拟会议
        if (oldResults.majorDecisions.length > 0) {
          fakeMeetings.push({
            meetingDate: new Date().toISOString(),
            documentNo: 'MD-2025',
            meetingTopic: '重大决策会议',
            conclusion: '通过重大决策事项',
            summary: '讨论并批准重大决策事项',
            documentName: '重大决策会议纪要',
            isTripleOneMeeting: true,
            keyDecisionItems: oldResults.majorDecisions.map(item => ({
              categoryType: 'majorDecision',
              details: item.eventDetails || '',
              amount: item.amountInvolved ? `￥${item.amountInvolved}` : '',
              departments: item.relatedDepartments ? item.relatedDepartments.split(',') : [],
              personnel: item.relatedPersonnel ? item.relatedPersonnel.split(',') : [],
              decisionBasis: item.decisionBasis || '',
              originalText: item.originalText || ''
            }))
          });
        }

        // 类似地添加其他类型的会议
        // ...
      }
      
      // 设置会议数据
      setMeetings(fakeMeetings);
      
      // 更新文件状态为已分析
      updateFilesStatus(selectedFileIds, 'analyzed');
      logger.info('分析完成，找到会议数量', {
        meetingsCount: fakeMeetings.length,
        keyDecisionsCount: fakeMeetings.reduce((total: number, meeting: IMeeting) => 
          total + (meeting.keyDecisionItems?.length || 0), 0)
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
      
      // 从旧数据结构中构建一个虚拟会议列表
      const fakeMeetings: IMeeting[] = [];
      if (existingResults) {
        // 每个三重一大类型创建一个虚拟会议
        if (existingResults.majorDecisions.length > 0) {
          fakeMeetings.push({
            meetingDate: new Date().toISOString(),
            documentNo: 'MD-2025',
            meetingTopic: '重大决策会议',
            conclusion: '通过重大决策事项',
            summary: '讨论并批准重大决策事项',
            documentName: '重大决策会议纪要',
            isTripleOneMeeting: true,
            keyDecisionItems: existingResults.majorDecisions.map(item => ({
              categoryType: 'majorDecision',
              details: item.eventDetails || '',
              amount: item.amountInvolved ? `￥${item.amountInvolved}` : '',
              departments: item.relatedDepartments ? item.relatedDepartments.split(',') : [],
              personnel: item.relatedPersonnel ? item.relatedPersonnel.split(',') : [],
              decisionBasis: item.decisionBasis || '',
              originalText: item.originalText || ''
            }))
          });
        }

        // 类似地添加其他类型的会议
        // ...
      }
      
      // 设置会议数据
      setMeetings(fakeMeetings);
      logger.info('已加载分析结果', {
        meetingsCount: fakeMeetings.length,
        keyDecisionsCount: fakeMeetings.reduce((total: number, meeting: IMeeting) => 
          total + (meeting.keyDecisionItems?.length || 0), 0)
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
    meetings,
    isAnalyzing,
    loadingResults,
    handleAnalyze
  };
}
