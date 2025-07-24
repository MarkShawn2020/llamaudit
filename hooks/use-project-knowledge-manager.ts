/**
 * 统一的项目知识库管理服务
 * 防止重复初始化，提供全局状态管理和错误处理
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { updateProjectDatasetId } from '@/lib/api/project-api';

interface ProjectInitializationState {
  isInitializing: boolean;
  lastAttempt?: number;
  error?: string;
}

class ProjectKnowledgeManager {
  private static instance: ProjectKnowledgeManager;
  private initializingProjects = new Map<string, ProjectInitializationState>();
  private listeners = new Set<() => void>();

  static getInstance(): ProjectKnowledgeManager {
    if (!ProjectKnowledgeManager.instance) {
      ProjectKnowledgeManager.instance = new ProjectKnowledgeManager();
    }
    return ProjectKnowledgeManager.instance;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  getProjectState(projectId: string): ProjectInitializationState {
    return this.initializingProjects.get(projectId) || { isInitializing: false };
  }

  private setProjectState(projectId: string, state: ProjectInitializationState) {
    this.initializingProjects.set(projectId, state);
    this.notify();
  }

  async ensureProjectKnowledgeBase(
    projectId: string, 
    projectName: string,
    options: {
      showToast?: boolean;
      source?: string;
    } = {}
  ): Promise<string | null> {
    const { showToast = true, source = 'unknown' } = options;
    
    console.log(`🔧 [${source}] 开始确保项目知识库:`, { projectId, projectName });

    // 检查是否已在初始化中
    const currentState = this.getProjectState(projectId);
    if (currentState.isInitializing) {
      console.log(`⏳ [${source}] 项目 ${projectId} 已在初始化中，等待完成...`);
      return this.waitForInitialization(projectId);
    }

    // 检查是否刚刚失败过（避免频繁重试）
    const now = Date.now();
    if (currentState.lastAttempt && (now - currentState.lastAttempt) < 30000) {
      console.log(`⏸️ [${source}] 项目 ${projectId} 30秒内已尝试过，跳过重复初始化`);
      return null;
    }

    // 开始初始化
    this.setProjectState(projectId, {
      isInitializing: true,
      lastAttempt: now,
    });

    if (showToast) {
      toast.info('正在初始化项目知识库...', {
        description: `[${source}] 首次访问需要创建知识库，请稍候`,
        duration: 3000
      });
    }

    try {
      // 创建知识库
      const datasetId = await createDatasetViaAPI(projectId, projectName);

      if (datasetId) {
        // 更新项目关联
        await updateProjectDatasetId(projectId, datasetId);
        
        console.log(`✅ [${source}] 项目知识库初始化成功:`, { projectId, datasetId });
        
        if (showToast) {
          toast.success('知识库初始化完成！', {
            description: '现在可以上传文档并使用智能助手功能',
            duration: 4000
          });
        }

        // 标记完成
        this.setProjectState(projectId, {
          isInitializing: false,
          lastAttempt: now,
        });

        return datasetId;
      }

      throw new Error('知识库创建失败：未返回数据集ID');

    } catch (error) {
      console.error(`❌ [${source}] 项目知识库初始化失败:`, error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 标记失败
      this.setProjectState(projectId, {
        isInitializing: false,
        lastAttempt: now,
        error: errorMessage,
      });

      if (showToast) {
        if (errorMessage.includes('already exists')) {
          toast.warning('知识库名称冲突', {
            description: '已自动使用备用名称重试...',
            duration: 5000
          });
        } else {
          toast.error('知识库初始化失败', {
            description: errorMessage,
            duration: 8000
          });
        }
      }

      return null;
    }
  }

  private async waitForInitialization(projectId: string): Promise<string | null> {
    return new Promise((resolve) => {
      const checkState = () => {
        const state = this.getProjectState(projectId);
        if (!state.isInitializing) {
          resolve(state.error ? null : 'completed');
        } else {
          setTimeout(checkState, 1000);
        }
      };
      checkState();
    });
  }

  clearProjectState(projectId: string) {
    this.initializingProjects.delete(projectId);
    this.notify();
  }
}

// 使用服务器端API创建数据集的函数
async function createDatasetViaAPI(projectId: string, projectName: string): Promise<string> {
  // 使用改进的命名策略确保唯一性
  const uniqueDatasetName = `proj-${projectId.slice(0, 8)}-${projectName}-kb`;
  const fallbackDatasetName = `proj-${projectId}-kb-${Date.now()}`;

  try {
    // 尝试使用主要名称创建
    const response = await fetch(`/api/projects/${projectId}/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: uniqueDatasetName,
        description: `项目"${projectName}"的专用知识库（ID: ${projectId}）`,
        indexing_technique: 'high_quality',
        permission: 'only_me',
      }),
    });

    if (response.ok) {
      const dataset = await response.json();
      return dataset.id;
    }

    // 处理命名冲突错误
    if (response.status === 409) {
      console.warn(`知识库名称 ${uniqueDatasetName} 冲突，尝试后备名称 ${fallbackDatasetName}`);
      
      const fallbackResponse = await fetch(`/api/projects/${projectId}/datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fallbackDatasetName,
          description: `项目"${projectName}"的专用知识库（ID: ${projectId}）`,
          indexing_technique: 'high_quality',
          permission: 'only_me',
        }),
      });

      if (fallbackResponse.ok) {
        const dataset = await fallbackResponse.json();
        return dataset.id;
      }

      const fallbackError = await fallbackResponse.text();
      throw new Error(`使用后备名称创建也失败: ${fallbackError}`);
    }

    // 处理其他错误
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(errorData.error || `数据集创建失败: ${response.status}`);
    
  } catch (error) {
    console.error('数据集创建失败:', error);
    
    // 提供更友好的错误信息
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络连接');
      }
      throw error;
    }
    
    throw new Error('数据集创建过程中发生未知错误');
  }
}

/**
 * 使用统一项目知识库管理器的Hook
 */
