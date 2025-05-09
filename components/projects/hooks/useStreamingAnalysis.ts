'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileStatus } from '../types';
import { streamAnalyzeDifyFiles, cancelDifyAnalysis, DifySSEMessage } from '@/lib/actions/dify-streaming-actions';
import { logger } from '@/lib/logger';
import { IKeyDecisionItem } from '@/types/analysis';

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
  // EventSource连接引用
  const eventSourceRef = useRef<EventSource | null>(null);

  // 关闭流式连接
  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      logger.info('关闭流式连接');
    }
  }, []);

  // 取消分析
  const cancelAnalysis = useCallback(async () => {
    if (taskIdRef.current) {
      logger.info('用户取消分析', { taskId: taskIdRef.current });
      
      try {
        // 调用API路由取消分析
        const response = await fetch('/api/dify/stream-analysis/', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: taskIdRef.current }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setStreamingResult(prev => prev + '\n\n[分析已取消]');
        } else {
          logger.error('取消分析失败', { error: result.error });
        }
      } catch (error) {
        logger.error('取消分析请求出错', { error });
      }
      
      // 关闭连接
      closeEventSource();
      // 无论是否成功，都重置状态
      setIsAnalyzing(false);
    }
  }, [closeEventSource]);

  // 清理函数
  useEffect(() => {
    return () => {
      // 组件卸载时，如果还在分析，取消任务
      if (isAnalyzing && taskIdRef.current) {
        // 关闭EventSource连接
        closeEventSource();
        
        // 尝试取消分析任务
        fetch('/api/dify/stream-analysis/', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: taskIdRef.current }),
        }).catch(e => 
          logger.error('组件卸载时取消分析失败', { error: e })
        );
      }
    };
  }, [isAnalyzing, closeEventSource]);

  // 处理从服务端收到的SSE消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      // 解析SSE消息
      const message = JSON.parse(event.data) as DifySSEMessage;
      
      // 保存任务ID (如果有)
      if (message.task_id && !taskIdRef.current) {
        taskIdRef.current = message.task_id;
        logger.info('收到任务ID', { taskId: message.task_id });
      }
      
      // 处理不同类型的消息
      if (message.event === 'error') {
        setError(message.message || '分析过程中发生错误');
        setIsAnalyzing(false);
        closeEventSource();
        return;
      }
      
      if (message.event === 'done') {
        setIsComplete(true);
        setIsAnalyzing(false);
        closeEventSource();
        return;
      }
      
      // 处理正常消息
      if (message.answer) {
        setStreamingResult(prev => prev + message.answer);
      }
    } catch (error) {
      logger.error('解析SSE消息出错', { error });
    }
  }, [closeEventSource]);

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
      
      // 关闭之前的连接（如果有）
      closeEventSource();
      
      // 更新文件状态为分析中
      updateFilesStatus(fileIds, 'analyzing');
      
      logger.info('开始流式分析文件', { fileCount: fileIds.length });
      
      // 先调用服务端动作验证参数
      const success = await streamAnalyzeDifyFiles(fileIds);
      if (!success) {
        throw new Error('服务端拒绝启动分析任务');
      }
      
      // 建立SSE连接
      const es = new EventSource(`/api/dify/stream-analysis/?${new URLSearchParams({ 
        fileIds: JSON.stringify(fileIds) 
      }).toString()}`);
      
      // 保存EventSource引用
      eventSourceRef.current = es;
      
      // 注册事件处理器
      es.onmessage = handleMessage;
      
      es.onerror = (error) => {
        logger.error('SSE连接错误', { error });
        setError('与服务器的连接中断');
        setIsAnalyzing(false);
        closeEventSource();
        updateFilesStatus(fileIds, 'error');
      };
      
      logger.info('SSE连接已建立');
    } catch (error) {
      logger.error('启动流式分析时出错', { error });
      setError(error instanceof Error ? error.message : '启动分析失败');
      setIsAnalyzing(false);
      updateFilesStatus(fileIds, 'error');
    }
  }, [updateFilesStatus, handleMessage, closeEventSource]);

  // 从流式结果提取结构化数据
  const extractStructuredResults = useCallback(() => {
    if (!isComplete || !streamingResult) return null;
    
    try {
      // 直接查找JSON格式
      const jsonMatch = streamingResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          logger.info('成功从标准JSON格式提取数据');
          const meetings = jsonData["会议基本信息"];
          const keyDecisionItems = (jsonData["三重一大具体事项"] ?? []) as IKeyDecisionItem[];
          return {
            majorDecisions: keyDecisionItems.filter(item => item.categoryType === "majorDecision") || [],
            personnelAppointments: keyDecisionItems.filter(item => item.categoryType === "personnelAppointment") || [],
            majorProjects: keyDecisionItems.filter(item => item.categoryType === "majorProject") || [],
            largeAmounts: keyDecisionItems.filter(item => item.categoryType === "largeAmount") || []
          };
        } catch (e) {
          logger.error('解析JSON格式数据时出错', { error: e });
        }
      }
      
      logger.warn('未能成功提取结构化数据', { streamingResult });
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
