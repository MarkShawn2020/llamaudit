'use client';

import {FileStatus} from "@/components/projects/utils/file-status";
import { useState, useCallback, useRef, useEffect } from 'react';
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

// 单个文件分析任务的状态
export interface FileAnalysisTask {
  fileId: string;
  taskId: string;
  streamingResult: string;
  isComplete: boolean;
  error: string | null;
  jsonData: ParsedJsonData | null;
  eventSource?: EventSource | null
  jsonBuffer: {
    inJsonBlock: boolean;
    buffer: string;
  };
}

export function useStreamingAnalysis(
  updateFilesStatus: (fileIds: string[], status: FileStatus) => void
) {
  // 在 hook 的内部添加这个引用
  const eventSourcesRef = useRef(new Map<string, EventSource>());
  // 全局分析状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // 每个文件的分析任务状态，使用Map存储以便按文件ID快速查找
  const [fileTasks, setFileTasks] = useState<Map<string, FileAnalysisTask>>(new Map());
  // 记录展开的文件ID
  const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(new Set());
  
  // 传统的全局状态（兼容旧代码）
  const [streamingResult, setStreamingResult] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingJsonData, setStreamingJsonData] = useState<ParsedJsonData | null>(null);

  // 关闭指定文件的流式连接
  const closeEventSource = useCallback((fileId?: string) => {
    if (fileId) {
      // 关闭指定文件的连接
      const eventSource = eventSourcesRef.current.get(fileId);
      if (eventSource) {
        eventSource.close();
        eventSourcesRef.current.delete(fileId);
        logger.info('关闭文件流式连接', { fileId });
      }
      
      // 更新任务状态，但不再存储 eventSource
      setFileTasks(prevTasks => {
        const newTasks = new Map(prevTasks);
        const task = newTasks.get(fileId);
        if (task) {
          task.eventSource = null;
          newTasks.set(fileId, task);
        }
        return newTasks;
      });
    } else {
      // 关闭所有连接
      eventSourcesRef.current.forEach((eventSource, id) => {
        eventSource.close();
      });
      eventSourcesRef.current.clear();
      logger.info('关闭所有流式连接');
      
      // 更新所有任务的状态
      setFileTasks(prevTasks => {
        const newTasks = new Map(prevTasks);
        prevTasks.forEach((task, id) => {
          task.eventSource = null;
          newTasks.set(id, task);
        });
        return newTasks;
      });
    }
  }, []);

  // 取消指定文件的分析
  const cancelAnalysis = useCallback(async (fileId?: string) => {
    if (fileId) {
      // 取消指定文件的分析
      const task = fileTasks.get(fileId);
      if (task?.taskId) {
        logger.info('用户取消文件分析', { fileId, taskId: task.taskId });
        
        try {
          // 调用API路由取消分析
          const response = await fetch('/api/dify/stream-analysis/', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.taskId }),
          });
          
          const result = await response.json();
          
          if (result.success) {
            // 更新单个文件的状态
            setFileTasks(prevTasks => {
              const newTasks = new Map(prevTasks);
              const existingTask = newTasks.get(fileId);
              if (existingTask) {
                newTasks.set(fileId, {
                  ...existingTask,
                  streamingResult: existingTask.streamingResult + '\n\n[分析已取消]'
                });
              }
              return newTasks;
            });
          } else {
            logger.error('取消文件分析失败', { fileId, error: result.error });
          }
        } catch (error) {
          logger.error('取消文件分析请求出错', { fileId, error });
        }
        
        // 关闭连接
        closeEventSource(fileId);
        // 更新文件状态
        updateFilesStatus([fileId], 'analysis_failed');
      }
    } else {
      // 取消所有分析
      const taskIds: {fileId: string, taskId: string}[] = [];
      
      fileTasks.forEach((task, id) => {
        if (task.taskId) {
          taskIds.push({fileId: id, taskId: task.taskId});
        }
      });
      
      for (const {fileId, taskId} of taskIds) {
        logger.info('取消文件分析', { fileId, taskId });
        
        try {
          await fetch('/api/dify/stream-analysis/', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId }),
          });
          
          setFileTasks(prevTasks => {
            const newTasks = new Map(prevTasks);
            const existingTask = newTasks.get(fileId);
            if (existingTask) {
              newTasks.set(fileId, {
                ...existingTask,
                streamingResult: existingTask.streamingResult + '\n\n[分析已取消]'
              });
            }
            return newTasks;
          });
        } catch (error) {
          logger.error('取消文件分析请求出错', { fileId, taskId, error });
        }
      }
      
      // 关闭所有连接
      closeEventSource();
      // 更新所有文件状态
      const fileIds = Array.from(fileTasks.keys());
      updateFilesStatus(fileIds, 'analysis_failed');
    }
    
    // 重置全局分析状态
    setIsAnalyzing(false);
  }, [closeEventSource, fileTasks, updateFilesStatus]);

