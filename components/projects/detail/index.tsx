'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {deleteProject, getProject, Project as BaseProject, updateProjectDatasetId} from '@/lib/api/project-api';
import KnowledgeBase from '@/components/projects/detail/knowledge-base';
import ProjectInfo from 'components/projects/detail/ProjectInfo';
import {
    Activity,
    BarChart3,
    Building2,
    Calendar,
    Cpu,
    Database,
    FileText,
    Mail,
    MapPin,
    PencilIcon,
    Phone,
    Shield,
    TrashIcon,
    User,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {JSX, useCallback, useEffect, useRef, useState} from 'react';
import {toast} from 'sonner';
import {useAtom} from 'jotai';
import {projectTiobItemsAtomFamily} from '@/components/projects/detail/project-atoms';
import {useDatasetDetails, useDatasetDocuments, useProjectDataset} from '@/hooks/use-dify-dataset-server';
import {Badge} from '@/components/ui/badge';
import {DifyDataset} from "@/lib/api/dify-dataset-api";
import {Register} from "@tanstack/react-query";

interface Project extends BaseProject {
    fileCount?: number; // 兼容新命名
}

function KnowledgeBaseSummary(props: {
    creating: boolean,
    loadingDataset: boolean,
    dataset: DifyDataset | undefined,
    datasetError: Register extends { defaultError: infer TError } ? TError : Error | null,
    callbackfn: (_, i) => JSX.Element,
    realTimeDocumentCount: number,
    onClick: () => void
}) {
    return <>
        {/* 知识库信息区域 */}
        <div className="pt-4 border-t border-border/40">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                <Database className="h-4 w-4"/>
                知识库详情
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                {/* 知识库状态行 */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {props.creating || props.loadingDataset ? (
                                <>
                                    <Badge variant="secondary" className="text-xs w-fit">
                                                <span
                                                    className="w-2 h-2 bg-current rounded-full animate-pulse mr-1 inline-block"/>
                                        初始化中
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"/>
                                        <span className="text-sm text-muted-foreground">正在创建知识库...</span>
                                    </div>
                                </>
                            ) : props.dataset ? (
                                <>
                                    <Badge variant="default"
                                           className="text-xs w-fit bg-green-100 text-green-800 border-green-200">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1 inline-block"/>
                                        运行正常
                                    </Badge>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <span className="font-medium text-sm break-words">{props.dataset.name}</span>
                                        <span
                                            className="text-xs font-mono bg-background px-2 py-1 rounded border w-fit">
                                                    ID: {props.dataset.id.slice(0, 8)}...
                                                </span>
                                    </div>
                                </>
                            ) : props.datasetError ? (
                                <>
                                    <Badge variant="destructive" className="text-xs w-fit">
                                        <span className="w-2 h-2 bg-current rounded-full mr-1 inline-block"/>
                                        连接失败
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">知识库连接异常</span>
                                </>
                            ) : (
                                <>
                                    <Badge variant="outline" className="text-xs w-fit">
                                                <span
                                                    className="w-2 h-2 bg-muted-foreground rounded-full mr-1 inline-block"/>
                                        未配置
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">知识库尚未初始化</span>
                                </>
                            )}
                        </div>

                        {props.dataset && (
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                                最后更新: {new Date(props.dataset.updated_at * 1000).toLocaleDateString("zh-CN")}
                            </div>
                        )}
                    </div>

                    {/* 骨架屏 for loading state */}
                    {(props.creating || props.loadingDataset) && (
                        <div className="space-y-3 animate-pulse">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[...Array(4)].map(props.callbackfn)}
                            </div>
                        </div>
                    )}
                </div>

                {/* 知识库统计信息 */}
                {props.dataset && (
                    <div className="border-t border-border/40 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div
                                className="group cursor-pointer transition-all duration-200 hover:scale-105 p-3 bg-background rounded-md border hover:border-blue-200 hover:shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <FileText className="h-4 w-4 text-blue-500"/>
                                    <span
                                        className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                {Math.round((props.realTimeDocumentCount / Math.max(props.dataset.document_count, 1)) * 100)}%
                                            </span>
                                </div>
                                <div className="text-lg font-semibold text-blue-600">
                                    {props.realTimeDocumentCount}
                                </div>
                                <div className="text-xs text-muted-foreground">文档数量</div>
                                <div className="mt-2 w-full bg-blue-100 rounded-full h-1">
                                    <div
                                        className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                                        style={{width: `${Math.min((props.realTimeDocumentCount / Math.max(props.dataset.document_count, props.realTimeDocumentCount, 1)) * 100, 100)}%`}}
                                    />
                                </div>
                            </div>

                            <div
                                className="group cursor-pointer transition-all duration-200 hover:scale-105 p-3 bg-background rounded-md border hover:border-emerald-200 hover:shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <BarChart3 className="h-4 w-4 text-emerald-500"/>
                                    <span
                                        className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                {props.realTimeDocumentCount > 0 ? Math.round(props.dataset.word_count / props.realTimeDocumentCount) : 0} 词/文档
                                            </span>
                                </div>
                                <div className="text-lg font-semibold text-emerald-600">
                                    {props.dataset.word_count?.toLocaleString() || "0"}
                                </div>
                                <div className="text-xs text-muted-foreground">总词数</div>
                                <div className="mt-2 w-full bg-emerald-100 rounded-full h-1">
                                    <div
                                        className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
                                        style={{width: `${Math.min((props.dataset.word_count / Math.max(props.dataset.word_count, 100000)) * 100, 100)}%`}}
                                    />
                                </div>
                            </div>

                            <div
                                className="group cursor-pointer transition-all duration-200 hover:scale-105 p-3 bg-background rounded-md border hover:border-purple-200 hover:shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    {props.dataset.indexing_technique === "high_quality" ?
                                        <Zap className="h-4 w-4 text-purple-500"/> :
                                        <Cpu className="h-4 w-4 text-purple-500"/>
                                    }
                                    <span
                                        className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                {props.dataset.embedding_available ? "可用" : "不可用"}
                                            </span>
                                </div>
                                <div className="text-sm font-semibold text-purple-600 capitalize">
                                    {props.dataset.indexing_technique === "high_quality" ? "高质量" : "经济模式"}
                                </div>
                                <div className="text-xs text-muted-foreground">索引模式</div>
                                <div className="mt-2 w-full bg-purple-100 rounded-full h-1">
                                    <div
                                        className={`h-1 rounded-full transition-all duration-500 ${
                                            props.dataset.indexing_technique === "high_quality" ? "bg-purple-500 w-full" : "bg-purple-400 w-3/4"
                                        }`}
                                    />
                                </div>
                            </div>

                            <div
                                className="group cursor-pointer transition-all duration-200 hover:scale-105 p-3 bg-background rounded-md border hover:border-orange-200 hover:shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <Activity className="h-4 w-4 text-orange-500"/>
                                    <span
                                        className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                {props.dataset.app_count > 0 ? "活跃" : "未使用"}
                                            </span>
                                </div>
                                <div className="text-lg font-semibold text-orange-600">
                                    {props.dataset.app_count}
                                </div>
                                <div className="text-xs text-muted-foreground">关联应用</div>
                                <div className="mt-2 w-full bg-orange-100 rounded-full h-1">
                                    <div
                                        className="bg-orange-500 h-1 rounded-full transition-all duration-500"
                                        style={{width: `${Math.min((props.dataset.app_count / Math.max(props.dataset.app_count, 1)) * 100, 100)}%`}}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 知识库详细信息 */}
                        <div className="mt-4 pt-4 border-t border-border/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div
                                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Database className="h-3 w-3 text-muted-foreground"/>
                                        <span className="text-muted-foreground">存储提供商:</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {props.dataset.provider}
                                    </Badge>
                                </div>
                                <div
                                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-3 w-3 text-muted-foreground"/>
                                        <span className="text-muted-foreground">访问权限:</span>
                                    </div>
                                    <Badge variant="outline" className={`text-xs ${
                                        props.dataset.permission === "only_me" ? "border-blue-200 text-blue-700" :
                                            props.dataset.permission === "all_team_members" ? "border-green-200 text-green-700" :
                                                "border-amber-200 text-amber-700"
                                    }`}>
                                        {props.dataset.permission === "only_me" ? "仅自己" :
                                            props.dataset.permission === "all_team_members" ? "全团队" : "部分成员"}
                                    </Badge>
                                </div>
                                {props.dataset.embedding_model && (
                                    <>
                                        <div
                                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="h-3 w-3 text-muted-foreground"/>
                                                <span className="text-muted-foreground">嵌入模型:</span>
                                            </div>
                                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                                {props.dataset.embedding_model}
                                            </code>
                                        </div>
                                        <div
                                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-3 w-3 text-muted-foreground"/>
                                                <span className="text-muted-foreground">模型提供商:</span>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {props.dataset.embedding_model_provider}
                                            </Badge>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 知识库操作区域 */}
                {(props.datasetError || !props.dataset) && !props.creating && !props.loadingDataset && (
                    <div className="border-t border-border/40 pt-4">
                        <div
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"/>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-amber-800 mb-1">
                                        知识库需要初始化
                                    </div>
                                    <div className="text-xs text-amber-700 break-words">
                                        初始化知识库后即可使用智能助手功能和文档管理
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-700 border-amber-300 hover:bg-amber-100 transition-colors"
                                    onClick={props.onClick}
                                >
                                    重新初始化
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 错误状态的详细信息 */}
                {props.datasetError && !props.creating && !props.loadingDataset && (
                    <div className="border-t border-border/40 pt-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"/>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-red-800 mb-2">
                                        知识库连接错误
                                    </div>
                                    <div
                                        className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded break-all">
                                        {props.datasetError.message || "未知错误"}
                                    </div>
                                    <div className="text-xs text-red-600 mt-2">
                                        请检查Dify配置或联系系统管理员
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </>;
}

export default function ProjectDetail({projectId}: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showProjectInfo, setShowProjectInfo] = useState(false);
    // 使用项目特定的原子化状态
    const [tiobItems] = useAtom(projectTiobItemsAtomFamily(projectId));
    // 防止重复初始化知识库的标志
    const initializingDatasetRef = useRef(false);
    const router = useRouter();

    // 知识库管理
    const {ensureDataset, isCreating} = useProjectDataset(projectId, project?.name || '');

    // 查询知识库详情
    const {
        data: dataset,
        error: datasetError,
        isLoading: isLoadingDataset
    } = useDatasetDetails(project?.datasetId, !!project?.datasetId);

    // 查询文档列表以获取实时文档数量
    const {
        data: documentsResponse
    } = useDatasetDocuments(project?.datasetId, !!project?.datasetId && !!dataset);

    // 获取实时文档数量
    const allDocuments = documentsResponse?.pages?.flatMap(page => page.data) || [];
    const realTimeDocumentCount = allDocuments.length;

    // logger.info('ProjectDetail', {projectId, project});

    const loadProject = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getProject(projectId);

            if (!data) {
                setError('项目不存在');
                toast.error('无法找到该项目');
                return;
            }

            setProject(data);
            // 文件计数现在基于Jotai原子状态，不需要在此设置

        } catch (error) {
            console.error('加载项目详情失败:', error);
            setError('加载项目详情失败');
            toast.error('加载项目详情失败');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const handleProjectUpdate = useCallback((updated: Partial<Project>) => {
        setProject(prev => prev ? {...prev, ...updated} : null);
    }, []); // 依赖数组为空，因为函数不依赖任何外部变量

    useEffect(() => {
        // 加载项目详情
        loadProject();
    }, [projectId, loadProject]);


    // 确保知识库存在
    useEffect(() => {
        const initializeDataset = async () => {
            // 防止重复初始化
            if (initializingDatasetRef.current) return;

            // 只有项目存在且没有知识库ID时才初始化
            if (project && !project.datasetId) {
                console.log('🔧 项目详情页开始初始化知识库:', {
                    projectId: project.id,
                    projectName: project.name
                });

                try {
                    initializingDatasetRef.current = true;

                    // 显示友好的提示
                    toast.info('正在为项目初始化知识库...', {
                        description: '首次访问项目需要创建知识库，请稍候',
                        duration: 3000
                    });

                    // 传入undefined，让ensureDataset知道需要创建新的知识库
                    const datasetId = await ensureDataset(undefined);
                    if (datasetId) {
                        // 更新项目的知识库ID
                        await updateProjectDatasetId(project.id, datasetId);
                        handleProjectUpdate({datasetId});

                        console.log('✅ 项目详情页知识库初始化成功:', {
                            projectId: project.id,
                            datasetId
                        });

                        toast.success('知识库初始化完成！', {
                            description: '现在可以上传文档并使用智能助手功能',
                            duration: 4000
                        });
                    }
                } catch (error) {
                    console.error('❌ 项目详情页知识库初始化失败:', error);

                    // 检查是否是命名冲突错误
                    const errorMessage = error instanceof Error ? error.message : '未知错误';
                    if (errorMessage.includes('already exists')) {
                        toast.warning('知识库创建遇到命名冲突', {
                            description: '正在重试使用备用名称...',
                            duration: 5000
                        });
                    } else {
                        toast.error('知识库初始化失败', {
                            description: `错误: ${errorMessage}`,
                            duration: 8000
                        });
                    }
                } finally {
                    initializingDatasetRef.current = false;
                }
            }
        };

        initializeDataset();
    }, [project?.id, project?.datasetId, ensureDataset, handleProjectUpdate]); // 添加依赖以确保正确性

    const handleDeleteProject = async () => {
        if (!project) return;

        try {
            setDeleteLoading(true);
            const success = await deleteProject(project.id);

            if (success) {
                toast.success('项目已成功删除');
                router.push('/projects');
            } else {
                toast.error('删除项目失败');
            }
        } catch (error) {
            console.error('删除项目失败:', error);
            toast.error('删除项目失败，请重试');
        } finally {
            setDeleteLoading(false);
            setDeleteDialogOpen(false);
        }
    };

    // logger.info("project detail: ", {project, files, tiobItems});

    if (loading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                {/* 项目概览骨架屏 */}
                <Card className="mb-6">
                    <CardHeader className="pb-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-6 bg-muted rounded animate-pulse"/>
                                <div className="h-4 bg-muted/70 rounded animate-pulse w-1/2"/>
                            </div>
                            <div className="flex gap-2">
                                <div className="h-8 w-24 bg-muted rounded animate-pulse"/>
                                <div className="h-8 w-20 bg-muted rounded animate-pulse"/>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* 核心指标骨架屏 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="h-4 bg-muted/70 rounded animate-pulse w-2/3"/>
                                    <div className="h-8 bg-muted rounded animate-pulse w-1/2"/>
                                </div>
                            ))}
                        </div>

                        {/* 知识库信息骨架屏 */}
                        <div className="pt-4 border-t border-border/40">
                            <div className="h-4 bg-muted/70 rounded animate-pulse w-1/4 mb-4"/>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="h-6 bg-muted rounded animate-pulse w-1/3"/>
                                    <div className="h-4 bg-muted/70 rounded animate-pulse w-1/4"/>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="p-3 bg-background rounded-md">
                                            <div className="h-4 bg-muted/70 rounded mb-2 animate-pulse"/>
                                            <div className="h-8 bg-muted rounded mb-2 animate-pulse"/>
                                            <div className="h-3 bg-muted/70 rounded mb-2 animate-pulse"/>
                                            <div className="h-1 bg-muted/70 rounded animate-pulse"/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 联系信息骨架屏 */}
                        <div className="pt-4 border-t border-border/40">
                            <div className="h-4 bg-muted/70 rounded animate-pulse w-1/6 mb-3"/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="h-4 w-4 bg-muted/70 rounded animate-pulse"/>
                                        <div className="h-4 bg-muted/70 rounded animate-pulse flex-1"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 项目分析骨架屏 */}
                <Card>
                    <CardHeader>
                        <div className="h-6 bg-muted rounded animate-pulse w-1/4"/>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-16 bg-muted/50 rounded animate-pulse"/>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !project) {
        return (<div className="container mx-auto py-6">
            <div className="text-center py-12 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium text-red-600">{error || '项目不存在'}</h3>
                <p className="text-sm text-gray-500 mt-1">请返回项目列表查看其他项目</p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/projects">返回项目列表</Link>
                </Button>
            </div>
        </div>);
    }

    return (<div className="container mx-auto py-6 space-y-6">
        <Card className="mb-6">
            <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">项目概览（{project.name}）</CardTitle>
                        <CardDescription
                            className="font-mono text-xs sm:text-sm">单位代码: {project.code}</CardDescription>
                    </div>
                    <div className='flex justify-end gap-2 flex-shrink-0'>
                        <Dialog open={showProjectInfo} onOpenChange={setShowProjectInfo}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1">
                                    <PencilIcon className="h-4 w-4"/>
                                    <span className="hidden sm:inline">编辑基本信息</span>
                                    <span className="sm:hidden">编辑</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>项目基本信息</DialogTitle>
                                    <DialogDescription>
                                        查看和编辑项目的详细信息
                                    </DialogDescription>
                                </DialogHeader>
                                <ProjectInfo project={project} onUpdate={handleProjectUpdate}/>
                            </DialogContent>
                        </Dialog>

                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <TrashIcon className="h-4 w-4"/>
                            <span className="hidden sm:inline">删除项目</span>
                            <span className="sm:hidden">删除</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* 核心指标区域 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Building2 className="h-4 w-4"/>
                            单位类型
                        </div>
                        <div className="text-lg font-semibold">{project.type}</div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <FileText className="h-4 w-4"/>
                            分析任务
                        </div>
                        <div className="text-lg font-semibold">{project.taskCount}</div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Calendar className="h-4 w-4"/>
                            创建时间
                        </div>
                        <div className="text-sm text-muted-foreground">{project.createdAt}</div>
                    </div>
                </div>

                <KnowledgeBaseSummary creating={isCreating} loadingDataset={isLoadingDataset} dataset={dataset}
                                      datasetError={datasetError} callbackfn={(_, i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded-md">
                        <div className="h-4 bg-muted-foreground/20 rounded mb-2"/>
                        <div className="h-6 bg-muted-foreground/20 rounded mb-2"/>
                        <div className="h-3 bg-muted-foreground/20 rounded mb-2"/>
                        <div className="h-1 bg-muted-foreground/20 rounded"/>
                    </div>
                )} realTimeDocumentCount={realTimeDocumentCount} onClick={() => window.location.reload()}/>

                {/* 联系信息区域 */}
                {(project.address || project.contact || project.phone || project.email) && (
                    <div className="pt-4 border-t border-border/40">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">联系信息</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {project.address && (
                                <div className="flex items-start gap-2 sm:col-span-2">
                                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0"/>
                                    <span className="text-muted-foreground break-words">{project.address}</span>
                                </div>
                            )}
                            {project.contact && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                    <span className="text-muted-foreground truncate">{project.contact}</span>
                                </div>
                            )}
                            {project.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                    <span className="text-muted-foreground font-mono">{project.phone}</span>
                                </div>
                            )}
                            {project.email && (
                                <div className="flex items-center gap-2 sm:col-span-2">
                                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                    <span className="text-muted-foreground font-mono break-all">{project.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        <KnowledgeBase
            projectId={projectId}
            project={project}
            onProjectUpdate={handleProjectUpdate}
        />

        {/* 删除项目 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确认删除项目</AlertDialogTitle>
                    <AlertDialogDescription>
                        您确定要删除项目"{project.name}"吗？此操作将删除所有相关数据，且无法恢复。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>取消</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteProject}
                        disabled={deleteLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {deleteLoading ? '删除中...' : '确认删除'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>);
}