/**
 * 消息输入组件
 */

'use client';

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Mic, MicOff, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageInputProps } from './types';

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = '输入您的问题...',
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整文本框高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  // 处理消息发送
  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');
    
    // 重置文本框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, disabled, onSendMessage]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // 处理输入变化
  const handleInputChange = useCallback((value: string) => {
    setMessage(value);
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  // 语音记录切换
  const toggleRecording = useCallback(() => {
    setIsRecording(!isRecording);
    // TODO: 实现语音录制功能
  }, [isRecording]);

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2">
        {/* 附件按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 flex-shrink-0"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* 输入框容器 */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-[120px] resize-none pr-12 py-2"
            rows={1}
          />
          
          {/* 表情按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            disabled={disabled}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        {/* 语音按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 w-9 p-0 flex-shrink-0 ${isRecording ? 'text-red-500' : ''}`}
          onClick={toggleRecording}
          disabled={disabled}
        >
          {isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        {/* 发送按钮 */}
        <Button
          onClick={handleSendMessage}
          disabled={disabled || !message.trim()}
          size="sm"
          className="h-9 w-9 p-0 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* 语音录制指示器 */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          正在录制语音...
        </div>
      )}

      {/* 输入提示 */}
      <div className="mt-2 text-xs text-muted-foreground">
        按 Enter 发送，Shift + Enter 换行
      </div>
    </div>
  );
}

/**
 * 快速问题建议组件
 */
interface QuickQuestionsProps {
  questions: string[];
  onQuestionSelect: (question: string) => void;
  disabled?: boolean;
}

export function QuickQuestions({ 
  questions, 
  onQuestionSelect, 
  disabled = false 
}: QuickQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="p-4 border-t bg-muted/30">
      <div className="text-xs text-muted-foreground mb-2">
        常见问题：
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onQuestionSelect(question)}
            disabled={disabled}
            className="text-xs h-7 px-2"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * 输入状态指示器
 */
interface InputStatusProps {
  status: 'idle' | 'typing' | 'sending' | 'error';
  message?: string;
}

export function InputStatus({ status, message }: InputStatusProps) {
  const statusConfig = {
    idle: {
      color: 'text-muted-foreground',
      text: '输入消息...',
    },
    typing: {
      color: 'text-blue-600',
      text: '正在输入...',
    },
    sending: {
      color: 'text-green-600',
      text: '发送中...',
    },
    error: {
      color: 'text-red-600',
      text: message || '发送失败',
    },
  };

  const config = statusConfig[status];

  if (status === 'idle') return null;

  return (
    <div className={`text-xs ${config.color} px-4 pb-2`}>
      {config.text}
    </div>
  );
}

/**
 * 消息建议自动完成组件
 */
interface MessageSuggestionsProps {
  suggestions: string[];
  onSuggestionSelect: (suggestion: string) => void;
  visible: boolean;
}

export function MessageSuggestions({ 
  suggestions, 
  onSuggestionSelect, 
  visible 
}: MessageSuggestionsProps) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 bg-background border border-border rounded-t-lg shadow-lg max-h-40 overflow-y-auto">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionSelect(suggestion)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

/**
 * 文件上传区域组件
 */
interface FileUploadAreaProps {
  onFileSelect: (files: FileList) => void;
  disabled?: boolean;
  acceptedTypes?: string;
}

export function FileUploadArea({ 
  onFileSelect, 
  disabled = false,
  acceptedTypes = ".txt,.pdf,.doc,.docx,.md" 
}: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        multiple
        onChange={handleFileInput}
        disabled={disabled}
        className="hidden"
      />
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Paperclip className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          点击或拖拽文件到此处上传
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          支持 TXT, PDF, DOC, MD 等格式
        </p>
      </div>
    </>
  );
}

export default MessageInput;