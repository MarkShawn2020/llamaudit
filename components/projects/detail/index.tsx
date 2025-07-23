'use client';

import {TIOBComp, TIOBInterface} from "@/components/projects/detail/tiob-comp";
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
import {deleteProject, getProject, Project as BaseProject} from '@/lib/api/project-api';
import {logger} from '@/lib/logger';
import ProjectAnalysis from 'components/projects/detail/ProjectAnalysis';
import ProjectInfo from 'components/projects/detail/ProjectInfo';
import {PencilIcon, TrashIcon, Building2, Database, FileText, MapPin, Phone, Mail, Calendar, User} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import {useAtom} from 'jotai';
import {
  projectTiobItemsAtomFamily
} from '@/components/projects/detail/project-atoms';
import { useDatasetDetails, useDatasetDocuments, useProjectDataset } from '@/hooks/use-dify-dataset';
import { updateProjectDatasetId } from '@/lib/api/project-api';
import { Badge } from '@/components/ui/badge';

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
    const router = useRouter();

    // 知识库管理
    const { ensureDataset, isCreating } = useProjectDataset(projectId, project?.name || '');
    
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

    useEffect(() => {
        // 加载项目详情
        loadProject();
    }, [projectId]);

    const loadProject = async () => {
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
    };


    // 确保知识库存在
    useEffect(() => {
        const initializeDataset = async () => {
            if (project && (!project.datasetId || datasetError)) {
                try {
                    const datasetId = await ensureDataset(project.datasetId);
                    if (datasetId !== project.datasetId) {
                        // 更新项目的知识库ID
                        await updateProjectDatasetId(project.id, datasetId);
                        handleProjectUpdate({ datasetId });
                    }
                } catch (error) {
                    console.error('初始化知识库失败:', error);
                }
            }
        };

        initializeDataset();
    }, [project, datasetError, ensureDataset]);

    const handleProjectUpdate = (updated: Partial<Project>) => {
        if (!project) return;
        setProject({...project, ...updated});
    };

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
        return (<div className="container mx-auto py-6">
            <div className="flex justify-center items-center h-64">
                <div className="animate-pulse text-lg">加载项目信息...</div>
            </div>
        </div>);
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
                        <CardDescription className="font-mono text-xs sm:text-sm">单位代码: {project.code}</CardDescription>
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
                {/* 基本信息区域 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            单位类型
                        </div>
                        <div className="text-lg font-semibold">{project.type}</div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Database className="h-4 w-4" />
                            知识库状态
                        </div>
                        <div className="flex items-center gap-2">
                            {isCreating || isLoadingDataset ? (
                                <Badge variant="secondary" className="text-xs">
                                    <span className="w-2 h-2 bg-current rounded-full animate-pulse mr-1 inline-block" />
                                    初始化中
                                </Badge>
                            ) : dataset ? (
                                <>
                                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1 inline-block" />
                                        已连接
                                    </Badge>
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {realTimeDocumentCount} 文档
                                    </span>
                                </>
                            ) : datasetError ? (
                                <Badge variant="destructive" className="text-xs">
                                    <span className="w-2 h-2 bg-current rounded-full mr-1 inline-block" />
                                    连接失败
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-xs">
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full mr-1 inline-block" />
                                    未配置
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            分析任务
                        </div>
                        <div className="text-lg font-semibold">{project.taskCount}</div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Calendar className="h-4 w-4" />
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
                                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <span className="text-muted-foreground break-words">{project.address}</span>
                                </div>
                            )}
                            {project.contact && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-muted-foreground truncate">{project.contact}</span>
                                </div>
                            )}
                            {project.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-muted-foreground font-mono">{project.phone}</span>
                                </div>
                            )}
                            {project.email && (
                                <div className="flex items-center gap-2 sm:col-span-2">
                                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-muted-foreground font-mono break-all">{project.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        <ProjectAnalysis 
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