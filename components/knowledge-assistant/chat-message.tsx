/**
 * 聊天消息组件
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
 * 消息内容渲染组件 - 自然渲染后端发送的消息部分
 * 无需复杂的模式判断，直接渲染 parts 内容
 */
function MessageContent({ message }: { message: any }) {
  // 如果有 parts，逐个渲染各部分
  if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
    return (
      <div className="space-y-2">
        {message.parts.map((part: any, index: number) => (
          <MessagePart 
            key={index} 
            part={part} 
            isLatest={index === message.parts.length - 1}
            messageId={message.id}
          />
        ))}
      </div>
    );
  }

  // 如果有工具调用，渲染工具调用信息
  if (message.toolInvocations && message.toolInvocations.length > 0) {
    return (
      <div className="space-y-3">
        {/* 主要内容 */}
        {message.content && (
          <SimpleTextDisplay content={message.content} />
        )}
        
        {/* 工具调用 */}
        <div className="space-y-2">
          {message.toolInvocations.map((tool: any, index: number) => (
            <ToolInvocationCard 
              key={tool.toolCallId || index}
              tool={tool}
              isExpanded={false}
              onToggleExpansion={() => {}}
            />
          ))}
        </div>
      </div>
    );
  }

  // 默认渲染纯文本内容
  return <SimpleTextDisplay content={message.content || ''} />;
}

/**
 * 消息部分渲染组件 - 处理单个 message part
 */
function MessagePart({ 
  part, 
  isLatest, 
  messageId 
}: { 
  part: any; 
  isLatest: boolean; 
  messageId: string;
}) {
  switch (part.type) {
    case 'text':
      return (
        <div className={isLatest ? 'animate-in fade-in duration-300' : ''}>
          <SimpleTextDisplay content={part.text || ''} />
        </div>
      );

    case 'tool-call':
    case 'tool-invocation':
      return (
        <div className={`${isLatest ? 'animate-in fade-in duration-300' : ''} my-2`}>
          <ToolInvocationCard 
            tool={part.toolInvocation || part}
            isExpanded={false}
            onToggleExpansion={() => {}}
          />
        </div>
      );

    case 'tool-result':
      return (
        <div className={`${isLatest ? 'animate-in fade-in duration-300' : ''} my-2`}>
          <ToolResultDisplay result={part.result || part} />
        </div>
      );

    case 'step-start':
      return (
        <div className={`${isLatest ? 'animate-in fade-in duration-300' : ''} my-3`}>
          <StepStartIndicator step={part.step || 1} />
        </div>
      );

    case 'thinking':
      return (
        <div className={`${isLatest ? 'animate-in fade-in duration-300' : ''} my-2`}>
          <ThinkingDisplay content={part.content || part.text || ''} />
        </div>
      );

    default:
      // 未知类型，尝试渲染为文本
      const content = part.text || part.content || JSON.stringify(part);
      return (
        <div className={isLatest ? 'animate-in fade-in duration-300' : ''}>
          <SimpleTextDisplay content={content} />
        </div>
      );
  }
}

/**
 * 简单文本显示组件
 */
function SimpleTextDisplay({ content }: { content: string }) {
  if (!content) return null;
  
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
 * 工具结果显示组件
 */
function ToolResultDisplay({ result }: { result: any }) {
  return (
    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="text-xs font-medium text-green-700 mb-2 flex items-center gap-2">
        <span>✅</span>
        工具执行结果
      </div>
      <div className="text-sm text-green-800 bg-white rounded p-2 max-h-32 overflow-y-auto">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </div>
    </div>
  );
}

/**
 * 步骤开始指示器
 */
function StepStartIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">{step}</span>
      </div>
      <span className="text-sm font-medium text-blue-700">
        步骤 {step}
      </span>
      <div className="flex-1 h-px bg-blue-200"></div>
    </div>
  );
}

/**
 * AI 思考过程显示组件
 */
function ThinkingDisplay({ content }: { content: string }) {
  return (
    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
      <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-2">
        <span>🤔</span>
        AI 思考中...
      </div>
      <div className="text-sm text-blue-800">
        <SimpleTextDisplay content={content} />
      </div>
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