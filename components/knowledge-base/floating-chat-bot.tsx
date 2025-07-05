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
  Bot,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  Bug,
  Search
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
  questionType?: string;
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [debugMode, setDebugMode] = useState(false);
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
          questionType: result.data.questionType,
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

  // 复制消息内容
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      toast.success('内容已复制到剪贴板');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 处理反馈
  const handleFeedback = async (messageId: string, isPositive: boolean) => {
    try {
      // 这里可以发送反馈到后端
      setFeedbackGiven(prev => new Set(prev).add(messageId));
      toast.success(isPositive ? '感谢您的反馈！' : '感谢反馈，我们会继续改进');
    } catch (error) {
      toast.error('反馈提交失败');
    }
  };

  // 分享消息
  const handleShare = async (content: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: '知识库助手回答',
          text: content
        });
      } else {
        await navigator.clipboard.writeText(content);
        toast.success('内容已复制到剪贴板，可以分享了');
      }
    } catch (error) {
      toast.error('分享失败');
    }
  };

  // 导出对话
  const handleExportConversation = () => {
    const conversationText = messages.map(msg => {
      const timestamp = msg.timestamp.toLocaleString();
      const sender = msg.type === 'user' ? '用户' : 'AI助手';
      return `[${timestamp}] ${sender}: ${msg.content}`;
    }).join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `知识库对话_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('对话已导出');
  };

  // 测试检索功能
  const handleTestRetrieve = async () => {
    if (!currentInput.trim()) {
      toast.error('请输入要测试的查询内容');
      return;
    }

    try {
      setIsTyping(true);
      const response = await fetch(`/api/knowledge-base/${knowledgeBaseId}/test-retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentInput,
          top_k: 5,
          score_threshold: 0.1
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const debugMessage: ChatMessage = {
          id: `debug-${Date.now()}`,
          type: 'bot',
          content: `🔍 **检索测试结果**

查询：${currentInput}
检索到：${result.data.recordCount} 个相关片段
响应时间：${result.data.responseTime.toFixed(2)}s

**检索结果：**
${result.data.records.map((record: any, index: number) => 
  `${index + 1}. **${record.documentName}** (评分: ${(record.score * 100).toFixed(1)}%)
  内容预览：${record.contentPreview}`
).join('\n\n')}

${result.data.recordCount === 0 ? '❌ 未找到相关内容，建议：\n• 尝试不同的关键词\n• 检查文档是否已正确上传\n• 确认文档已完成索引' : '✅ 检索成功'}`,
          timestamp: new Date(),
          method: 'debug_retrieve',
          sources: result.data.records.map((record: any) => ({
            content: record.content || '',
            score: record.score || 0,
            title: record.documentName || '未知文档',
            metadata: record
          }))
        };
        
        setMessages(prev => [...prev, debugMessage]);
        setCurrentInput('');
        toast.success('检索测试完成');
      } else {
        throw new Error(result.error || '检索测试失败');
      }
    } catch (error) {
      console.error('Test retrieve error:', error);
      toast.error(error instanceof Error ? error.message : '检索测试失败');
    } finally {
      setIsTyping(false);
    }
  };

  // 格式化置信度
  const formatConfidence = (confidence?: number) => {
    if (!confidence) return null;
    const percentage = Math.round(confidence * 100);
    const variant = percentage >= 80 ? 'default' : percentage >= 60 ? 'secondary' : 'outline';
    return <Badge variant={variant} className="text-xs">{percentage}%</Badge>;
  };

  // 格式化问题类型
  const formatQuestionType = (questionType?: string) => {
    if (!questionType) return null;
    const typeMap: Record<string, string> = {
      'greeting': '问候',
      'irrelevant': '无关',
      'project_related': '项目相关',
      'technical_term': '技术术语',
      'community': '社区相关'
    };
    return (
      <Badge variant="outline" className="text-xs">
        {typeMap[questionType] || questionType}
      </Badge>
    );
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
        content: `👋 您好！我是${projectName || knowledgeBaseName}的智能助手。

我可以帮您：
• 回答项目相关的技术问题
• 解释代码实现和架构
• 提供最佳实践建议
• 解答文档中的内容

一些示例问题：
• "这个项目是做什么的？"
• "如何配置开发环境？"
• "什么是知识库？"
• "如何部署应用？"

请随时向我提问！`,
        timestamp: new Date(),
        questionType: 'greeting',
        method: 'direct_reply',
        confidence: 0.9
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
                onClick={() => setDebugMode(!debugMode)}
                className={cn("h-8 w-8 p-0", debugMode && "bg-yellow-100")}
                title="调试模式"
              >
                <Bug className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportConversation}
                className="h-8 w-8 p-0"
                title="导出对话"
                disabled={messages.length === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
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
                        "max-w-[80%] rounded-lg text-sm relative group",
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      )}>
                        <div className="p-3 space-y-2">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {message.type === 'bot' && (
                            <div className="space-y-2">
                              {/* 置信度、响应时间和问题类型 */}
                              {(message.confidence || message.responseTime || message.questionType) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {formatQuestionType(message.questionType)}
                                  {formatConfidence(message.confidence)}
                                  {formatResponseTime(message.responseTime)}
                                  {debugMode && message.method && (
                                    <Badge variant="outline" className="text-xs">
                                      {message.method}
                                    </Badge>
                                  )}
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
                                          {source.content?.substring(0, 100) || '无内容'}...
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

                        {/* 操作按钮 */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyMessage(message.id, message.content)}
                              className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                              title="复制"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            {message.type === 'bot' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShare(message.content)}
                                  className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                                  title="分享"
                                >
                                  <Share2 className="h-3 w-3" />
                                </Button>
                                {!feedbackGiven.has(message.id) && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleFeedback(message.id, true)}
                                      className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                                      title="好评"
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleFeedback(message.id, false)}
                                      className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                                      title="差评"
                                    >
                                      <ThumbsDown className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
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
                    placeholder={debugMode ? "输入要测试检索的内容..." : "输入您的问题..."}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isTyping}
                    className="flex-1"
                  />
                  {debugMode && (
                    <Button
                      onClick={handleTestRetrieve}
                      disabled={isTyping || !currentInput.trim()}
                      size="sm"
                      variant="outline"
                      title="测试检索"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  )}
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
                  {debugMode ? (
                    <span className="text-yellow-600">
                      🐛 调试模式：使用 🔍 按钮测试检索，使用 ➤ 按钮正常对话
                    </span>
                  ) : (
                    '按 Enter 发送，Shift + Enter 换行'
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}