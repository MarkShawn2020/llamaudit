import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { MeetingAnalysisResult, analyzeMeetingDocuments } from '@/lib/api/document-api';
import { getProjectAnalysisResults } from '@/lib/api/analysis-api';
import { FileAnalysisGroup } from '../types';
import { ProjectFile } from '@/lib/api/project-file-api';

export function useAnalysisResults(
  projectId: string,
  files: ProjectFile[],
  onUpdateFilesStatus: (fileIds: string[]) => Promise<void>
) {
  const [rawAnalysisResults, setRawAnalysisResults] = useState<MeetingAnalysisResult[]>([]);
  const [groupedResults, setGroupedResults] = useState<FileAnalysisGroup[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingResults, setLoadingResults] = useState(true);

  // 维护引用以避免不必要的重新计算
  const prevResultsRef = useRef<MeetingAnalysisResult[]>([]);

  // 获取已保存的分析结果
  const fetchAnalysisResults = useCallback(async () => {
    try {
      setLoadingResults(true);
      console.log('正在获取项目分析结果:', projectId);

      const results = await getProjectAnalysisResults(projectId);
      console.log('获取到分析结果:', results);

      // 处理结果，将数据库中的结果转换为MeetingAnalysisResult格式
      const processedResults: MeetingAnalysisResult[] = [];

      // 遍历每个文件
      results.forEach(file => {
        if (!file || !file.analysisResults || file.analysisResults.length === 0) {
          return;
        }

        console.log(`处理文件 ${file.id}: ${file.originalName}, 分析结果数量: ${file.analysisResults.length}`);

        // 将文件的所有分析结果按itemIndex分组
        const itemGroups = new Map<number, any[]>();

        file.analysisResults.forEach(result => {
          const index = result.itemIndex || 0;
          if (!itemGroups.has(index)) {
            itemGroups.set(index, []);
          }
          itemGroups.get(index)!.push(result);
        });

        console.log(`文件 ${file.id} 分析事项组数: ${itemGroups.size}`);

        // 为每个文件创建一个分析结果对象
        const fileResult: MeetingAnalysisResult = {
          id: file.id || `file-${Date.now()}`,
          fileName: file.originalName || '未命名文件',
          status: 'completed',
          fileUrl: file.filePath,
          fileSize: Number(file.fileSize),
          fileType: file.fileType,
          items: []
        };

        // 将每组分析结果添加到items中
        itemGroups.forEach((items, index) => {
          // 使用每组的第一条记录作为代表
          const representative = items[0];

          fileResult.items?.push({
            itemId: String(index),
            meetingTime: representative.meetingTime ? new Date(representative.meetingTime).toISOString() : undefined,
            meetingNumber: representative.meetingNumber || undefined,
            meetingTopic: representative.meetingTopic || undefined,
            meetingConclusion: representative.meetingConclusion || undefined,
            contentSummary: representative.contentSummary || undefined,
            eventCategory: representative.eventCategory || undefined,
            eventDetails: representative.eventDetails || undefined,
            amountInvolved: representative.amountInvolved ? String(representative.amountInvolved) : undefined,
            relatedDepartments: representative.relatedDepartments || undefined,
            relatedPersonnel: representative.relatedPersonnel || undefined,
            decisionBasis: representative.decisionBasis || undefined,
            originalText: representative.originalText || undefined
          });
        });

        console.log(`文件 ${file.id} 处理后的结果项数量: ${fileResult.items?.length || 0}`);

        // 把整个文件的分析结果添加到结果数组
        processedResults.push(fileResult);
      });

      console.log('所有文件处理后的分析结果数量:', processedResults.length);

      // 更新状态

      setRawAnalysisResults(processedResults);
      console.log('已更新分析结果状态');
    } catch (error) {
      console.error('获取分析结果失败:', error);
    } finally {
      setLoadingResults(false);
    }
  }, [projectId, files]);

  // 初始化加载
  useEffect(() => {
    fetchAnalysisResults();
  }, [fetchAnalysisResults]);

  // 处理分析结果，将结果分组
  useEffect(() => {
    console.log(`处理分析结果: ${rawAnalysisResults.length}个结果`);

    // 检查是否需要重新处理结果 - 使用JSON.stringify比较对象内容而不是引用
    const currentResultsJson = JSON.stringify(rawAnalysisResults);

    // 更新结果引用
    prevResultsRef.current = JSON.parse(currentResultsJson);

    console.log('开始处理分析结果...');

    // 按文件ID分组结果
    const groupMap = new Map<string, FileAnalysisGroup>();

    // 处理每个分析结果
    rawAnalysisResults.forEach(result => {
      const fileId = result.id;

      if (!groupMap.has(fileId)) {
        // 查找文件信息
        const fileInfo = files.find(f => f.id === fileId);
        groupMap.set(fileId, {
          fileId,
          fileName: result.fileName || fileInfo?.filename || '',
          fileUrl: result.fileUrl || fileInfo?.url,
          fileSize: result.fileSize || fileInfo?.size,
          fileType: result.fileType || fileInfo?.type,
          uploadDate: fileInfo?.createdAt,
          status: result.status,
          error: result.error,
          results: []
        });
      }

      // 获取当前组
      const group = groupMap.get(fileId)!;

      // 更新组的状态
      group.status = result.status;
      if (result.error) {
        group.error = result.error;
      }

      // 处理完成状态的结果
      if (result.status === 'completed') {
        if (result.items && result.items.length > 0) {
          // 处理多项分析结果
          result.items.forEach(item => {
            if (!item.meetingTopic && !item.eventCategory) return;

            group.results.push({
              id: `${fileId}-${item.itemId || Math.random().toString(36).substring(2, 9)}`,
              fileName: result.fileName,
              status: 'completed',
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
        } else if (result.meetingTopic || result.eventCategory) {
          // 处理单项分析结果
          group.results.push({
            ...result,
            id: `${fileId}-legacy`
          });
        }
      }
    });

    // 更新分组结果状态
    const groupedResultsData = Array.from(groupMap.values());
    console.log(`生成了${groupedResultsData.length}个文件分析组`);
    setGroupedResults(groupedResultsData);

    // 收集需要更新isAnalyzed状态的文件
    const analyzedFileIds = Array.from(groupMap.keys()).filter(fileId => {
      const group = groupMap.get(fileId);
      return group && group.status === 'completed';
    });

    // 查找需要更新状态的文件（已分析但状态未更新的文件）
    const filesToUpdate = files.filter(
      file => analyzedFileIds.includes(file.id) && !file.isAnalyzed
    );

    // 只有在有文件需要更新状态时才更新files状态
    if (filesToUpdate.length > 0) {
      console.log(`更新${filesToUpdate.length}个文件的分析状态`);

      // 将文件ID数组传给回调函数更新状态
      const fileIdsToUpdate = filesToUpdate.map(file => file.id);
      onUpdateFilesStatus(fileIdsToUpdate);
    }
  }, [rawAnalysisResults, files, onUpdateFilesStatus]);

  // 开始分析文件
  const handleAnalyze = useCallback(async (selectedFiles: string[]) => {
    if (selectedFiles.length === 0) {
      toast.warning('请选择需要分析的文件');
      return;
    }

    setIsAnalyzing(true);

    try {
      // 将选中的文件添加到分析结果列表，初始状态为pending
      const pendingResults = selectedFiles.map(fileId => {
        const file = files.find(f => f.id === fileId);
        return {
          id: fileId,
          fileName: file?.filename || '',
          status: 'pending' as const,
          fileUrl: file?.url,
          fileSize: file?.size,
          fileType: file?.type
        };
      });

      setRawAnalysisResults(prev => [...prev, ...pendingResults]);

      // 更新为processing状态
      setRawAnalysisResults(prev =>
        prev.map(result =>
          selectedFiles.includes(result.id)
            ? { ...result, status: 'processing' as const }
            : result
        )
      );

      // 调用API批量解析文件，传入projectId以便直接保存到数据库
      const analysisPromises = analyzeMeetingDocuments(selectedFiles, projectId);

      // 使用Promise.allSettled处理所有解析请求
      const results = await Promise.allSettled(analysisPromises);

      // 更新解析结果
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const fileId = selectedFiles[i];

        if (result.status === 'fulfilled') {
          // 成功解析的结果
          setRawAnalysisResults(prev =>
            prev.map(item =>
              item.id === fileId ? result.value : item
            )
          );

          // 更新文件状态（通过回调）
          await onUpdateFilesStatus([fileId]);
        } else {
          // 解析失败
          setRawAnalysisResults(prev =>
            prev.map(item =>
              item.id === fileId
                ? {
                  ...item,
                  status: 'error' as const,
                  error: result.reason instanceof Error
                    ? result.reason.message
                    : '解析失败'
                }
                : item
            )
          );
        }
      }

      toast.success(`已完成${results.length}个文件的解析`);
    } catch (error) {
      console.error('批量解析文件时出错:', error);
      toast.error('批量解析文件失败');
    } finally {
      setIsAnalyzing(false);
    }
  }, [files, projectId, onUpdateFilesStatus]);

  return {
    groupedResults,
    rawAnalysisResults,
    isAnalyzing,
    loadingResults,
    handleAnalyze,
    fetchAnalysisResults
  };
} 