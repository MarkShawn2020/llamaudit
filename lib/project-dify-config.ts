/**
 * 项目Dify配置管理工具
 * 提供获取和验证项目级Dify配置的功能
 */

import {db} from '@/lib/db/drizzle';
import {auditUnits} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';
import {decryptApiKey} from '@/lib/crypto';

export interface ProjectDifyConfig {
    projectId: string;
    difyBaseUrl: string;
    difyDatasetApiKey: string;
    datasetId?: string;
    hasValidConfig: boolean;
    configSource: 'database' | 'environment' | 'none' | 'frontend-custom';
}

/**
 * 从环境变量获取默认配置（回退方案）
 */
function getEnvironmentDifyConfig(): {
    difyBaseUrl: string;
    difyDatasetApiKey?: string;
} {
    return {
        difyBaseUrl: process.env.NEXT_PUBLIC_DIFY_API_URL || 'https://api.dify.ai/v1',
        difyDatasetApiKey: process.env.DIFY_DATASET_API_KEY
    };
}

/**
 * 获取项目的Dify配置
 * 优先级：项目数据库配置 > 环境变量配置
 */
export async function getProjectDifyConfig(projectId: string): Promise<ProjectDifyConfig> {
    try {
        console.log(`🔧 获取项目[${projectId}]Dify配置...`);
        console.log(`🔍 ProjectId 详细信息:`, {
            value: projectId,
            type: typeof projectId,
            length: projectId?.length,
            isString: typeof projectId === 'string',
            firstChar: projectId?.[0],
            lastChar: projectId?.[projectId.length - 1],
            contains_hyphen: projectId?.includes('-'),
            uuid_pattern_match: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)
        });

        // 验证UUID格式
        if (!projectId || typeof projectId !== 'string') {
            throw new Error(`无效的项目ID: ${projectId}`);
        }

        // 检查UUID格式
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(projectId)) {
            console.error(`❌ 项目ID格式无效: "${projectId}"`);
            console.error(`❌ UUID格式应为: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
            throw new Error(`项目ID格式无效，必须是有效的UUID格式: ${projectId}`);
        }

        // 从数据库获取项目配置
        console.log(`📊 准备查询数据库，projectId: ${projectId}`);
        const project = await db.query.auditUnits.findFirst({
            where: eq(auditUnits.id, projectId),
            columns: {
                id: true,
                datasetId: true,
                difyBaseUrl: true,
                difyDatasetApiKey: true,
                difyConfigUpdatedAt: true
            }
        });

        if (!project) {
            throw new Error(`项目[${projectId}]不存在`);
        }

        console.log(`📊 数据库查询结果:`, {
            projectId: project.id,
            datasetId: project.datasetId,
            difyBaseUrl: project.difyBaseUrl,
            difyDatasetApiKey: project.difyDatasetApiKey ? `${project.difyDatasetApiKey.substring(0, 10)}...` : null,
            difyConfigUpdatedAt: project.difyConfigUpdatedAt
        });

        // 检查是否有项目级别的配置
        const hasProjectConfig = !!(project.difyBaseUrl && project.difyDatasetApiKey);
        
        console.log(`🔍 项目配置检查:`, {
            hasProjectConfig,
            hasDifyBaseUrl: !!project.difyBaseUrl,
            hasDifyDatasetApiKey: !!project.difyDatasetApiKey,
            difyBaseUrlValue: project.difyBaseUrl,
            difyApiKeyExists: !!project.difyDatasetApiKey
        });

        if (hasProjectConfig) {
            try {
                // 解密API密钥
                const decryptedApiKey = decryptApiKey(project.difyDatasetApiKey!);

                const config: ProjectDifyConfig = {
                    projectId: project.id,
                    difyBaseUrl: project.difyBaseUrl!,
                    difyDatasetApiKey: decryptedApiKey,
                    datasetId: project.datasetId || undefined,
                    hasValidConfig: true,
                    configSource: 'database'
                };

                console.log(`✅ 使用项目数据库配置:`, {
                    projectId,
                    difyBaseUrl: config.difyBaseUrl,
                    hasApiKey: !!config.difyDatasetApiKey,
                    hasDatasetId: !!config.datasetId,
                    configUpdated: project.difyConfigUpdatedAt?.toISOString()
                });

                return config;
            } catch (decryptError) {
                console.error(`❌ 项目[${projectId}]API密钥解密失败:`, decryptError);
                // 继续使用环境变量作为回退
            }
        }

        // 回退到环境变量配置
        const envConfig = getEnvironmentDifyConfig();

        if (envConfig.difyDatasetApiKey) {
            const config: ProjectDifyConfig = {
                projectId: project.id,
                difyBaseUrl: envConfig.difyBaseUrl,
                difyDatasetApiKey: envConfig.difyDatasetApiKey,
                datasetId: project.datasetId || undefined,
                hasValidConfig: true,
                configSource: 'environment'
            };

            console.log(`⚠️ 使用环境变量配置（项目配置不可用）:`, {
                projectId,
                difyBaseUrl: config.difyBaseUrl,
                hasApiKey: !!config.difyDatasetApiKey,
                hasDatasetId: !!config.datasetId,
                reason: hasProjectConfig ? '解密失败' : '项目配置不存在'
            });

            return config;
        }

        // 没有任何可用配置
        const config: ProjectDifyConfig = {
            projectId: project.id,
            difyBaseUrl: envConfig.difyBaseUrl,
            difyDatasetApiKey: '',
            datasetId: project.datasetId || undefined,
            hasValidConfig: false,
            configSource: 'none'
        };

        console.error(`❌ 项目[${projectId}]没有可用的Dify配置`);
        return config;

    } catch (error) {
        console.error(`获取项目Dify配置失败:`, error);

        // 返回最基础的配置
        const envConfig = getEnvironmentDifyConfig();
        return {
            projectId,
            difyBaseUrl: envConfig.difyBaseUrl,
            difyDatasetApiKey: envConfig.difyDatasetApiKey || '',
            hasValidConfig: !!envConfig.difyDatasetApiKey,
            configSource: envConfig.difyDatasetApiKey ? 'environment' : 'none'
        };
    }
}

/**
 * 验证Dify配置的完整性
 */
export function validateDifyConfig(config: ProjectDifyConfig): {
    isValid: boolean;
    errors: string[];
} {
    console.log('validating dify config: ', config)

    const errors: string[] = [];

    // 检查Base URL
    if (!config.difyBaseUrl) {
        errors.push('Dify Base URL不能为空');
    } else {
        try {
            new URL(config.difyBaseUrl);
        } catch {
            errors.push('Dify Base URL格式无效');
        }
    }

    // 检查API密钥
    if (!config.difyDatasetApiKey) {
        errors.push('Dify Dataset API Key不能为空');
    } else if (!config.difyDatasetApiKey.startsWith('dataset-')) {
        errors.push('Dify Dataset API Key格式无效（应以"dataset-"开头）');
    }

    // 检查数据集ID（如果需要知识库检索）
    if (!config.datasetId) {
        errors.push('项目未关联Dify数据集');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 获取配置摘要（用于日志和调试，不包含敏感信息）
 */
export function getDifyConfigSummary(config: ProjectDifyConfig): {
    projectId: string;
    difyBaseUrl: string;
    hasApiKey: boolean;
    hasDatasetId: boolean;
    configSource: string;
    isValid: boolean;
} {
    const validation = validateDifyConfig(config);

    return {
        projectId: config.projectId,
        difyBaseUrl: config.difyBaseUrl,
        hasApiKey: !!config.difyDatasetApiKey,
        hasDatasetId: !!config.datasetId,
        configSource: config.configSource,
        isValid: validation.isValid
    };
}

/**
 * 缓存项目配置（可选优化）
 * 注意：缓存时间不应太长，以防配置更新不及时
 */
const configCache = new Map<string, {
    config: ProjectDifyConfig;
    timestamp: number;
    ttl: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export async function getCachedProjectDifyConfig(projectId: string): Promise<ProjectDifyConfig> {
    const now = Date.now();
    const cached = configCache.get(projectId);

    // 检查缓存是否有效
    if (cached && (now - cached.timestamp) < cached.ttl) {
        console.log(`🔄 使用缓存的项目[${projectId}]Dify配置`);
        return cached.config;
    }

    // 获取最新配置
    const config = await getProjectDifyConfig(projectId);

    // 只缓存有效配置
    if (config.hasValidConfig) {
        configCache.set(projectId, {
            config,
            timestamp: now,
            ttl: CACHE_TTL
        });
    }

    return config;
}

/**
 * 清除项目配置缓存
 */
export function clearProjectDifyConfigCache(projectId?: string): void {
    if (projectId) {
        configCache.delete(projectId);
        console.log(`🔄 已清除项目[${projectId}]Dify配置缓存`);
    } else {
        configCache.clear();
        console.log(`🔄 已清除所有项目Dify配置缓存`);
    }
}