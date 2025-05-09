'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileStatus } from '../types';
import { streamAnalyzeDifyFiles, cancelDifyAnalysis, DifySSEMessage } from '@/lib/actions/dify-streaming-actions';
import { logger } from '@/lib/logger';

/**
 * 流式分析Hook，支持实时打字机效果的分析结果展示
 * @param updateFilesStatus 更新文件状态的回调函数
 */
export function useStreamingAnalysis(
  updateFilesStatus: (fileIds: string[], status: FileStatus) => void
) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamingResult, setStreamingResult] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taskIdRef = useRef<string>('');

  // 取消分析
  const cancelAnalysis = useCallback(async () => {
    if (taskIdRef.current) {
      logger.info('用户取消分析', { taskId: taskIdRef.current });
      const success = await cancelDifyAnalysis(taskIdRef.current);
      if (success) {
        setStreamingResult(prev => prev + '\n\n[分析已取消]');
      }
      // 无论取消是否成功，都重置状态
      setIsAnalyzing(false);
    }
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      // 组件卸载时，如果还在分析，取消任务
      if (isAnalyzing && taskIdRef.current) {
        cancelDifyAnalysis(taskIdRef.current).catch(e => 
          logger.error('组件卸载时取消分析失败', { error: e })
        );
      }
    };
  }, [isAnalyzing]);

  // 处理SSE消息的回调
  const handleStreamProgress = useCallback((message: DifySSEMessage) => {
    if (message.event === 'error') {
      setError(message.message || '分析过程中发生错误');
      setIsAnalyzing(false);
      return;
    }

    if (message.event === 'done') {
      setIsComplete(true);
      setIsAnalyzing(false);
      return;
    }

    // 处理正常消息
    if (message.answer) {
      setStreamingResult(prev => prev + message.answer);
    }
  }, []);

  // 开始流式分析
  const startStreamingAnalysis = useCallback(async (fileIds: string[]) => {
    if (fileIds.length === 0) return;
    
    try {
      // 重置状态
      setIsAnalyzing(true);
      setStreamingResult('');
      setIsComplete(false);
      setError(null);
      taskIdRef.current = '';
      
      // 更新文件状态为分析中
      updateFilesStatus(fileIds, 'analyzing');
      
      logger.info('开始流式分析文件', { fileCount: fileIds.length });
      
      // 调用服务端动作进行流式分析
      const taskId = await streamAnalyzeDifyFiles(fileIds, handleStreamProgress);
      taskIdRef.current = taskId;
      
      if (!taskId) {
        throw new Error('无法启动分析任务，未收到任务ID');
      }
      
      logger.info('流式分析任务已启动', { taskId });
    } catch (error) {
      logger.error('启动流式分析时出错', { error });
      setError(error instanceof Error ? error.message : '启动分析失败');
      setIsAnalyzing(false);
      updateFilesStatus(fileIds, 'error');
    }
  }, [updateFilesStatus, handleStreamProgress]);

  // 从流式结果提取结构化数据（待实现）
  const extractStructuredResults = useCallback(() => {
    if (!isComplete || !streamingResult) return null;
    
    try {
      // 尝试从结果中提取JSON格式的结构化数据
      const jsonMatch = streamingResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      return null;
    } catch (error) {
      logger.error('从流式结果提取结构化数据时出错', { error });
      return null;
    }
  }, [isComplete, streamingResult]);

  return {
    isAnalyzing,
    streamingResult,
    isComplete,
    error,
    startStreamingAnalysis,
    cancelAnalysis,
    extractStructuredResults
  };
}
