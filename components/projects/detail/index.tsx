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
import { KnowledgeBaseManagement } from '@/components/knowledge-base/knowledge-base-management';
import { ChatBotProvider } from '@/components/knowledge-base/chat-bot-provider';
import {PencilIcon, TrashIcon} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import {useAtom} from 'jotai';
import {
  projectFilesAtomFamily, 
  projectTiobItemsAtomFamily
} from '@/components/projects/detail/project-atoms';

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
    const [files] = useAtom(projectFilesAtomFamily(projectId));
    const [tiobItems] = useAtom(projectTiobItemsAtomFamily(projectId));
    // 文件计数基于原子状态
    const fileCount = files.length;
    const router = useRouter();

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

    // 更新项目对象中的文件数 - 使用Jotai状态
    useEffect(() => {
        if (project && fileCount !== project.fileCount) {
            setProject({...project, fileCount});
        }
    }, [fileCount, project]);

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

    return (
        <ChatBotProvider>
            <div className="container mx-auto py-6 space-y-6">
                <Card className="mb-6">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg">项目概览（{project.name}）</CardTitle>
                                <CardDescription>单位代码: {project.code}</CardDescription>
                            </div>
                            <div className='flex justify-end gap-2'>
                                <Dialog open={showProjectInfo} onOpenChange={setShowProjectInfo}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-1">
                                            <PencilIcon className="h-4 w-4"/>
                                            编辑基本信息
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
                                    删除项目
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">单位类型</div>
                            <div>{project.type}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">文件数量</div>
                            <div>{fileCount}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">分析任务</div>
                            <div>{project.taskCount}</div>
                        </div>
                    </CardContent>
                </Card>

                <KnowledgeBaseManagement auditUnitId={projectId} auditUnitName={project.name} />

                <ProjectAnalysis projectId={projectId} initialFiles={files}/>

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
            </div>
        </ChatBotProvider>
    );
}