'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  FileText, 
  Clock, 
  Brain, 
  Loader2,
  Bot
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FloatingChatBotProps {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  projectName?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  sources?: Array<{
    content: string;
    score: number;
    title: string;
    metadata?: Record<string, any>;
  }>;
  timestamp: Date;
  confidence?: number;
  responseTime?: number;
  method?: string;
}

export function FloatingChatBot({ 
  knowledgeBaseId, 
  knowledgeBaseName, 
  projectName 
}: FloatingChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // 发送问题
  const handleSendMessage = async () => {
    const question = currentInput.trim();
    if (!question || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsTyping(true);

    try {
      const response = await fetch(`/api/knowledge-base/${knowledgeBaseId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          topK: 5,
          scoreThreshold: 0.3
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }

      const result = await response.json();

      if (result.success && result.data) {
        const botMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: result.data.answer || '抱歉，我无法回答您的问题。',
          sources: result.data.sources,
          confidence: result.data.confidence,
          responseTime: result.data.responseTime,
          method: result.data.method,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(result.error || '问答失败');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      const errorMessage: ChatMessage = {
        id: `bot-error-${Date.now()}`,
        type: 'bot',
        content: '抱歉，问答服务暂时不可用，请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error(error instanceof Error ? error.message : '问答失败');
    } finally {
      setIsTyping(false);
    }
  };

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 格式化置信度
  const formatConfidence = (confidence?: number) => {
    if (!confidence) return null;
    const percentage = Math.round(confidence * 100);
    const variant = percentage >= 80 ? 'default' : percentage >= 60 ? 'secondary' : 'outline';
    return <Badge variant={variant} className="text-xs">{percentage}%</Badge>;
  };

  // 格式化响应时间
  const formatResponseTime = (time?: number) => {
    if (!time) return null;
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {time.toFixed(1)}s
      </div>
    );
  };

  // 初始欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        content: `👋 您好！我是${projectName || knowledgeBaseName}的智能助手。\n\n我可以帮您回答关于项目文档的问题。请随时向我提问！`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, projectName, knowledgeBaseName]);

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* 聊天窗口 */}
      {isOpen && (
        <div 
          className={cn(
            "fixed bottom-6 right-6 z-[9999] bg-background border rounded-lg shadow-2xl transition-all duration-300 flex flex-col",
            isMinimized ? "w-80 h-14" : "w-96 h-[600px]"
          )}
          style={{ zIndex: 9999 }}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">AI助手</h3>
                {!isMinimized && (
                  <p className="text-xs text-muted-foreground truncate">
                    {projectName || knowledgeBaseName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 聊天内容 */}
          {!isMinimized && (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={cn(
                      "flex",
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      <div className={cn(
                        "max-w-[80%] rounded-lg p-3 text-sm",
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      )}>
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {message.type === 'bot' && (
                            <div className="space-y-2">
                              {/* 置信度和响应时间 */}
                              {(message.confidence || message.responseTime) && (
                                <div className="flex items-center gap-2">
                                  {formatConfidence(message.confidence)}
                                  {formatResponseTime(message.responseTime)}
                                </div>
                              )}
                              
                              {/* 引用来源 */}
                              {message.sources && message.sources.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  <Separator />
                                  <div className="text-xs font-medium flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    引用来源 ({message.sources.length})
                                  </div>
                                  <div className="space-y-1">
                                    {message.sources.slice(0, 2).map((source, index) => (
                                      <div key={index} className="bg-background/50 rounded p-2 text-xs">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium truncate">{source.title}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(source.score * 100)}%
                                          </Badge>
                                        </div>
                                        <p className="text-muted-foreground line-clamp-2">
                                          {source.content.substring(0, 100)}...
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 打字中指示器 */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI正在思考...
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* 输入框 */}
              <div className="p-4 border-t shrink-0">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="输入您的问题..."
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isTyping}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isTyping || !currentInput.trim()}
                    size="sm"
                  >
                    {isTyping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  按 Enter 发送，Shift + Enter 换行
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}