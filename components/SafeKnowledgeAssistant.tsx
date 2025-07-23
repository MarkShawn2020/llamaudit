/**
 * 安全的智能助手组件
 * 带有错误处理和配置验证的智能助手包装器
 */

'use client';

import { useEffect, useState } from 'react';
import { useDifyConfig } from '@/contexts/dify-config-context';
import { SimpleKnowledgeAssistant } from '@/components/knowledge-assistant';
import { adaptDifyConfigToAssistantConfig, validateAssistantConfig } from '@/lib/assistant-config-adapter';
import { AssistantConfig } from '@/components/knowledge-assistant/types';

export function SafeKnowledgeAssistant() {
  const { config: difyConfig } = useDifyConfig();
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(false);

  useEffect(() => {
    try {
      // 转换配置
      const adaptedConfig = adaptDifyConfigToAssistantConfig(difyConfig);
      
      // 验证配置
      const validation = validateAssistantConfig(adaptedConfig);
      
      if (validation.isValid) {
        setAssistantConfig(adaptedConfig);
        setIsConfigValid(true);
        setError(null);
      } else {
        setError(`智能助手配置不完整: ${validation.errors.join(', ')}`);
        setIsConfigValid(false);
        console.warn('智能助手配置问题:', validation.errors);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '智能助手配置错误';
      setError(errorMessage);
      setIsConfigValid(false);
      console.error('智能助手配置错误:', err);
    }
  }, [difyConfig]);

  // 开发模式下显示配置状态
  if (process.env.NODE_ENV === 'development' && error) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 max-w-sm p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg"
        style={{ fontSize: '12px' }}
      >
        <div className="font-medium text-yellow-800 mb-1">智能助手配置问题</div>
        <div className="text-yellow-700">{error}</div>
        <div className="mt-2 text-xs text-yellow-600">
          请检查环境变量配置后重启开发服务器
        </div>
      </div>
    );
  }

  // 配置无效时不渲染
  if (!isConfigValid || !assistantConfig) {
    return null;
  }

  // 渲染智能助手
  return (
    <div className="safe-knowledge-assistant">
      <SimpleKnowledgeAssistant />
    </div>
  );
}

/**
 * 调试用的智能助手状态显示组件
 */
export function KnowledgeAssistantDebugInfo() {
  const { config: difyConfig } = useDifyConfig();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    try {
      const adaptedConfig = adaptDifyConfigToAssistantConfig(difyConfig);
      const validation = validateAssistantConfig(adaptedConfig);
      
      setDebugInfo({
        difyConfig,
        adaptedConfig,
        validation,
        env: {
          DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? '***已配置' : '未配置',
          DIFY_DATASET_API_KEY: process.env.DIFY_DATASET_API_KEY ? '***已配置' : '未配置',
          NEXT_PUBLIC_DIFY_API_URL: process.env.NEXT_PUBLIC_DIFY_API_URL,
        }
      });
    } catch (err) {
      setDebugInfo({ error: err });
    }
  }, [difyConfig]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 max-w-md p-3 bg-gray-900 text-green-400 rounded-lg shadow-lg font-mono text-xs max-h-96 overflow-y-auto">
      <div className="font-bold mb-2">智能助手调试信息</div>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}