'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileStatus } from '../types';
import { streamAnalyzeDifyFiles, cancelDifyAnalysis, DifySSEMessage } from '@/lib/actions/dify-streaming-actions';
import { logger } from '@/lib/logger';
import { IKeyDecisionItem, IMeeting } from '@/types/analysis';

/**
 * 流式分析Hook，支持实时打字机效果的分析结果展示
 * @param updateFilesStatus 更新文件状态的回调函数
 */
// 定义可能的JSON解析结果类型
type ParsedJsonData = {
  meetingData?: IMeeting[];
  structuredData?: {
    majorDecisions?: IKeyDecisionItem[];
    personnelAppointments?: IKeyDecisionItem[];
    majorProjects?: IKeyDecisionItem[];
    largeAmounts?: IKeyDecisionItem[];
  };
  rawData?: any; // 原始JSON对象，用于不符合上述类型的其他JSON结构
};

export function useStreamingAnalysis(
  updateFilesStatus: (fileIds: string[], status: FileStatus) => void
) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamingResult, setStreamingResult] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 用于存储流式解析的JSON数据
  const [streamingJsonData, setStreamingJsonData] = useState<ParsedJsonData | null>(null);
  const taskIdRef = useRef<string>('');
  // EventSource连接引用
  const eventSourceRef = useRef<EventSource | null>(null);
  // 用于存储正在构建中的JSON字符串
  const jsonBufferRef = useRef<{
    inJsonBlock: boolean;
    buffer: string;
  }>({ inJsonBlock: false, buffer: '' });

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

  // 尝试从文本中提取完整的JSON对象
  const tryParseJson = useCallback((text: string) => {
    try {
      // 检查是否有JSON代码块
      const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        const jsonText = jsonBlockMatch[1].trim();
        // 解析JSON数据
        const jsonData = JSON.parse(jsonText);
        let parsedData: ParsedJsonData = {};

        // 检查是否包含会议数据
        if (jsonData["会议数据"] && Array.isArray(jsonData["会议数据"])) {
          parsedData.meetingData = jsonData["会议数据"] as IMeeting[];
        }
        // 检查是否包含basicInfo和tripleOneMajorItems
        else if (jsonData["basicInfo"]) {
          const meetingInfo = jsonData["basicInfo"];
          const keyDecisionItems = (jsonData["tripleOneMajorItems"] || []) as IKeyDecisionItem[];

          // 处理会议数据
          if (Array.isArray(meetingInfo)) {
            parsedData.meetingData = meetingInfo.map((meeting: any) => ({
              ...meeting,
              keyDecisionItems: keyDecisionItems.filter(item => 
                item.originalText.includes(meeting.documentName)
              )
            }));
          } else {
            parsedData.meetingData = [{
              ...meetingInfo,
              keyDecisionItems
            }];
          }

          // 分类三重一大事项
          parsedData.structuredData = {
            majorDecisions: keyDecisionItems.filter(item => item.categoryType === "majorDecision") || [],
            personnelAppointments: keyDecisionItems.filter(item => item.categoryType === "personnelAppointment") || [],
            majorProjects: keyDecisionItems.filter(item => item.categoryType === "majorProject") || [],
            largeAmounts: keyDecisionItems.filter(item => item.categoryType === "largeAmount") || []
          };
        } else {
          // 对于其他格式的JSON，直接保存原始数据
          parsedData.rawData = jsonData;
        }

        logger.info('成功解析流式JSON数据', { parsedData });
        return parsedData;
      }
      return null;
    } catch (error) {
      logger.error('解析流式JSON数据时出错', { error, text });
      return null;
    }
  }, []);

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
        const newChunk = message.answer;
        const newStreamingResult = streamingResult + newChunk;
        setStreamingResult(newStreamingResult);

        // 处理JSON块
        const jsonBuffer = jsonBufferRef.current;
        
        // 检查新块是否包含JSON代码块的开始或结束标记
        if (newChunk.includes('```json') && !jsonBuffer.inJsonBlock) {
          jsonBuffer.inJsonBlock = true;
          const startIndex = newChunk.indexOf('```json') + '```json'.length;
          jsonBuffer.buffer = newChunk.substring(startIndex);
        } else if (newChunk.includes('```') && jsonBuffer.inJsonBlock) {
          jsonBuffer.inJsonBlock = false;
          const endIndex = newChunk.indexOf('```');
          jsonBuffer.buffer += newChunk.substring(0, endIndex);
          
          // 尝试解析完整的JSON数据
          try {
            const parsedData = tryParseJson('```json\n' + jsonBuffer.buffer + '\n```');
            if (parsedData) {
              setStreamingJsonData(parsedData);
            }
          } catch (e) {
            // 解析失败，这可能是因为JSON不完整或格式错误
            logger.error('解析JSON缓冲区失败', { error: e });
          }
          
          // 重置缓冲区
          jsonBuffer.buffer = '';
        } else if (jsonBuffer.inJsonBlock) {
          // 我们在JSON块中，继续累积数据
          jsonBuffer.buffer += newChunk;
        }

        // 尝试在整个流中查找完整的JSON
        if (!jsonBuffer.inJsonBlock) {
          const parsedData = tryParseJson(newStreamingResult);
          if (parsedData) {
            setStreamingJsonData(parsedData);
          }
        }
      }
    } catch (error) {
      logger.error('解析SSE消息出错', { error });
    }
  }, [closeEventSource, streamingResult, tryParseJson]);

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

  // 从流式结果提取结构化数据 (旧格式)
  const extractStructuredResults = useCallback(() => {
    if (!isComplete || !streamingResult) return null;
    
    try {
      // 直接查找JSON格式
      const jsonMatch = streamingResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          logger.info('成功从标准JSON格式提取数据');
          const meetings = jsonData["basicInfo"];
          const keyDecisionItems = (jsonData["tripleOneMajorItems"] ?? []) as IKeyDecisionItem[];
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
  
  // 从流式结果提取会议数据 (新格式 - IMeeting[]格式)
  const extractMeetingsFromStreamingResult = useCallback((): IMeeting[] | null => {
    
    try {
      // 直接查找JSON格式
      const jsonMatch = streamingResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          logger.info('成功从流式结果中提取会议数据');
          
          // 如果有分开的basicInfo和三重一大事项列表，需要组装
          if (jsonData["basicInfo"] && jsonData["tripleOneMajorItems"]) {
            const meetingInfo = jsonData["basicInfo"];
            const keyDecisionItems = (jsonData["tripleOneMajorItems"] || []) as IKeyDecisionItem[];
            
            if (Array.isArray(meetingInfo)) {
              // 返回了多个会议
              return meetingInfo.map((meeting: any) => ({
                ...meeting,
                keyDecisionItems: keyDecisionItems.filter(item => 
                  // 使用documentName来关联会议和决策项
                  item.originalText.includes(meeting.documentName)
                )
              }));
            } else {
              // 返回了单个会议
              return [{
                ...meetingInfo,
                keyDecisionItems
              }];
            }
          }
          
          // 如果无法解析出会议数据，返回空数组
          logger.warn('无法从流式结果提取会议数据', { jsonData });
          return [];
        } catch (e) {
          logger.error('解析JSON格式数据时出错', { error: e });
        }
      }
      
      logger.warn('未能成功从流式结果提取会议数据', { streamingResult });
      return null;
    } catch (error) {
      logger.error('从流式结果提取会议数据时出错', { error });
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
    extractStructuredResults,
    extractMeetingsFromStreamingResult,
    streamingJsonData // 提供实时解析的JSON数据
  };
}
