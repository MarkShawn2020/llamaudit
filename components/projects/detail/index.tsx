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
import {PencilIcon, TrashIcon} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';

interface Project extends BaseProject {
    fileCount?: number; // 兼容新命名
    tiobItems?: TIOBInterface[];
}

export default function ProjectDetail({projectId}: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showProjectInfo, setShowProjectInfo] = useState(false);
    // 添加独立的文件计数状态，初始值为项目的文件数量
    const [fileCount, setFileCount] = useState<number>(0);
    // 添加提取的三重一大事项
    // const [tiobItems, setTiobItems] = useState<TIOBInterface[]>([]);
    const router = useRouter();

    logger.info('ProjectDetail', {projectId, project});

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
            // 初始化文件计数 - 优先使用实际文件数组长度
            const count = data.files?.length || 0;
            setFileCount(count);

        } catch (error) {
            console.error('加载项目详情失败:', error);
            setError('加载项目详情失败');
            toast.error('加载项目详情失败');
        } finally {
            setLoading(false);
        }
    };

    // 从文件中提取三重一大事项
    const extractTiobItems = (files: any[]): TIOBInterface[] => {
        const allTiobItems: TIOBInterface[] = [];

        files.forEach(file => {
            if (file.isAnalyzed && file.metadata) {
                try {
                    // 从metadata字符串中提取JSON部分
                    const metadataStr = file.metadata;
                    const jsonMatch = metadataStr.match(/```json\n([\s\S]*)\n```/);
                    // logger.info("jsonMatch: ", jsonMatch);

                    if (jsonMatch && jsonMatch[1]) {
                        const metadata = JSON.parse(jsonMatch[1]);
                        logger.info("metadata: ", metadata);

                        if (metadata.tiobItems && metadata.tiobItems.length > 0) {
                            // 添加来源文件信息
                            const itemsWithSource = metadata.tiobItems.map((item: TIOBInterface) => ({
                                ...item, sourceFile: file.filename || file.originalName
                            }));

                            allTiobItems.push(...itemsWithSource);
                        }
                    }
                } catch (e) {
                    console.error('解析文件元数据失败:', file.filename || file.originalName, e);
                }
            }
        });

        return allTiobItems;
    };

    // 处理文件变化，更新文件计数和三重一大事项
    const handleFilesChange = (files: any[]) => {
        // 更新文件计数
        setFileCount(files.length);

        // 更新项目对象中的文件数
        if (project) {
            setProject({...project, fileCount: files.length});
        }
    };

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

    const tiobItems = extractTiobItems(project?.files ?? [])

    logger.info("project detail: ", {project, tiobItems});


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

        <ProjectAnalysis projectId={projectId} initialFiles={project.files} onFileChange={handleFilesChange}/>

        <TIOBComp project={{name: project.name}} tiobItems={tiobItems}/>

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