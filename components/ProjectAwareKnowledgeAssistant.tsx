/**
 * 项目上下文感知的智能助手组件
 * 根据当前项目获取对应的知识库配置
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { KnowledgeAssistant } from '@/components/knowledge-assistant';
import { AssistantConfig } from '@/components/knowledge-assistant/types';

interface ProjectConfigResponse {
  config: AssistantConfig;
  project: {
    id: string;
    name: string;
    datasetId: string;
  };
  status: string;
}

interface ConfigValidationResponse {
  valid: boolean;
  issues?: string[];
  error?: string;
  project?: {
    id: string;
    name: string;
    hasDataset: boolean;
  };
}

export function ProjectAwareKnowledgeAssistant() {
  const pathname = usePathname();
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projectInfo, setProjectInfo] = useState<{ id: string; name: string } | null>(null);

  // 提取项目ID从URL
  const getProjectIdFromPath = (path: string): string | null => {
    const projectMatch = path.match(/\/projects\/([^\/]+)/);
    return projectMatch ? projectMatch[1] : null;
  };

  // 获取项目配置
  const loadProjectConfig = async (projectId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assistant/config?projectId=${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `配置获取失败: ${response.status}`);
      }

      const data: ProjectConfigResponse = await response.json();
      setConfig(data.config);
      setProjectInfo({
        id: data.project.id,
        name: data.project.name,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '配置加载失败';
      setError(errorMessage);
      console.error('Project config loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 监听路径变化
  useEffect(() => {
    const projectId = getProjectIdFromPath(pathname);
    
    if (projectId) {
      loadProjectConfig(projectId);
    } else {
      // 不在项目页面，清除配置
      setConfig(null);
      setError(null);
      setProjectInfo(null);
    }
  }, [pathname]);

  // 不在项目页面时不显示
  const projectId = getProjectIdFromPath(pathname);
  if (!projectId) {
    return null;
  }

  // 加载中状态
  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 z-50 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-blue-700">正在加载智能助手...</span>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
        <div className="font-medium text-red-800 mb-1">智能助手配置错误</div>
        <div className="text-sm text-red-700 mb-2">{error}</div>
        {projectInfo && (
          <div className="text-xs text-red-600">
            项目：{projectInfo.name}
          </div>
        )}
        <button
          onClick={() => loadProjectConfig(projectId)}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          重试
        </button>
      </div>
    );
  }

  // 配置无效时不渲染
  if (!config) {
    return null;
  }

  // 渲染智能助手
  return (
    <div className="project-aware-knowledge-assistant">
      <KnowledgeAssistant config={config} />
      
      {/* 开发模式下显示项目信息 */}
      {process.env.NODE_ENV === 'development' && projectInfo && (
        <div className="fixed top-4 right-4 max-w-xs p-2 bg-gray-900/50 text-green-400 rounded text-xs font-mono z-[9999]">
          <div className="font-bold mb-1">智能助手状态</div>
          <div>项目: {projectInfo.name}</div>
          <div>数据集: {config.datasetId}</div>
          <div>AI模型: {config.aiModel}</div>
        </div>
      )}
    </div>
  );
}

/**
 * 简化版项目感知助手（只在项目页面显示）
 */
export function SimpleProjectAwareAssistant() {
  const pathname = usePathname();
  
  // 检查是否在项目页面
  const isProjectPage = /\/projects\/[^\/]+/.test(pathname);
  
  if (!isProjectPage) {
    return null;
  }

  return <ProjectAwareKnowledgeAssistant />;
}

/**
 * 配置验证Hook
 */
export function useAssistantConfigValidation(projectId: string | null) {
  const [validation, setValidation] = useState<ConfigValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateConfig = async () => {
    if (!projectId) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch('/api/assistant/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data: ConfigValidationResponse = await response.json();
      setValidation(data);
    } catch (error) {
      setValidation({
        valid: false,
        error: '配置验证失败',
      });
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    validateConfig();
  }, [projectId]);

  return {
    validation,
    isValidating,
    revalidate: validateConfig,
  };
}