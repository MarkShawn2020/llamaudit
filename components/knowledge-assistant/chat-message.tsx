/**
 * 聊天消息组件
 */

'use client';

import React, { useState, useCallback } from 'react';
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

  const isUser = message.type === 'user';
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
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 消息气泡 */}
        <div className={`
          rounded-lg px-4 py-3 
          ${isUser 
            ? 'bg-blue-500 text-white ml-auto' 
            : 'bg-muted text-foreground mr-auto'
          }
          ${message.error ? 'border border-red-200 bg-red-50 text-red-700' : ''}
        `}>
          {/* 加载状态 */}
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <AssistantThinkingWave />
              <span className="text-sm">正在思考...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.error ? (
                <div className="flex items-center gap-2">
                  <span>❌ {message.error}</span>
                </div>
              ) : (
                <MessageContent content={message.content} />
              )}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {format(message.timestamp, 'HH:mm', { locale: zhCN })}
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
 */
function MessageContent({ content }: { content: string }) {
  // 简单的文本处理，可以扩展为Markdown渲染
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
      <div className="flex-1 flex items-center justify-center p-8">
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
    <div className="flex-1 space-y-4 p-4">
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