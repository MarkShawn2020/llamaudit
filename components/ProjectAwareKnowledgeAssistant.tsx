/**
 * 项目上下文感知的智能助手组件
 * 接收项目数据作为props，避免重复的URL解析和数据获取
 */

'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AssistantConfig} from '@/components/knowledge-assistant/types';
import {useAssistantConfig, useKnowledgeAssistant} from '@/hooks/use-knowledge-assistant';
import {FloatingAssistantButton} from '@/components/knowledge-assistant/floating-button';
import {AssistantSidebar} from '@/components/knowledge-assistant/assistant-sidebar';
import {Project} from '@/lib/actions/project-actions';

interface ProjectConfigResponse {
    config: AssistantConfig;
    project: {
        id: string;
        name: string;
        datasetId: string;
    };
    status: string;
}

interface ProjectAwareKnowledgeAssistantProps {
    project: Project;
}

export const ProjectAwareKnowledgeAssistant = React.memo(function ProjectAwareKnowledgeAssistant({project}: ProjectAwareKnowledgeAssistantProps) {
    // 简化状态：只有助手状态（当dataset就绪时）
    const [assistantState, setAssistantState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [config, setConfig] = useState<AssistantConfig | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 数据集状态：只有两种情况
    const datasetStatus = useMemo(() => {
        return project.datasetId ? 'ready' : 'creating';
    }, [project.datasetId]);

    // 加载助手配置
    const loadAssistantConfig = useCallback(async () => {
        setAssistantState('loading');
        setError(null);

        try {
            const response = await fetch(`/api/assistant/config?projectId=${project.id}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: `HTTP ${response.status}`}));
                throw new Error(errorData.error || `配置获取失败: ${response.status}`);
            }

            const data: ProjectConfigResponse = await response.json();
            setConfig(data.config);
            setAssistantState('ready');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '配置加载失败';
            setError(errorMessage);
            setAssistantState('error');
        }
    }, [project.id]);

    // 数据集创建中，助手不可用
    if (datasetStatus === 'creating') {
        return (
            <div className="fixed bottom-4 right-4 z-50 p-3 bg-amber-50 border border-amber-200 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-amber-700">知识库创建中...</span>
                </div>
            </div>
        );
    }

    // 数据集已就绪，根据助手状态渲染
    switch (assistantState) {
        case 'idle':
            return (
                <FloatingAssistantButton
                    onClick={loadAssistantConfig}
                    hasNotification={false}
                    disabled={false}
                />
            );
        
        case 'loading':
            return (
                <div className="fixed bottom-4 right-4 z-50 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-blue-700">助手加载中...</span>
                    </div>
                </div>
            );
        
        case 'error':
            return (
                <div className="fixed bottom-4 right-4 z-50 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
                    <div className="text-sm text-red-700 mb-2">{error}</div>
                    <button 
                        onClick={loadAssistantConfig} 
                        className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                        重试
                    </button>
                </div>
            );
        
        case 'ready':
            if (!config) return null;
            return <DiagnosticKnowledgeAssistant config={config} project={project} />;
        
        default:
            return null;
    }
});

/**
 * 简化版项目感知助手（需要项目数据）
 * @deprecated 建议直接使用 ProjectAwareKnowledgeAssistant 并传入项目数据
 */
export function SimpleProjectAwareAssistant({project}: {project?: Project}) {
    if (!project) {
        return null;
    }

    return <ProjectAwareKnowledgeAssistant project={project} />;
}

/**
 * 诊断版智能助手组件 - 增强调试版本
 */
const DiagnosticKnowledgeAssistant = React.memo(function DiagnosticKnowledgeAssistant({config, project}: { config: AssistantConfig; project: Project }) {
    // 渲染计数器 - 仅开发环境
    const renderCountRef = useRef(0);
    if (process.env.NODE_ENV === 'development') {
        renderCountRef.current += 1;
    }

    // 配置管理 - 使用memoization优化
    const {config: processedConfig, validateConfig} = useAssistantConfig(config);
    
    // 使用useMemo稳定配置验证结果
    const configValidation = useMemo(() => {
        return validateConfig();
    }, [validateConfig]);

    // 主要助手逻辑 - 使用稳定的processedConfig
    const assistant = useKnowledgeAssistant(processedConfig);

    // 调试信息 - 仅在开发环境收集
    const debugInfo = useMemo(() => {
        if (process.env.NODE_ENV !== 'development') return null;
        
        return {
            renderCount: renderCountRef.current,
            projectId: project.id,
            configValid: configValidation.isValid,
            assistantState: {
                isOpen: assistant.isOpen,
                messagesLength: assistant.messages.length,
                isLoading: assistant.isLoading,
                hasError: !!assistant.error,
            }
        };
    }, [
        project.id,
        configValidation.isValid,
        assistant.isOpen,
        assistant.messages.length,
        assistant.isLoading,
        assistant.error
    ]);

    // 开发环境调试日志 - 仅在重要状态变化时输出
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && debugInfo) {
            console.group(`🤖 [智能助手 #${debugInfo.renderCount}] ${project.name}`);
            console.log('📊 状态:', debugInfo.assistantState);
            console.log('🔧 配置有效:', debugInfo.configValid);
            console.groupEnd();
        }
    }, [debugInfo, project.name]);

    // 如果配置无效，显示详细的错误信息和诊断按钮
    if (!configValidation.isValid) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
                    <h4 className="text-red-800 font-medium mb-2">🚨 配置验证失败</h4>
                    <ul className="text-red-700 text-sm space-y-1 mb-3">
                        {configValidation.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                        ))}
                    </ul>

                    {/* 开发模式下显示详细调试信息 */}
                    {process.env.NODE_ENV === 'development' && (
                        <details className="mb-3">
                            <summary className="cursor-pointer text-red-600 text-xs font-mono">
                                调试信息
                            </summary>
                            <pre className="mt-2 text-[10px] bg-red-100 p-2 rounded overflow-auto max-h-40">
                                {JSON.stringify(debugInfo, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            </div>
        );
    }

    // 正常渲染智能助手
    return (
        <div className="diagnostic-knowledge-assistant">
            {/* 悬浮按钮 */}
            <FloatingAssistantButton
                onClick={assistant.openAssistant}
                hasNotification={false}
                disabled={assistant.isLoading}
            />

            {/* 助手侧边栏 */}
            <AssistantSidebar
                isOpen={assistant.isOpen}
                onClose={assistant.closeAssistant}
                projectId={project.id}
            />

            {/* 开发模式的简化调试面板 */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="fixed bottom-6 left-6 z-40 max-w-xs p-3 bg-blue-900 text-blue-100 rounded text-xs font-mono">
                    <div className="font-bold mb-2">🐛 助手调试 #{debugInfo.renderCount}</div>
                    <div className="space-y-1">
                        <div>状态: {assistant.isOpen ? '🟢 打开' : '⚫ 关闭'}</div>
                        <div>消息: {assistant.messages.length}</div>
                        <div>配置: {configValidation.isValid ? '✅' : '❌'}</div>
                        {assistant.error && <div className="text-red-300">错误: {assistant.error}</div>}
                    </div>
                    
                    <button
                        onClick={assistant.isOpen ? assistant.closeAssistant : assistant.openAssistant}
                        className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs w-full"
                    >
                        {assistant.isOpen ? '关闭' : '打开'} 助手
                    </button>
                </div>
            )}
        </div>
    );
});
