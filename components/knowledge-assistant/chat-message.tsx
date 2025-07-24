/**
 * 聊天消息组件
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  User, 
  Bot, 
  Copy, 
  Check, 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown, 
  ChevronDown, 
  ChevronUp,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ChatMessageProps } from './types';
import { AssistantThinkingWave } from './floating-button';

export function ChatMessage({ 
  message, 
  showContext = false, 
  onContextToggle 
}: ChatMessageProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  // 复制消息内容
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, [message.content]);

  // 切换上下文显示
  const handleContextToggle = useCallback(() => {
    if (onContextToggle) {
      onContextToggle(message.id);
    }
    setShowSources(!showSources);
  }, [message.id, onContextToggle, showSources]);

  const isUser = (message.type || message.role) === 'user';
  const hasContext = message.context && message.context.length > 0;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 头像 */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
        }
      `}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col overflow-hidden`}>
        {/* 消息气泡 */}
        <div className={`
          rounded-lg px-4 py-3 break-words overflow-hidden
          ${isUser 
            ? 'bg-blue-500 text-white ml-auto' 
            : 'bg-muted text-foreground mr-auto'
          }
          ${message.error ? 'border border-red-200 bg-red-50 text-red-700' : ''}
        `}>
          {/* 增强的加载和流式状态 */}
          {message.isLoading && !message.isStreaming ? (
            <div className="flex items-center gap-2">
              <AssistantThinkingWave />
              <span className="text-sm">正在分析问题...</span>
            </div>
          ) : message.isStreaming ? (
            <div className="space-y-2">
              {/* 显示已有内容 */}
              <div className="whitespace-pre-wrap break-words">
                <MessageContent message={message} />
              </div>
              {/* 流式指示器 */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span>正在实时生成...</span>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.error ? (
                <div className="flex items-center gap-2">
                  <span>❌ {message.error}</span>
                </div>
              ) : (
                <MessageContent message={message} />
              )}
            </div>
          )}

          {/* 意图检测和检索状态指示 */}
          {!isUser && message.metadata?.intentResult && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={message.metadata.intentResult.isKnowledgeBaseRelated ? "default" : "secondary"}>
                  {message.metadata.intentResult.isKnowledgeBaseRelated ? "知识库检索" : "通用回答"}
                </Badge>
                <span>置信度: {(message.metadata.intentResult.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {format(message.timestamp || message.createdAt || new Date(), 'HH:mm', { locale: zhCN })}
        </div>

        {/* 操作按钮 */}
        {!message.isLoading && (
          <div className={`flex items-center gap-1 mt-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* 复制按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>

            {/* AI消息专用操作 */}
            {!isUser && (
              <>
                {/* 重新生成按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>

                {/* 点赞/点踩 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>

                {/* 查看来源按钮 */}
                {hasContext && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleContextToggle}
                    className="h-6 px-2 text-xs"
                  >
                    {showSources ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        隐藏来源
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        查看来源 ({message.context?.length})
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* 知识来源展示 */}
        {!isUser && hasContext && showSources && (
          <Card className="mt-3 p-3 bg-muted/50 border-dashed">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <FileText className="h-3 w-3" />
              知识来源
            </div>
            <div className="space-y-2">
              {message.context?.map((record, index) => (
                <ContextSource key={index} record={record} index={index} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * 消息内容渲染组件（支持Markdown等格式）
 * 解决渲染模式切换导致的用户体验问题
 */
function MessageContent({ message }: { message: any }) {
  // 智能判断最终的渲染模式 - 避免模式切换
  const shouldUseAdvancedMode = useMemo(() => {
    // 1. 检查是否有工具调用（最可靠的指标）
    if (message.toolInvocations && message.toolInvocations.length > 0) {
      return true;
    }
    
    // 2. 检查 parts 中是否包含工具调用
    if (message.parts && Array.isArray(message.parts)) {
      const hasToolInvocation = message.parts.some((part: any) => 
        part.type === 'tool-invocation' || part.type === 'step-start'
      );
      if (hasToolInvocation) {
        return true;
      }
    }
    
    // 3. 检查是否是AI助手消息且内容复杂（启发式判断）
    const isAssistant = (message.role || message.type) === 'assistant';
    if (isAssistant) {
      const content = message.content || '';
      // 如果内容包含多个段落或者很长，可能会有复杂的推理过程
      const hasMultipleParagraphs = content.split('\n\n').length > 2;
      const isLongContent = content.length > 500;
      const hasStructuredContent = content.includes('##') || content.includes('###');
      
      if (hasMultipleParagraphs || isLongContent || hasStructuredContent) {
        return true;
      }
    }
    
    return false;
  }, [
    message.toolInvocations, 
    message.parts, 
    message.role, 
    message.type, 
    message.content
  ]);

  // 使用统一的渲染架构
  return (
    <div>
      {shouldUseAdvancedMode ? (
        <UnifiedAdvancedDisplay message={message} />
      ) : (
        <SimpleTextDisplay content={message.content || ''} />
      )}
    </div>
  );
}

/**
 * 简单文本显示组件
 */
function SimpleTextDisplay({ content }: { content: string }) {
  const processedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 粗体
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // 斜体
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>'); // 行内代码

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: processedContent }}
      className="[&>code]:bg-muted [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm"
    />
  );
}

/**
 * 统一的高级显示组件 - 避免模式切换
 */
function UnifiedAdvancedDisplay({ message }: { message: any }) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [showAllSteps, setShowAllSteps] = useState(false);

  const toggleToolExpansion = (toolCallId: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolCallId)) {
      newExpanded.delete(toolCallId);
    } else {
      newExpanded.add(toolCallId);
    }
    setExpandedTools(newExpanded);
  };

  // 解析消息结构 - 统一处理不同数据源
  const parseMessageStructure = () => {
    const structure: {
      hasSteps: boolean;
      steps: Array<{
        stepNumber: number;
        thinking: string[];
        toolCalls: any[];
      }>;
      finalContent: string;
      toolInvocations: any[];
    } = {
      hasSteps: false,
      steps: [],
      finalContent: '',
      toolInvocations: []
    };

    // 优先从 toolInvocations 获取工具调用信息
    if (message.toolInvocations && message.toolInvocations.length > 0) {
      structure.toolInvocations = message.toolInvocations;
    }

    // 从 parts 解析步骤结构
    if (message.parts && Array.isArray(message.parts)) {
      let currentStep = -1;
      let currentThinking: string[] = [];
      let currentToolCalls: any[] = [];

      message.parts.forEach((part: any) => {
        if (part.type === 'step-start') {
          // 保存上一步
          if (currentStep >= 0) {
            structure.steps[currentStep] = {
              stepNumber: currentStep + 1,
              thinking: [...currentThinking],
              toolCalls: [...currentToolCalls]
            };
          }
          
          // 开始新步骤
          currentStep++;
          currentThinking = [];
          currentToolCalls = [];
          structure.hasSteps = true;
        } else if (part.type === 'text') {
          currentThinking.push(part.text);
        } else if (part.type === 'tool-invocation') {
          currentToolCalls.push(part.toolInvocation);
        }
      });

      // 保存最后一步
      if (currentStep >= 0) {
        structure.steps[currentStep] = {
          stepNumber: currentStep + 1,
          thinking: [...currentThinking],
          toolCalls: [...currentToolCalls]
        };
      }

      // 如果没有明确的steps，但有内容，创建单一步骤
      if (!structure.hasSteps && structure.steps.length === 0) {
        const allText = message.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('\n\n');
        const allTools = message.parts
          .filter((p: any) => p.type === 'tool-invocation')
          .map((p: any) => p.toolInvocation);

        if (allText || allTools.length > 0) {
          structure.steps.push({
            stepNumber: 1,
            thinking: allText ? [allText] : [],
            toolCalls: allTools
          });
        }
      }
    }

    // 如果没有 parts 但有 content，使用 content 作为最终内容
    if (structure.steps.length === 0 && message.content) {
      structure.finalContent = message.content;
    }

    // 合并 toolInvocations 到相应步骤
    if (structure.toolInvocations.length > 0 && structure.steps.length > 0) {
      structure.toolInvocations.forEach((tool, index) => {
        const stepIndex = tool.step || index;
        if (structure.steps[stepIndex]) {
          // 避免重复添加
          const existingTool = structure.steps[stepIndex].toolCalls.find(
            t => t.toolCallId === tool.toolCallId
          );
          if (!existingTool) {
            structure.steps[stepIndex].toolCalls.push(tool);
          }
        }
      });
    }

    return structure;
  };

  const messageStructure = parseMessageStructure();

  // 如果既没有步骤也没有工具调用，降级到简单显示
  if (messageStructure.steps.length === 0 && messageStructure.toolInvocations.length === 0) {
    return <SimpleTextDisplay content={messageStructure.finalContent || message.content || ''} />;
  }

  // 显示统一的高级界面
  return (
    <div className="space-y-3">
      {/* 智能总览 - 只在有多个步骤或工具调用时显示 */}
      {(messageStructure.steps.length > 1 || messageStructure.toolInvocations.length > 0) && (
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {Math.max(messageStructure.steps.length, 1)}
              </span>
            </div>
            <span className="text-sm font-medium text-blue-700">
              {messageStructure.steps.length > 1 
                ? `AI推理过程 (${messageStructure.steps.length} 个步骤)` 
                : '智能分析'
              }
            </span>
          </div>
          {messageStructure.steps.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllSteps(!showAllSteps)}
              className="h-6 px-2 text-xs text-blue-600"
            >
              {showAllSteps ? '折叠所有' : '展开所有'}
            </Button>
          )}
        </div>
      )}

      {/* 步骤内容 */}
      <div className="space-y-3">
        {messageStructure.steps.length > 0 ? (
          messageStructure.steps.map((step, stepIndex) => (
            <StepDisplay 
              key={stepIndex}
              step={step}
              stepIndex={stepIndex}
              isExpanded={showAllSteps || stepIndex === messageStructure.steps.length - 1}
              expandedTools={expandedTools}
              onToggleToolExpansion={toggleToolExpansion}
              hasMultipleSteps={messageStructure.steps.length > 1}
            />
          ))
        ) : (
          // 没有步骤但有内容的情况
          <SimpleTextDisplay content={messageStructure.finalContent || message.content || ''} />
        )}
      </div>
    </div>
  );
}

/**
 * 多步骤推理过程展示组件
 */
function MultiStepReasoningDisplay({ message }: { message: any }) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [showAllSteps, setShowAllSteps] = useState(false);

  const toggleToolExpansion = (toolCallId: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolCallId)) {
      newExpanded.delete(toolCallId);
    } else {
      newExpanded.add(toolCallId);
    }
    setExpandedTools(newExpanded);
  };

  // 解析步骤结构
  const parseSteps = () => {
    const steps: Array<{
      stepNumber: number;
      thinking: string[];
      toolCalls: any[];
      finalText?: string;
    }> = [];
    
    let currentStep = -1;
    let currentThinking: string[] = [];
    let currentToolCalls: any[] = [];

    message.parts.forEach((part: any) => {
      if (part.type === 'step-start') {
        // 保存上一步
        if (currentStep >= 0) {
          steps[currentStep] = {
            stepNumber: currentStep + 1,
            thinking: [...currentThinking],
            toolCalls: [...currentToolCalls]
          };
        }
        
        // 开始新步骤
        currentStep++;
        currentThinking = [];
        currentToolCalls = [];
      } else if (part.type === 'text') {
        currentThinking.push(part.text);
      } else if (part.type === 'tool-invocation') {
        currentToolCalls.push(part.toolInvocation);
      }
    });

    // 保存最后一步
    if (currentStep >= 0) {
      steps[currentStep] = {
        stepNumber: currentStep + 1,
        thinking: [...currentThinking],
        toolCalls: [...currentToolCalls]
      };
    }

    // 如果没有明确的steps，将所有内容作为一个步骤
    if (steps.length === 0) {
      const allText = message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('\n\n');
      const allTools = message.parts
        .filter((p: any) => p.type === 'tool-invocation')
        .map((p: any) => p.toolInvocation);

      if (allText || allTools.length > 0) {
        steps.push({
          stepNumber: 1,
          thinking: allText ? [allText] : [],
          toolCalls: allTools
        });
      }
    }

    return steps;
  };

  const steps = parseSteps();
  const hasMultipleSteps = steps.length > 1;

  // 如果只有一步且没有工具调用，显示简化版本
  if (steps.length === 1 && steps[0].toolCalls.length === 0) {
    const content = steps[0].thinking.join('\n\n');
    const processedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: processedContent }}
        className="[&>code]:bg-muted [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm"
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* 步骤总览 */}
      {hasMultipleSteps && (
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{steps.length}</span>
            </div>
            <span className="text-sm font-medium text-blue-700">
              AI推理过程 ({steps.length} 个步骤)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllSteps(!showAllSteps)}
            className="h-6 px-2 text-xs text-blue-600"
          >
            {showAllSteps ? '折叠所有' : '展开所有'}
          </Button>
        </div>
      )}

      {/* 步骤详情 */}
      <div className="space-y-3">
        {steps.map((step, stepIndex) => (
          <StepDisplay 
            key={stepIndex}
            step={step}
            stepIndex={stepIndex}
            isExpanded={showAllSteps || stepIndex === steps.length - 1}
            expandedTools={expandedTools}
            onToggleToolExpansion={toggleToolExpansion}
            hasMultipleSteps={hasMultipleSteps}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 单个步骤展示组件
 */
function StepDisplay({ 
  step, 
  stepIndex, 
  isExpanded, 
  expandedTools, 
  onToggleToolExpansion,
  hasMultipleSteps 
}: {
  step: any;
  stepIndex: number;
  isExpanded: boolean;
  expandedTools: Set<string>;
  onToggleToolExpansion: (toolCallId: string) => void;
  hasMultipleSteps: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  
  useEffect(() => {
    setLocalExpanded(isExpanded);
  }, [isExpanded]);

  const hasContent = step.thinking.length > 0 || step.toolCalls.length > 0;
  if (!hasContent) return null;

  return (
    <div className={`border rounded-lg ${hasMultipleSteps ? 'bg-gradient-to-r from-gray-50 to-transparent' : ''}`}>
      {/* 步骤标题 */}
      {hasMultipleSteps && (
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b"
          onClick={() => setLocalExpanded(!localExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{step.stepNumber}</span>
            </div>
            <span className="font-medium text-sm">
              步骤 {step.stepNumber}
              {step.toolCalls.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({step.toolCalls.length} 个工具调用)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {step.toolCalls.map((tool: any) => (
              <ToolStatusBadge key={tool.toolCallId} tool={tool} />
            ))}
            <ChevronDown className={`h-4 w-4 transition-transform ${localExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      )}

      {/* 步骤内容 */}
      {localExpanded && (
        <div className="p-3 space-y-3">
          {/* AI思考内容 */}
          {step.thinking.length > 0 && (
            <div className="space-y-2">
              {step.thinking.map((thought: string, index: number) => {
                const processedContent = thought
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');

                return (
                  <div 
                    key={index}
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                    className="text-sm [&>code]:bg-muted [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm"
                  />
                );
              })}
            </div>
          )}

          {/* 工具调用 */}
          {step.toolCalls.length > 0 && (
            <div className="space-y-2">
              {step.toolCalls.map((tool: any) => (
                <ToolInvocationCard 
                  key={tool.toolCallId}
                  tool={tool}
                  isExpanded={expandedTools.has(tool.toolCallId)}
                  onToggleExpansion={() => onToggleToolExpansion(tool.toolCallId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 工具状态徽章
 */
function ToolStatusBadge({ tool }: { tool: any }) {
  const getStatusInfo = () => {
    switch (tool.state) {
      case 'result':
        return { 
          color: 'bg-green-100 text-green-700', 
          icon: '✓', 
          label: '完成' 
        };
      case 'partial':
        return { 
          color: 'bg-blue-100 text-blue-700', 
          icon: '⟳', 
          label: '进行中' 
        };
      case 'error':
        return { 
          color: 'bg-red-100 text-red-700', 
          icon: '✗', 
          label: '失败' 
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-700', 
          icon: '?', 
          label: '未知' 
        };
    }
  };

  const status = getStatusInfo();

  return (
    <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
      <span className="mr-1">{status.icon}</span>
      {tool.toolName}
    </div>
  );
}

/**
 * 工具调用卡片
 */
function ToolInvocationCard({ 
  tool, 
  isExpanded, 
  onToggleExpansion 
}: {
  tool: any;
  isExpanded: boolean;
  onToggleExpansion: () => void;
}) {
  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'retrieveKnowledge':
        return '🔍';
      case 'getProjectInfo':
        return 'ℹ️';
      default:
        return '🔧';
    }
  };

  const getToolDisplayName = (toolName: string) => {
    switch (toolName) {
      case 'retrieveKnowledge':
        return '知识库检索';
      case 'getProjectInfo':
        return '获取项目信息';
      default:
        return toolName;
    }
  };

  const getStatusColor = () => {
    switch (tool.state) {
      case 'result':
        return tool.result?.includes('失败') || tool.result?.includes('错误') 
          ? 'border-red-200 bg-red-50' 
          : 'border-green-200 bg-green-50';
      case 'partial':
        return 'border-blue-200 bg-blue-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`border rounded-lg ${getStatusColor()}`}>
      {/* 工具调用头部 */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 transition-colors"
        onClick={onToggleExpansion}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getToolIcon(tool.toolName)}</span>
          <div>
            <div className="font-medium text-sm">
              {getToolDisplayName(tool.toolName)}
            </div>
            <div className="text-xs text-gray-500">
              {tool.state === 'result' ? '已完成' : 
               tool.state === 'partial' ? '执行中...' : 
               tool.state === 'error' ? '执行失败' : '未知状态'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToolStatusBadge tool={tool} />
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* 工具调用详情 */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* 参数 */}
          {tool.args && Object.keys(tool.args).length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">调用参数:</div>
              <div className="bg-white rounded border p-2 text-xs font-mono">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(tool.args, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* 结果 */}
          {tool.result && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">执行结果:</div>
              <div className="bg-white rounded border p-2 text-xs">
                <div className="max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)}
                </div>
              </div>
            </div>
          )}

          {/* 执行时间等元数据 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>步骤 {tool.step + 1}</span>
            <span>ID: {tool.toolCallId.slice(-8)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 知识来源组件
 */
function ContextSource({ 
  record, 
  index 
}: { 
  record: any; 
  index: number; 
}) {
  const [expanded, setExpanded] = useState(false);
  const segment = record.segment;
  
  return (
    <div className="border rounded-lg p-2 bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* 文档信息 */}
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              #{index + 1}
            </Badge>
            <span className="text-xs font-medium truncate">
              {segment.document.name}
            </span>
            <Badge variant="secondary" className="text-xs">
              {(record.score * 100).toFixed(1)}% 相关
            </Badge>
          </div>

          {/* 内容预览 */}
          <div className="text-xs text-muted-foreground">
            {expanded 
              ? segment.content 
              : `${segment.content.slice(0, 100)}${segment.content.length > 100 ? '...' : ''}`
            }
          </div>

          {/* 关键词 */}
          {segment.keywords && segment.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {segment.keywords.slice(0, 3).map((keyword: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                  {keyword}
                </Badge>
              ))}
              {segment.keywords.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{segment.keywords.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          {segment.content.length > 100 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-5 w-5 p-0"
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 消息列表组件
 */
interface MessageListProps {
  messages: any[];
  isLoading?: boolean;
  showContext?: boolean;
  onContextToggle?: (messageId: string) => void;
}

export function MessageList({ 
  messages, 
  isLoading = false, 
  showContext = false, 
  onContextToggle 
}: MessageListProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[300px]">
        <div className="text-center max-w-sm">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            您好！我是智能助手
          </h3>
          <p className="text-sm text-muted-foreground">
            我可以基于知识库回答您的问题，请随时向我提问。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          showContext={showContext}
          onContextToggle={onContextToggle}
        />
      ))}
      
      {/* 底部空白区域，确保消息不会被输入框遮挡 */}
      <div className="h-4" />
    </div>
  );
}

export default ChatMessage;