// 清理函数
useEffect(() => {
  return () => {
    // 组件卸载时，如果还有正在进行的分析任务，全部取消
    if (isAnalyzing) {
      // 关闭所有EventSource连接
      eventSourcesRef.current.forEach((eventSource) => {
        eventSource.close();
      });
      eventSourcesRef.current.clear();
      
      // 尝试取消所有正在进行的分析任务
      fileTasks.forEach((task, fileId) => {
        if (task.taskId) {
          fetch('/api/dify/stream-analysis/', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.taskId }),
          }).catch(e => 
            logger.error('组件卸载时取消文件分析失败', { fileId, error: e })
          );
        }
      });
    }
  };
}, [isAnalyzing, fileTasks]);

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
        // 检查是否包含basicInfo和tiobItems
        else if (jsonData["basicInfo"]) {
          const meetingInfo = jsonData["basicInfo"];
          const keyDecisionItems = (jsonData["tiobItems"] || []) as IKeyDecisionItem[];

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

  // 创建消息处理器工厂函数，为每个文件生成一个独立的处理器
  const createMessageHandler = useCallback((fileId: string) => {
    return (event: MessageEvent) => {
      try {
        // 解析SSE消息
        const message = JSON.parse(event.data) as DifySSEMessage;
        
        // 使用函数式更新，只更新一次状态
        setFileTasks(prevTasks => {
          const newTasks = new Map(prevTasks);
          const task = newTasks.get(fileId) || {
            fileId,
            taskId: '',
            streamingResult: '',
            isComplete: false,
            error: null,
            jsonData: null,
            jsonBuffer: { inJsonBlock: false, buffer: '' }
          };
          
          // 保存任务ID (如果有)
          if (message.task_id && !task.taskId) {
            task.taskId = message.task_id;
            logger.info('收到文件任务ID', { fileId, taskId: message.task_id });
          }
          
          // 一次性处理所有消息类型
          let shouldUpdateGlobalState = false;
          
          if (message.event === 'error') {
            task.error = message.message || '分析过程中发生错误';
            task.isComplete = true;
            
            // 关闭这个文件的连接
            const eventSource = eventSourcesRef.current.get(fileId);
            if (eventSource) {
              eventSource.close();
              eventSourcesRef.current.delete(fileId);
            }
            
            // 更新文件状态
            updateFilesStatus([fileId], 'analysis_failed');
            shouldUpdateGlobalState = true;
          } 
          else if (message.event === 'done') {
            task.isComplete = true;
            
            // 关闭这个文件的连接
            const eventSource = eventSourcesRef.current.get(fileId);
            if (eventSource) {
              eventSource.close();
              eventSourcesRef.current.delete(fileId);
            }
            
            // 更新文件状态
            updateFilesStatus([fileId], 'analyzed');
            shouldUpdateGlobalState = true;
          }
          else if (message.answer) {
            const newChunk = message.answer;
            const newStreamingResult = task.streamingResult + newChunk;
            task.streamingResult = newStreamingResult;
  
            // 处理JSON块
            const jsonBuffer = task.jsonBuffer;
            let jsonDataUpdated = false;
            
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
                  task.jsonData = parsedData;
                  jsonDataUpdated = true;
                }
              } catch (e) {
                logger.error('解析JSON缓冲区失败', { fileId, error: e });
              }
              
              // 重置缓冲区
              jsonBuffer.buffer = '';
            } else if (jsonBuffer.inJsonBlock) {
              // 我们在JSON块中，继续累积数据
              jsonBuffer.buffer += newChunk;
            }
  
            // 尝试在整个流中查找完整的JSON
            if (!jsonBuffer.inJsonBlock && !jsonDataUpdated) {
              const parsedData = tryParseJson(newStreamingResult);
              if (parsedData) {
                task.jsonData = parsedData;
                jsonDataUpdated = true;
              }
            }
            
            // 减少全局状态更新
            if (jsonDataUpdated) {
              shouldUpdateGlobalState = true;
            }
          }
          
          newTasks.set(fileId, task);
          
          // 如果需要更新全局状态，在状态更新后批量处理
          if (shouldUpdateGlobalState) {
            // 使用 setTimeout 批处理更新全局状态，避免在渲染循环中触发
            setTimeout(() => {
              if (message.answer) {
                setStreamingResult(prev => prev + message.answer);
              }
              
              if (task.jsonData) {
                setStreamingJsonData(task.jsonData);
              }
              
              if (task.isComplete) {
                setIsComplete(true);
              }
              
              if (task.error) {
                setError(task.error);
              }
            }, 0);
          }
          
          return newTasks;
        });
      } catch (error) {
        logger.error('解析SSE消息出错', { fileId, error });
      }
    };
  }, [updateFilesStatus, tryParseJson]);

  
  // 获取单个文件的分析结果
  const getFileAnalysisResult = useCallback((fileId: string) => {
    return fileTasks.get(fileId) || null;
  }, [fileTasks]);
  
  // 切换文件的展开/折叠状态
  const toggleFileExpanded = useCallback((fileId: string) => {
    setExpandedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);
  
  // 检查文件是否已展开
  const isFileExpanded = useCallback((fileId: string) => {
    return expandedFileIds.has(fileId);
  }, [expandedFileIds]);

  // 开始流式分析 - 对每个文件进行独立的分析
// 开始流式分析 - 对每个文件进行独立的分析
const startStreamingAnalysis = useCallback(async (fileIds: string[]) => {
  if (fileIds.length === 0) return;
  
  try {
    // 重置全局状态
    setIsAnalyzing(true);
    setStreamingResult('');
    setIsComplete(false);
    setError(null);
    
    // 更新文件状态为分析中
    updateFilesStatus(fileIds, 'analyzing');
    
    logger.info('开始对每个文件进行流式分析', { fileCount: fileIds.length });
    
    // 逐个处理每个文件
    for (const fileId of fileIds) {
      // 为每个文件创建任务项
      setFileTasks(prevTasks => {
        const newTasks = new Map(prevTasks);
        newTasks.set(fileId, {
          fileId,
          taskId: '',
          streamingResult: '',
          isComplete: false,
          error: null,
          jsonData: null,
          jsonBuffer: { inJsonBlock: false, buffer: '' }
        });
        return newTasks;
      });
      
      // 设置该文件为展开状态
      setExpandedFileIds(prev => new Set(prev).add(fileId));
      
      // 调用API启动单个文件的分析
      try {
        const singleFileSuccess = await streamAnalyzeDifyFiles([fileId]);
        if (!singleFileSuccess) {
          throw new Error(`服务端拒绝对文件 ${fileId} 进行分析`);
        }
        
        // 为这个文件创建SSE连接
        const fileEventSource = new EventSource(`/api/dify/stream-analysis/?${new URLSearchParams({ 
          fileIds: JSON.stringify([fileId]) 
        }).toString()}`);
        
        // 保存 EventSource 到 ref
        eventSourcesRef.current.set(fileId, fileEventSource);
        
        // 注册事件处理器，将文件ID传递给处理器
        fileEventSource.onmessage = createMessageHandler(fileId);
        
        fileEventSource.onerror = (error) => {
          logger.error('文件SSE连接错误', { fileId, error });
          
          // 关闭并移除连接
          const eventSource = eventSourcesRef.current.get(fileId);
          if (eventSource) {
            eventSource.close();
            eventSourcesRef.current.delete(fileId);
          }
          
          setFileTasks(prevTasks => {
            const newTasks = new Map(prevTasks);
            const task = newTasks.get(fileId);
            if (task) {
              task.error = '与服务器的连接中断';
              newTasks.set(fileId, task);
            }
            return newTasks;
          });
          
          updateFilesStatus([fileId], 'analysis_failed');
        };
        
        logger.info('文件SSE连接已建立', { fileId });
      } catch (error) {
        logger.error('启动文件分析时出错', { fileId, error });
        
        setFileTasks(prevTasks => {
          const newTasks = new Map(prevTasks);
          const task = newTasks.get(fileId);
          if (task) {
            task.error = error instanceof Error ? error.message : '启动分析失败';
            task.isComplete = true;
            newTasks.set(fileId, task);
          }
          return newTasks;
        });
        
        updateFilesStatus([fileId], 'analysis_failed');
      }
    }
  } catch (error) {
    logger.error('启动批量流式分析时出错', { error });
    setError(error instanceof Error ? error.message : '启动分析失败');
    setIsAnalyzing(false);
    updateFilesStatus(fileIds, 'analysis_failed');
  }
}, [updateFilesStatus, createMessageHandler, setExpandedFileIds]);
  
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
          if (jsonData["basicInfo"] && jsonData["tiobItems"]) {
            const meetingInfo = jsonData["basicInfo"];
            const keyDecisionItems = (jsonData["tiobItems"] || []) as IKeyDecisionItem[];
            
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
    // 全局状态 (兼容旧代码)
    isAnalyzing,
    streamingResult,
    isComplete,
    error,
    startStreamingAnalysis,
    cancelAnalysis,
    extractMeetingsFromStreamingResult,
    streamingJsonData, // 提供实时解析的JSON数据
    
    // 新增的文件级分析功能
    fileTasks,
    getFileAnalysisResult,
    toggleFileExpanded,
    isFileExpanded,
  };
}
