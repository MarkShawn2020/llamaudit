/**
 * 智能助手侧边栏组件
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Minimize2, Maximize2, Settings, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AssistantSidebarProps } from './types';
import { MessageList } from './chat-message';
import { MessageInput, QuickQuestions } from './message-input';
import { AssistantStatus } from './floating-button';

export function AssistantSidebar({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onClearMessages,
  isLoading,
  error,
}: AssistantSidebarProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(messages.length === 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  console.log('🧩 AssistantSidebar 渲染:', {
    isOpen,
    messagesLength: messages.length,
    isLoading,
    error,
    isMinimized
  });
  
  // 监听 isOpen 变化
  useEffect(() => {
    console.log('🧩 AssistantSidebar isOpen 状态变化:', isOpen);
  }, [isOpen]);

  // 自动滚动到底部
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // 处理消息发送
  const handleSendMessage = async (message: string) => {
    setShowQuickQuestions(false);
    await onSendMessage(message);
  };

  // 快速问题列表
  const quickQuestions = [
    "这个系统有什么功能？",
    "如何进行文档审查？",
    "支持哪些文件格式？",
    "怎样创建新的数据集？",
    "如何查看分析结果？",
  ];

  // 清空对话
  const handleClearChat = () => {
    onClearMessages();
    setShowQuickQuestions(true);
  };

  // 导出对话
  const handleExportChat = () => {
    const chatText = messages
      .map(msg => `${msg.type === 'user' ? '用户' : '助手'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `智能助手对话-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    console.log('🧩 AssistantSidebar 不显示 - isOpen 为 false');
    return null;
  }
  
  console.log('🧩 AssistantSidebar 开始渲染 - isOpen 为 true');

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* 侧边栏 */}
      <div className={`
        fixed right-0 top-0 h-full z-50 bg-background border-l shadow-2xl
        transition-all duration-300 ease-in-out
        ${isMinimized ? 'w-16' : 'w-full sm:w-[400px] lg:w-[480px]'}
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* 标题栏 */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            {!isMinimized && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">AI</span>
                </div>
                <div>
                  <h2 className="font-semibold text-sm">智能助手</h2>
                  <AssistantStatus 
                    status={isLoading ? 'thinking' : error ? 'error' : 'idle'} 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-1">
              {!isMinimized && (
                <>
                  {/* 设置按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  {/* 导出对话 */}
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportChat}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}

                  {/* 清空对话 */}
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearChat}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}

              {/* 最小化/最大化按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>

              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 最小化状态 */}
          {isMinimized ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
            </div>
          ) : (
            <>
              {/* 错误提示 */}
              {error && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                  <div className="text-sm text-red-700">
                    ❌ {error}
                  </div>
                </div>
              )}

              {/* 消息区域 */}
              <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1">
                  <MessageList
                    messages={messages}
                    isLoading={isLoading}
                    showContext={true}
                  />
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* 快速问题 */}
                {showQuickQuestions && (
                  <>
                    <Separator />
                    <QuickQuestions
                      questions={quickQuestions}
                      onQuestionSelect={handleSendMessage}
                      disabled={isLoading}
                    />
                  </>
                )}

                {/* 输入区域 */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                  placeholder={
                    messages.length === 0 
                      ? "问个问题开始对话..." 
                      : "继续提问..."
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * 助手设置弹窗组件
 */
interface AssistantSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    model: string;
    temperature: number;
    maxTokens: number;
    contextEnabled: boolean;
  };
  onSettingsChange: (settings: any) => void;
}

export function AssistantSettings({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: AssistantSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className="bg-background rounded-lg p-6 w-full max-w-md border shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">助手设置</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* 模型选择 */}
          <div>
            <label className="text-sm font-medium">AI模型</label>
            <select
              value={localSettings.model}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                model: e.target.value
              })}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="claude-3-haiku">Claude 3 Haiku</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          {/* 温度设置 */}
          <div>
            <label className="text-sm font-medium">
              创造性 ({localSettings.temperature})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localSettings.temperature}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                temperature: parseFloat(e.target.value)
              })}
              className="w-full mt-1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>保守</span>
              <span>创新</span>
            </div>
          </div>

          {/* 最大令牌数 */}
          <div>
            <label className="text-sm font-medium">最大回复长度</label>
            <input
              type="number"
              min="100"
              max="4000"
              step="100"
              value={localSettings.maxTokens}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                maxTokens: parseInt(e.target.value)
              })}
              className="w-full mt-1 p-2 border rounded-md"
            />
          </div>

          {/* 上下文开关 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">显示知识来源</label>
            <input
              type="checkbox"
              checked={localSettings.contextEnabled}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                contextEnabled: e.target.checked
              })}
              className="h-4 w-4"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button onClick={handleSave} className="flex-1">
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AssistantSidebar;