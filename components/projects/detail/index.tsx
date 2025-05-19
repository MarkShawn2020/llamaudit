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
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {deleteProject, getProject, Project as BaseProject} from '@/lib/api/project-api';
import {logger} from '@/lib/logger';
import ProjectAnalysis from 'components/projects/detail/ProjectAnalysis';
import ProjectInfo from 'components/projects/detail/ProjectInfo';
import {saveAs} from 'file-saver';
import {AlertTriangle, Download, PencilIcon, TrashIcon} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import * as XLSX from 'xlsx';

// 扩展Project类型，兼容新旧字段名
interface TripleOneMajorItem {
    categoryType: string;
    details: string;
    amount: string;
    departments: string;
    personnel: string;
    decisionBasis: string;
    originalText: string;
    sourceFile?: string; // 添加来源文件名
}

interface Project extends BaseProject {
    fileCount?: number; // 兼容新命名
    tripleOneMajorItems?: TripleOneMajorItem[];
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
    const [tripleOneMajorItems, setTripleOneMajorItems] = useState<TripleOneMajorItem[]>([]);
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

            // 解析所有文件的元数据，提取三重一大事项
            if (data.files && data.files.length > 0) {
                const allTripleOneItems: TripleOneMajorItem[] = [];

                data.files.forEach(file => {
                    if (file.isAnalyzed && file.metadata) {
                        try {
                            // 从metadata字符串中提取JSON部分
                            const metadataStr = file.metadata;
                            const jsonMatch = metadataStr.match(/```json\n([\s\S]*)\n```/);

                            if (jsonMatch && jsonMatch[1]) {
                                const metadata = JSON.parse(jsonMatch[1]);

                                if (metadata.tripleOneMajorItems && metadata.tripleOneMajorItems.length > 0) {
                                    // 添加来源文件信息
                                    const itemsWithSource = metadata.tripleOneMajorItems.map((item: TripleOneMajorItem) => ({
                                        ...item, sourceFile: file.filename
                                    }));

                                    allTripleOneItems.push(...itemsWithSource);
                                }
                            }
                        } catch (e) {
                            console.error('解析文件元数据失败:', file.filename, e);
                        }
                    }
                });

                setTripleOneMajorItems(allTripleOneItems);
            }
        } catch (error) {
            console.error('加载项目详情失败:', error);
            setError('加载项目详情失败');
            toast.error('加载项目详情失败');
        } finally {
            setLoading(false);
        }
    };

    const handleProjectUpdate = (updated: Partial<Project>) => {
        if (!project) return;
        setProject({...project, ...updated});
    };

    // 导出三重一大事项数据函数
    const exportTripleOneMajorItems = (items: TripleOneMajorItem[]) => {
        if (!items || items.length === 0) {
            toast.error('没有可导出的数据');
            return;
        }

        try {
            // 格式化导出数据
            const exportData = items.map(item => ({
                '类型': item.categoryType === 'majorProject' ? '重大项目' : item.categoryType === 'majorFund' ? '大额资金' : item.categoryType === 'majorDecision' ? '重大决策' : item.categoryType,
                '事项内容': item.details,
                '金额': item.amount,
                '责任部门': item.departments,
                '相关人员': item.personnel,
                '决策依据': item.decisionBasis,
                '来源文件': item.sourceFile || '未知'
            }));

            // 创建工作簿
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // 添加工作表到工作簿
            XLSX.utils.book_append_sheet(wb, ws, '三重一大事项');

            // 生成Excel文件并下载
            const excelBuffer = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});
            const blob = new Blob([excelBuffer], {type: 'application/octet-stream'});

            // 使用当前日期作为文件名的一部分
            const fileName = `${project?.name || '项目'}_三重一大事项_${new Date().toISOString().split('T')[0]}.xlsx`;
            saveAs(blob, fileName);

            toast.success('导出成功');
        } catch (error) {
            console.error('导出数据失败:', error);
            toast.error('导出数据失败，请重试');
        }
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

                            <div className="flex items-center justify-between gap-2">

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


            <ProjectAnalysis
                projectId={projectId}
                initialFiles={project.files || []}
                onFileChange={(files) => {
                    // 当文件列表变化时更新文件计数
                    setFileCount(files.length);
                }}
            />

            {tripleOneMajorItems.length > 0 && (<Card className="mb-6">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500"/>
                                <CardTitle className="text-lg">三重一大事项分析</CardTitle>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => exportTripleOneMajorItems(tripleOneMajorItems)}
                            >
                                <Download className="h-4 w-4"/>
                                导出数据
                            </Button>
                        </div>
                        <CardDescription>
                            从项目文档中提取的重大决策、项目安排、资金使用等事项
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>类型</TableHead>
                                    <TableHead>事项内容</TableHead>
                                    <TableHead>金额</TableHead>
                                    <TableHead>责任部门</TableHead>
                                    <TableHead>相关人员</TableHead>
                                    <TableHead>决策依据</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tripleOneMajorItems.map((item, index) => (<TableRow key={index}>
                                        <TableCell className="font-medium">
                                            {item.categoryType === 'majorProject' ? '重大项目' : item.categoryType === 'majorFund' ? '大额资金' : item.categoryType === 'majorDecision' ? '重大决策' : item.categoryType}
                                        </TableCell>
                                        <TableCell>{item.details}</TableCell>
                                        <TableCell>{item.amount}</TableCell>
                                        <TableCell>{item.departments}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={item.personnel}>
                                            {item.personnel}
                                        </TableCell>
                                        <TableCell>{item.decisionBasis}</TableCell>
                                    </TableRow>))}
                            </TableBody>
                        </Table>
                        <div className="mt-4 text-sm text-muted-foreground">
                            总计发现 {tripleOneMajorItems.length} 项三重一大事项
                        </div>
                    </CardContent>
                </Card>)}

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