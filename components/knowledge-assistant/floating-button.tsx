/**
 * 智能助手悬浮按钮组件
 */

'use client';

import React from 'react';
import { MessageSquare, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FloatingButtonProps } from './types';

export function FloatingAssistantButton({
  onClick,
  hasNotification = false,
  disabled = false,
}: FloatingButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* 主按钮 */}
        <Button
          onClick={onClick}
          disabled={disabled}
          size="lg"
          className={`
            h-14 w-14 rounded-full shadow-lg transition-all duration-200
            bg-gradient-to-r from-blue-500 to-purple-600 
            hover:from-blue-600 hover:to-purple-700
            hover:shadow-xl hover:scale-105
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
            group
          `}
        >
          <div className="relative">
            <MessageSquare className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
            
            {/* 魔法效果图标 */}
            <Sparkles 
              className={`
                absolute -top-1 -right-1 h-3 w-3 text-yellow-300
                transition-all duration-300
                ${hasNotification ? 'animate-pulse' : 'animate-ping'}
              `}
            />
          </div>
        </Button>

        {/* 通知徽章 */}
        {hasNotification && (
          <Badge 
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-bounce"
          >
            !
          </Badge>
        )}

        {/* 悬停提示 */}
        <div 
          className={`
            absolute bottom-full right-0 mb-2 px-3 py-1.5
            bg-gray-900 text-white text-sm rounded-lg
            opacity-0 pointer-events-none transition-all duration-200
            group-hover:opacity-100 group-hover:pointer-events-auto
            transform translate-y-1 group-hover:translate-y-0
          `}
        >
          智能助手
          <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>

      {/* 背景光晕效果 */}
      <div 
        className={`
          absolute inset-0 rounded-full
          bg-gradient-to-r from-blue-400 to-purple-500
          opacity-20 blur-xl transition-all duration-300
          ${hasNotification ? 'animate-pulse scale-110' : ''}
        `}
      />
    </div>
  );
}

/**
 * 助手状态指示器组件
 */
interface AssistantStatusProps {
  status: 'idle' | 'listening' | 'thinking' | 'error';
  className?: string;
}

export function AssistantStatus({ status, className = '' }: AssistantStatusProps) {
  const statusConfig = {
    idle: {
      color: 'bg-gray-400',
      label: '待命中',
      animate: false,
    },
    listening: {
      color: 'bg-blue-500',
      label: '监听中',
      animate: true,
    },
    thinking: {
      color: 'bg-yellow-500',
      label: '思考中',
      animate: true,
    },
    error: {
      color: 'bg-red-500',
      label: '出错了',
      animate: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className={`
          w-2 h-2 rounded-full ${config.color}
          ${config.animate ? 'animate-pulse' : ''}
        `}
      />
      <span className="text-xs text-muted-foreground">
        {config.label}
      </span>
    </div>
  );
}

/**
 * 助手快速操作按钮组
 */
interface QuickActionsProps {
  onAskQuestion: () => void;
  onViewHistory: () => void;
  onClearChat: () => void;
  disabled?: boolean;
}

export function AssistantQuickActions({
  onAskQuestion,
  onViewHistory,
  onClearChat,
  disabled = false,
}: QuickActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onAskQuestion}
        disabled={disabled}
        className="justify-start"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        问个问题
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewHistory}
        disabled={disabled}
        className="justify-start"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        查看历史
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearChat}
        disabled={disabled}
        className="justify-start text-red-600 hover:text-red-700"
      >
        <X className="h-4 w-4 mr-2" />
        清空对话
      </Button>
    </div>
  );
}

/**
 * 助手启动动画组件
 */
export function AssistantStartupAnimation() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse">
          <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-blue-500 animate-spin" />
          </div>
        </div>
        
        <div className="absolute -inset-4 rounded-full border-2 border-blue-300 animate-ping opacity-30" />
        <div className="absolute -inset-8 rounded-full border border-purple-300 animate-ping opacity-20" style={{ animationDelay: '0.5s' }} />
      </div>
    </div>
  );
}

/**
 * 助手波浪动画组件（用于表示正在思考）
 */
export function AssistantThinkingWave() {
  return (
    <div className="flex items-center justify-center gap-1 p-4">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );
}

export default FloatingAssistantButton;