export function useProjectKnowledgeManager() {
  const managerRef = useRef<ProjectKnowledgeManager | undefined>(undefined);
  const [, forceUpdate] = useState<object>({});

  // 获取管理器实例
  if (!managerRef.current) {
    managerRef.current = ProjectKnowledgeManager.getInstance();
  }

  const manager = managerRef.current;

  // 订阅状态变化
  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      forceUpdate({});
    });
    return () => {
      unsubscribe();
    };
  }, [manager]);

  const ensureKnowledgeBase = useCallback(
    async (projectId: string, projectName: string, options?: { showToast?: boolean; source?: string }) => {
      return await manager.ensureProjectKnowledgeBase(projectId, projectName, options);
    },
    [manager]
  );

  const getProjectState = useCallback(
    (projectId: string) => manager.getProjectState(projectId),
    [manager]
  );

  const clearProjectState = useCallback(
    (projectId: string) => manager.clearProjectState(projectId),
    [manager]
  );

  return {
    ensureKnowledgeBase,
    getProjectState,
    clearProjectState,
  };
}

/**
 * 专门用于组件的简化Hook
 */
export function useEnsureProjectKnowledgeBase(projectId: string, projectName: string, source = 'component') {
  const { ensureKnowledgeBase, getProjectState } = useProjectKnowledgeManager();
  
  const ensureKB = useCallback(async () => {
    if (!projectId || !projectName) return null;
    return await ensureKnowledgeBase(projectId, projectName, { 
      showToast: true, 
      source 
    });
  }, [projectId, projectName, source, ensureKnowledgeBase]);

  const state = getProjectState(projectId);

  return {
    ensureKnowledgeBase: ensureKB,
    isInitializing: state.isInitializing,
    error: state.error,
  };
}