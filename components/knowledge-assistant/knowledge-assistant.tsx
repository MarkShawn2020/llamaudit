/**
 * 智能问答助手主组件
 */

'use client';

import React, { useMemo } from 'react';
import { FloatingAssistantButton } from './floating-button';
import { AssistantSidebar } from './assistant-sidebar';
import { AssistantConfig } from './types';
import { useKnowledgeAssistant, useAssistantConfig } from '@/hooks/use-knowledge-assistant';

interface KnowledgeAssistantProps {
  config?: Partial<AssistantConfig>;
  disabled?: boolean;
  className?: string;
}

export function KnowledgeAssistant({ 
  config: configOverrides = {},
  disabled = false,
  className = '',
}: KnowledgeAssistantProps) {
  // 配置管理
  const { config, validateConfig } = useAssistantConfig(configOverrides);
  
  // 验证配置
  const configValidation = useMemo(() => validateConfig(), [validateConfig]);
  
  // 主要助手逻辑
  const assistant = useKnowledgeAssistant(config);

  // 如果配置无效，显示错误
  if (!configValidation.isValid) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <h4 className="text-red-800 font-medium mb-2">配置错误</h4>
          <ul className="text-red-700 text-sm space-y-1">
            {configValidation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 悬浮按钮 */}
      <FloatingAssistantButton
        onClick={assistant.openAssistant}
        hasNotification={false}
        disabled={disabled || assistant.isLoading}
      />

      {/* 助手侧边栏 */}
      <AssistantSidebar
        isOpen={assistant.isOpen}
        onClose={assistant.closeAssistant}
        projectId={config.projectId}
      />
    </div>
  );
}

/**
 * 预配置的智能助手组件（用于快速集成）
 */
export function SimpleKnowledgeAssistant() {
  // 使用环境变量中的默认配置
  const defaultConfig: Partial<AssistantConfig> = useMemo(() => ({
    datasetId: process.env.NEXT_PUBLIC_DIFY_DATASET_ID,
    difyApiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY,
    difyBaseUrl: process.env.NEXT_PUBLIC_DIFY_BASE_URL || 'https://api.dify.ai',
    openRouterApiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
    aiModel: 'claude-3-haiku',
    maxContextLength: 4000,
    retrievalTopK: 5,
    scoreThreshold: 0.3,
  }), []);

  return <KnowledgeAssistant config={defaultConfig} />;
}

/**
 * 带调试信息的智能助手组件
 */
interface DebugKnowledgeAssistantProps extends KnowledgeAssistantProps {
  showDebugInfo?: boolean;
}

export function DebugKnowledgeAssistant({ 
  showDebugInfo = false,
  ...props 
}: DebugKnowledgeAssistantProps) {
  const { config } = useAssistantConfig(props.config || {});
  const assistant = useKnowledgeAssistant(config);

  return (
    <>
      <KnowledgeAssistant {...props} />
      
      {/* 调试信息面板 */}
      {showDebugInfo && (
        <div className="fixed bottom-6 left-6 z-40 bg-black/80 text-white rounded-lg p-4 max-w-xs">
          <h4 className="font-medium mb-2">调试信息</h4>
          <div className="text-xs space-y-1">
            <div>状态: {assistant.isOpen ? '打开' : '关闭'}</div>
            <div>消息数: {assistant.messages.length}</div>
            <div>加载中: {assistant.isLoading ? '是' : '否'}</div>
            <div>错误: {assistant.error || '无'}</div>
            <div>数据集: {config.datasetId?.slice(0, 8)}...</div>
            <div>模型: {config.aiModel}</div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 智能助手上下文提供者（用于跨组件共享状态）
 */
import { createContext, useContext } from 'react';

interface KnowledgeAssistantContextType {
  assistant: ReturnType<typeof useKnowledgeAssistant>;
  config: AssistantConfig;
}

const KnowledgeAssistantContext = createContext<KnowledgeAssistantContextType | null>(null);

export function KnowledgeAssistantProvider({ 
  children, 
  config: configOverrides = {} 
}: {
  children: React.ReactNode;
  config?: Partial<AssistantConfig>;
}) {
  const { config } = useAssistantConfig(configOverrides);
  const assistant = useKnowledgeAssistant(config);

  const value = useMemo(() => ({
    assistant,
    config,
  }), [assistant, config]);

  return (
    <KnowledgeAssistantContext.Provider value={value}>
      {children}
    </KnowledgeAssistantContext.Provider>
  );
}

export function useKnowledgeAssistantContext() {
  const context = useContext(KnowledgeAssistantContext);
  if (!context) {
    throw new Error('useKnowledgeAssistantContext must be used within KnowledgeAssistantProvider');
  }
  return context;
}

/**
 * 智能助手触发器组件（用于在其他地方触发助手）
 */
interface AssistantTriggerProps {
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function AssistantTrigger({ 
  children, 
  message, 
  className = '' 
}: AssistantTriggerProps) {
  const { assistant } = useKnowledgeAssistantContext();

  const handleClick = async () => {
    assistant.openAssistant();
    if (message) {
      // 等待助手打开后发送消息
      setTimeout(() => {
        assistant.sendMessage(message);
      }, 100);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * 智能助手状态指示器
 */
export function AssistantStatusIndicator({ className = '' }: { className?: string }) {
  const { assistant } = useKnowledgeAssistantContext();

  if (!assistant.isOpen) return null;

  return (
    <div className={`fixed top-4 right-4 z-40 ${className}`}>
      <div className="bg-background border rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            assistant.isLoading 
              ? 'bg-yellow-500 animate-pulse' 
              : assistant.error 
                ? 'bg-red-500' 
                : 'bg-green-500'
          }`} />
          <span className="text-sm">
            {assistant.isLoading ? '思考中...' : 
             assistant.error ? '出错了' : 
             '助手在线'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeAssistant;