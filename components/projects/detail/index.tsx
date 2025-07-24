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
import {Building2, Calendar, FileText, Mail, MapPin, PencilIcon, Phone, TrashIcon, User} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {toast} from 'sonner';
import {useAtom} from 'jotai';
import {projectTiobItemsAtomFamily} from '@/components/projects/detail/project-atoms';
import {useProjectDataset} from '@/hooks/use-dify-dataset-server';

interface Project extends BaseProject {
    fileCount?: number; // 兼容新命名
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