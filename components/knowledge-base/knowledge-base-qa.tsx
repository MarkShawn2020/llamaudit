'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, MessageSquare, FileText, Clock, Brain, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { queryKnowledgeBase, getQaHistory } from '@/lib/actions/knowledge-base-actions';
import { QaConversation } from '@/lib/db/schema';

interface KnowledgeBaseQAProps {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
}

interface QAMessage {
  id: string;
  type: 'question' | 'answer';
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
}

export function KnowledgeBaseQA({ knowledgeBaseId, knowledgeBaseName }: KnowledgeBaseQAProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [history, setHistory] = useState<QaConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到消息底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 加载问答历史
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const result = await getQaHistory(knowledgeBaseId, 10, 0);
      if (result.success && result.data) {
        setHistory(result.data);
        // 将历史记录转换为消息格式
        const historyMessages: QAMessage[] = [];
        result.data.reverse().forEach((qa) => {
          historyMessages.push({
            id: `${qa.id}-q`,
            type: 'question',
            content: qa.question,
            timestamp: new Date(qa.createdAt!)
          });
          if (qa.answer) {
            historyMessages.push({
              id: `${qa.id}-a`,
              type: 'answer',
              content: qa.answer,
              sources: qa.sources as any,
              confidence: qa.confidence || undefined,
              responseTime: qa.responseTime || undefined,
              timestamp: new Date(qa.createdAt!)
            });
          }
        });
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Error loading QA history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [knowledgeBaseId]);

  // 处理问答
  const handleAsk = async () => {
    const question = currentQuestion.trim();
    if (!question || isAsking) return;

    const questionMessage: QAMessage = {
      id: `q-${Date.now()}`,
      type: 'question',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, questionMessage]);
    setCurrentQuestion('');
    setIsAsking(true);

    try {
      const result = await queryKnowledgeBase({
        knowledgeBaseId,
        question,
        topK: 5,
        scoreThreshold: 0.3
      });

      if (result.success && result.data) {
        const answerMessage: QAMessage = {
          id: `a-${Date.now()}`,
          type: 'answer',
          content: result.data.answer || '抱歉，我无法基于现有知识库内容回答您的问题。',
          sources: result.data.retrievalResult?.records,
          confidence: result.data.confidence,
          responseTime: result.data.responseTime,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, answerMessage]);
        toast.success('问答完成');
      } else {
        toast.error(result.error || '问答失败');
        const errorMessage: QAMessage = {
          id: `a-${Date.now()}`,
          type: 'answer',
          content: '抱歉，问答失败，请稍后重试。',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error asking question:', error);
      toast.error('问答失败');
      const errorMessage: QAMessage = {
        id: `a-${Date.now()}`,
        type: 'answer',
        content: '抱歉，系统出现错误，请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
      inputRef.current?.focus();
    }
  };

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  // 格式化置信度
  const formatConfidence = (confidence?: number) => {
    if (!confidence) return null;
    const percentage = Math.round(confidence * 100);
    const variant = percentage >= 80 ? 'default' : percentage >= 60 ? 'secondary' : 'outline';
    return <Badge variant={variant}>置信度: {percentage}%</Badge>;
  };

  // 格式化响应时间
  const formatResponseTime = (time?: number) => {
    if (!time) return null;
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {time.toFixed(2)}s
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          知识库问答
        </CardTitle>
        <CardDescription>
          与 "{knowledgeBaseName}" 知识库进行智能对话
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-0">
        <ScrollArea className="flex-1 px-6">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载历史记录...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">开始知识库问答</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                向知识库提问，我会基于已上传的文档为您提供准确的答案
              </p>
              <div className="text-sm text-muted-foreground">
                <p>💡 提示：问题越具体，答案越准确</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'question' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${message.type === 'question' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                    <div className="space-y-2">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.type === 'answer' && (
                        <div className="space-y-2">
                          {/* 置信度和响应时间 */}
                          <div className="flex items-center gap-2">
                            {formatConfidence(message.confidence)}
                            {formatResponseTime(message.responseTime)}
                          </div>
                          
                          {/* 引用来源 */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <Separator />
                              <div className="text-xs font-medium flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                引用来源 ({message.sources.length})
                              </div>
                              <div className="space-y-2">
                                {message.sources.slice(0, 3).map((source, index) => (
                                  <div key={index} className="bg-background/50 rounded p-2 text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium truncate">{source.title}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {Math.round(source.score * 100)}%
                                      </Badge>
                                    </div>
                                    <p className="text-muted-foreground line-clamp-2">
                                      {source.content}
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
              {isAsking && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在思考中...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        <div className="px-6 pb-6">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="输入您的问题..."
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isAsking}
              className="flex-1"
            />
            <Button onClick={handleAsk} disabled={isAsking || !currentQuestion.trim()}>
              {isAsking ? (
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
      </CardContent>
    </Card>
  );
}