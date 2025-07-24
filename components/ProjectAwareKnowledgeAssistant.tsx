/**
 * 项目上下文感知的智能助手组件
 * 根据当前项目获取对应的知识库配置
 */

'use client';

import {useEffect, useMemo, useState} from 'react';
import {usePathname} from 'next/navigation';
import {AssistantConfig} from '@/components/knowledge-assistant/types';
import {useAssistantConfig, useKnowledgeAssistant} from '@/hooks/use-knowledge-assistant';
import {FloatingAssistantButton} from '@/components/knowledge-assistant/floating-button';
import {AssistantSidebar} from '@/components/knowledge-assistant/assistant-sidebar';

interface ProjectConfigResponse {
    config: AssistantConfig;
    project: {
        id: string;
        name: string;
        datasetId: string;
    };
    status: string;
}

export function ProjectAwareKnowledgeAssistant() {
    const pathname = usePathname();
    const [config, setConfig] = useState<AssistantConfig | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [projectInfo, setProjectInfo] = useState<{ id: string; name: string } | null>(null);

    // 提取项目ID从URL
    const getProjectIdFromPath = (path: string): string | null => {
        console.log(`🔍 URL解析开始，path: "${path}"`);
        const projectMatch = path.match(/\/projects\/([^\/]+)/);
        const extractedId = projectMatch ? projectMatch[1] : null;
        
        console.log(`🔍 URL解析结果:`, {
            fullPath: path,
            regexMatch: projectMatch,
            extractedId: extractedId,
            extractedIdLength: extractedId?.length,
            isValidUUID: extractedId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(extractedId) : false
        });
        
        return extractedId;
    };

    // 获取项目配置
    const loadProjectConfig = async (projectId: string) => {
        console.log('🔄 开始加载项目配置:', projectId);
        setIsLoading(true);
        setError(null);

        try {
            const url = `/api/assistant/config?projectId=${projectId}`;
            console.log('📡 请求URL:', url);

            const response = await fetch(url);
            console.log('📥 响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: `HTTP ${response.status}`}));
                console.error('❌ API错误响应:', errorData);
                throw new Error(errorData.error || `配置获取失败: ${response.status}`);
            }

            const data: ProjectConfigResponse = await response.json();
            console.log('✅ 配置加载成功:', data);

            setConfig(data.config);
            setProjectInfo({
                id: data.project.id,
                name: data.project.name,
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '配置加载失败';
            console.error('❌ 项目配置加载错误:', err);
            setError(errorMessage);
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
                    <div
                        className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-700">正在加载智能助手...</span>
                </div>
            </div>
        );
    }

    // 错误状态
    if (error) {
        return (
            <div
                className="fixed bottom-4 right-4 z-50 max-w-sm p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
                <div className="font-medium text-red-800 mb-1">🚨 智能助手配置错误</div>
                <div className="text-sm text-red-700 mb-2">{error}</div>
                {projectInfo && (
                    <div className="text-xs text-red-600 mb-2">
                        项目：{projectInfo.name}
                    </div>
                )}
                {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-red-500 mb-2 font-mono bg-red-100 p-1 rounded">
                        项目ID: {projectId}
                    </div>
                )}
                <button
                    onClick={() => loadProjectConfig(projectId)}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                    🔄 重试
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
            <DiagnosticKnowledgeAssistant config={config}/>

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

    return <ProjectAwareKnowledgeAssistant/>;
}

/**
 * 诊断版智能助手组件 - 增强调试版本
 */
function DiagnosticKnowledgeAssistant({config}: { config: AssistantConfig }) {
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
                projectId={config.projectId}
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
