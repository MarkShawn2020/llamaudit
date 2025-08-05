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
import {deleteProject, Project as BaseProject} from '@/lib/api/project-api';
import KnowledgeBase from '@/components/projects/detail/knowledge-base';
import ProjectInfo from 'components/projects/detail/ProjectInfo';
import {Building2, Calendar, FileText, Mail, MapPin, PencilIcon, Phone, TrashIcon, User} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback, useState} from 'react';
import {toast} from 'sonner';
import {useAtom} from 'jotai';
import {projectTiobItemsAtomFamily} from '@/components/projects/detail/project-atoms';

interface Project extends BaseProject {
    fileCount?: number; // 兼容新命名
}

export default function ProjectDetail({project: initialProject}: { project: Project }) {
    const [project, setProject] = useState<Project>(initialProject);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showProjectInfo, setShowProjectInfo] = useState(false);
    // 使用项目特定的原子化状态
    const [tiobItems] = useAtom(projectTiobItemsAtomFamily(project.id));
    const router = useRouter();


    // logger.info('ProjectDetail', {projectId, project});


    const handleProjectUpdate = useCallback((updated: Partial<Project>) => {
        setProject(prev => ({...prev, ...updated}));
    }, []);


    // 移除冗余的知识库初始化逻辑
    // 知识库初始化现在由KnowledgeBase组件统一处理

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

    if (error) {
        return (<div className="container mx-auto py-6">
            <div className="text-center py-12 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium text-red-600">{error}</h3>
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
            projectId={project.id}
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