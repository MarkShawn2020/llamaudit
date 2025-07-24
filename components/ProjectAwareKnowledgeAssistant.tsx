/**
 * 项目上下文感知的智能助手组件
 * 接收项目数据作为props，避免重复的URL解析和数据获取
 */

'use client';

import {useEffect, useMemo, useState} from 'react';
import {AssistantConfig} from '@/components/knowledge-assistant/types';
import {useAssistantConfig, useKnowledgeAssistant} from '@/hooks/use-knowledge-assistant';
import {FloatingAssistantButton} from '@/components/knowledge-assistant/floating-button';
import {AssistantSidebar} from '@/components/knowledge-assistant/assistant-sidebar';
import {updateProjectDatasetId} from '@/lib/api/project-api';
import {useProjectDataset} from "@/hooks/use-dify-dataset-server";
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

export function ProjectAwareKnowledgeAssistant({project}: ProjectAwareKnowledgeAssistantProps) {
    const [config, setConfig] = useState<AssistantConfig | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAutoFixing, setIsAutoFixing] = useState(false);

    // 知识库管理 - 直接使用传入的项目数据
    const datasetManager = useProjectDataset(project.id, project.name);

    // 自动修复知识库关联问题
    const autoFixKnowledgeBase = async () => {
        console.log('🔧 开始自动修复知识库关联:', { projectId: project.id, projectName: project.name });
        setIsAutoFixing(true);
        setError(null);

        try {
            // 创建知识库
            const datasetId = await datasetManager.ensureDataset(undefined);
            console.log('✅ 知识库创建成功:', datasetId);

            // 更新项目关联
            if (datasetId) {
                await updateProjectDatasetId(project.id, datasetId);
                console.log('✅ 项目知识库关联更新成功');
            } else {
                throw new Error('知识库创建失败');
            }

            // 重新加载配置
            await loadProjectConfig();
            
        } catch (error) {
            console.error('❌ 自动修复失败:', error);
            const errorMessage = error instanceof Error ? error.message : '自动修复失败';
            setError(`自动修复失败: ${errorMessage}`);
        } finally {
            setIsAutoFixing(false);
        }
    };

    // 获取项目配置
    const loadProjectConfig = async () => {
        console.log('🔄 开始加载项目配置:', project.id);
        setIsLoading(true);
        setError(null);

        try {
            const url = `/api/assistant/config?projectId=${project.id}`;
            console.log('📡 请求URL:', url);

            const response = await fetch(url);
            console.log('📥 响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: `HTTP ${response.status}`}));
                console.error('❌ API错误响应:', errorData);
                
                // 检查是否是知识库未关联的错误，如果是则尝试自动修复
                if (errorData.error?.includes('项目未关联知识库')) {
                    console.log('🔧 检测到知识库未关联，尝试自动修复...');
                    setIsLoading(false); // 先关闭加载状态
                    await autoFixKnowledgeBase();
                    return; // 自动修复会重新调用loadProjectConfig
                }
                
                throw new Error(errorData.error || `配置获取失败: ${response.status}`);
            }

            const data: ProjectConfigResponse = await response.json();
            console.log('✅ 配置加载成功:', data);

            setConfig(data.config);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '配置加载失败';
            console.error('❌ 项目配置加载错误:', err);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // 监听项目变化，初始化配置
    useEffect(() => {
        if (project?.id) {
            loadProjectConfig();
        }
    }, [project.id]); // 只在项目ID变化时重新加载

    // 加载中状态或自动修复状态
    if (isLoading || isAutoFixing) {
        return (
            <div className="fixed bottom-4 right-4 z-50 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                    <div
                        className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-700">
                        {isAutoFixing ? '正在初始化知识库...' : '正在加载智能助手...'}
                    </span>
                </div>
                {isAutoFixing && (
                    <div className="mt-2 text-xs text-blue-600">
                        检测到项目未关联知识库，正在自动创建中...
                    </div>
                )}
            </div>
        );
    }

    // 错误状态
    if (error) {
        const isKnowledgeBaseError = error.includes('项目未关联知识库') || error.includes('自动修复失败');
        
        return (
            <div
                className="fixed bottom-4 right-4 z-50 max-w-sm p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
                <div className="font-medium text-red-800 mb-1">🚨 智能助手配置错误</div>
                <div className="text-sm text-red-700 mb-2">{error}</div>
                <div className="text-xs text-red-600 mb-2">
                    项目：{project.name}
                </div>
                {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-red-500 mb-2 font-mono bg-red-100 p-1 rounded">
                        项目ID: {project.id}
                    </div>
                )}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={() => loadProjectConfig()}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                        🔄 重试
                    </button>
                    {isKnowledgeBaseError && (
                        <button
                            onClick={() => autoFixKnowledgeBase()}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            🔧 手动修复知识库
                        </button>
                    )}
                </div>
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
            <DiagnosticKnowledgeAssistant config={config} project={project}/>

        </div>
    );
}

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
function DiagnosticKnowledgeAssistant({config, project}: { config: AssistantConfig; project: Project }) {
    console.log('🔍 DiagnosticKnowledgeAssistant 渲染开始，config:', config);

    // 配置管理
    const {config: processedConfig, validateConfig} = useAssistantConfig(config);
    console.log('🔍 processedConfig:', processedConfig);

    // 使用useMemo稳定配置验证结果
    const configValidation = useMemo(() => {
        const validation = validateConfig();
        console.log('🔍 配置验证结果:', validation);
        return validation;
    }, [validateConfig]);

    // 主要助手逻辑
    const assistant = useKnowledgeAssistant(processedConfig);
    console.log('🔍 assistant hook返回值:', {
        isOpen: assistant.isOpen,
        messagesLength: assistant.messages.length,
        isLoading: assistant.isLoading,
        error: assistant.error,
        openAssistantType: typeof assistant.openAssistant,
        closeAssistantType: typeof assistant.closeAssistant
    });

    // 使用useMemo稳定调试信息，避免无限循环
    const debugInfo = useMemo(() => ({
        originalConfig: config,
        processedConfig,
        configValidation,
        assistantState: {
            isOpen: assistant.isOpen,
            messagesLength: assistant.messages.length,
            isLoading: assistant.isLoading,
            error: assistant.error,
        }
    }), [
        config,
        processedConfig,
        configValidation,
        assistant.isOpen,
        assistant.messages.length,
        assistant.isLoading,
        assistant.error
    ]);

    // 使用useEffect打印调试信息，但不设置状态
    useEffect(() => {
        console.log('🔍 DiagnosticKnowledgeAssistant Debug Info:', debugInfo);
    }, [debugInfo]);

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

    // 正常渲染智能助手，带额外调试功能
    return (
        <div className="diagnostic-knowledge-assistant">
            {/* 悬浮按钮 - 修复pointer-events问题 */}
            <FloatingAssistantButton
                onClick={() => {
                    console.log('🖱️ 悬浮按钮点击 - pointer-events修复版本');
                    console.log('📊 点击前状态:', {isOpen: assistant.isOpen});

                    assistant.openAssistant();

                    // 验证状态更新
                    setTimeout(() => {
                        console.log('📝 点击后状态:', {isOpen: assistant.isOpen});
                    }, 10);
                }}
                hasNotification={false}
                disabled={assistant.isLoading}
            />

            {/* 助手侧边栏 */}
            <AssistantSidebar
                isOpen={assistant.isOpen}
                onClose={() => {
                    console.log('❌ 侧边栏关闭按钮被点击');
                    assistant.closeAssistant();
                }}
                projectId={project.id}
            />

            {/* 开发模式的额外调试面板 */}
            {process.env.NODE_ENV === 'development' && (
                <div
                    className="fixed bottom-6 left-6 z-40 max-w-xs p-2 bg-blue-900 text-blue-100 rounded text-xs font-mono max-h-96 overflow-y-auto">
                    <div className="font-bold mb-1">🐛 实时调试</div>
                    <div>isOpen: {assistant.isOpen ? '✅' : '❌'}</div>
                    <div>isLoading: {assistant.isLoading ? '⏳' : '✅'}</div>
                    <div>messages: {assistant.messages.length}</div>
                    <div>error: {assistant.error || 'None'}</div>
                    <div>配置有效: {configValidation.isValid ? '✅' : '❌'}</div>

                    <button
                        onClick={() => {
                            console.log('🧪 === 手动测试按钮点击开始 ===');
                            console.log('🧪 手动触发 openAssistant');
                            console.log('🧪 调用前状态:', {isOpen: assistant.isOpen});

                            try {
                                assistant.openAssistant();
                                console.log('🧪 调用成功');

                                setTimeout(() => {
                                    console.log('🧪 手动测试延迟检查:', {isOpen: assistant.isOpen});
                                }, 50);
                            } catch (error) {
                                console.error('🧪 手动测试调用错误:', error);
                            }

                            console.log('🧪 === 手动测试按钮点击结束 ===');
                        }}
                        className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs w-full"
                    >
                        🧪 测试打开
                    </button>

                    {/* 新增状态强制切换按钮 */}
                    <button
                        onClick={() => {
                            console.log('🔄 强制状态切换测试');
                            console.log('🔄 当前 isOpen:', assistant.isOpen);
                            if (assistant.isOpen) {
                                assistant.closeAssistant();
                                console.log('🔄 调用了 closeAssistant');
                            } else {
                                assistant.openAssistant();
                                console.log('🔄 调用了 openAssistant');
                            }
                        }}
                        className="mt-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-xs w-full"
                    >
                        🔄 切换状态
                    </button>

                    <details className="mt-2">
                        <summary className="cursor-pointer">完整状态</summary>
                        <pre className="mt-1 text-[8px] bg-blue-800 p-1 rounded max-h-32 overflow-auto">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
}
