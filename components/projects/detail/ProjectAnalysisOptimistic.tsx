/**
 * 带乐观更新的项目分析组件
 * 基于原有的ProjectAnalysis组件，集成乐观文件上传功能
 */

'use client';

import {TIOBComp} from "@/components/projects/detail/tiob-comp";
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {Project} from '@/lib/actions/project-actions';
import {useDatasetDetails, useDatasetDocuments, useDeleteDocument} from '@/hooks/use-dify-dataset';
import {Badge} from '@/components/ui/badge';
import {BarChart2, FileText, RefreshCw, Trash2,} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {useEffect, useMemo, useRef, useState} from 'react';
import {toast} from 'sonner';
import OptimisticFileUpload from '@/components/optimistic-file-upload';
import {Separator} from '@/components/ui/separator';

export default function ProjectAnalysisOptimistic({
                                                      projectId,
                                                      project,
                                                      onProjectUpdate
                                                  }: {
    projectId: string,
    project?: Project,
    onProjectUpdate?: (updates: Partial<Project>) => void
}) {
    const [tiobDialogOpen, setTiobDialogOpen] = useState(false);

    // 知识库相关hooks
    const {
        data: dataset,
        error: datasetError,
        isLoading: isLoadingDataset,
        refetch: refetchDataset
    } = useDatasetDetails(project?.datasetId, !!project?.datasetId);

    // 查询知识库文档（用于显示现有文档）
    const {
        data: documentsResponse,
        error: documentsError,
        isLoading: isLoadingDocuments,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useDatasetDocuments(project?.datasetId, !!project?.datasetId && !!dataset);

    // 展平所有页面的数据
    const allDocuments = useMemo(() =>
            documentsResponse?.pages?.flatMap(page => page.data) || [],
        [documentsResponse?.pages]
    );

    // 自动加载所有数据
    useEffect(() => {
        if (documentsResponse && hasNextPage && !isFetchingNextPage && !isLoadingDocuments) {
            fetchNextPage();
        }
    }, [documentsResponse, hasNextPage, isFetchingNextPage, isLoadingDocuments, fetchNextPage]);

    // 删除知识库文档
    const deleteDocument = useDeleteDocument();

    // 用于跟踪文档状态变化的ref
    const previousDocsRef = useRef<any[]>([]);

    // 监听文档状态变化，显示完成通知
    useEffect(() => {
        if (allDocuments.length > 0) {
            const currentDocs = allDocuments;
            const previousDocs = previousDocsRef.current;

            // 检查状态变化
            currentDocs.forEach((currentDoc) => {
                const prevDoc = previousDocs.find(doc => doc.id === currentDoc.id);
                if (prevDoc) {
                    // 从处理中变为已完成
                    if (['waiting', 'queuing', 'indexing', 'splitting', 'processing'].includes(prevDoc.indexing_status) &&
                        currentDoc.indexing_status === 'completed') {
                        toast.success(`文档 "${currentDoc.name}" 处理完成`, {
                            description: `${currentDoc.word_count.toLocaleString()} 字，可以开始分析`,
                            duration: 5000,
                        });
                    }
                    // 从正常状态变为错误状态
                    if (!['error', 'failed'].includes(prevDoc.indexing_status) &&
                        ['error', 'failed'].includes(currentDoc.indexing_status)) {
                        toast.error(`文档 "${currentDoc.name}" 处理失败`, {
                            description: '请重新上传或检查文档格式',
                            duration: 8000,
                        });
                    }
                }
            });

            // 更新previous docs
            previousDocsRef.current = currentDocs;
        }
    }, [allDocuments]);

    // 删除文档
    const handleDeleteDocument = async (documentId: string) => {
        if (!project?.datasetId) return;

        try {
            await deleteDocument.mutateAsync({
                datasetId: project.datasetId,
                documentId
            });
        } catch (error) {
            console.error('删除文档失败:', error);
        }
    };

    // 获取状态徽章 - 紧凑设计系统
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200 h-5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 inline-block"/>
                        已完成
                    </Badge>
                );
            case 'waiting':
            case 'queuing':
                return (
                    <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 h-5">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1 animate-pulse inline-block"/>
                        等待处理
                    </Badge>
                );
            case 'splitting':
                return (
                    <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-200 h-5">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1 animate-pulse inline-block"/>
                        分段中
                    </Badge>
                );
            case 'indexing':
            case 'processing':
                return (
                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200 h-5">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse inline-block"/>
                        索引中
                    </Badge>
                );
            case 'error':
            case 'failed':
                return (
                    <Badge variant="destructive" className="text-xs h-5">
                        <span className="w-1.5 h-1.5 bg-current rounded-full mr-1 inline-block"/>
                        失败
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-xs h-5">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full mr-1 inline-block"/>
                        {status}
                    </Badge>
                );
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg">文档管理</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            <FileText className="h-4 w-4"/>
                            {dataset ? (
                                <span className="flex items-center gap-2">
                                    <span>{allDocuments.length} 个文档</span>
                                    {allDocuments.length > 0 && (
                                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block"/>
                                    )}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    知识库初始化中...
                                    <span className="w-2 h-2 bg-current rounded-full animate-pulse inline-block"/>
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={tiobDialogOpen} onOpenChange={setTiobDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <BarChart2 className="h-4 w-4"/>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="!max-w-[90vw] overflow-hidden">
                                <DialogHeader>
                                    <DialogTitle>三重一大事项分析</DialogTitle>
                                </DialogHeader>
                                <div className="overflow-auto max-h-[80vh]">
                                    <TIOBComp project={{name: projectId}}/>
                                </div>
                            </DialogContent>
                        </Dialog>

                    </div>
                </div>
            </CardHeader>

            <CardContent className="w-full space-y-6">
                {!dataset ? (
                    <div className="text-center py-12 text-muted-foreground">
                        知识库初始化中...
                    </div>
                ) : (
                    <>
                        {/* 乐观文件上传组件 */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-sm">上传新文档</h3>
                                <div className="text-xs text-muted-foreground">
                                    支持拖拽上传，实时进度反馈
                                </div>
                            </div>
                            <OptimisticFileUpload
                                datasetId={project?.datasetId || ''}
                                className="border rounded-lg p-4"
                            />
                        </div>

                        <Separator/>

                        {/* 现有文档列表 */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-sm">知识库文档</h3>
                                <div className="text-xs text-muted-foreground">
                                    {allDocuments.length} 个文档
                                </div>
                            </div>

                            {isLoadingDocuments ? (
                                <div className="flex justify-center py-12">
                                    <RefreshCw className="h-6 w-6 animate-spin"/>
                                </div>
                            ) : documentsError ? (
                                <div className="text-center py-12 text-destructive">
                                    加载失败，请重试
                                </div>
                            ) : !allDocuments.length ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <div className="space-y-2">
                                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50"/>
                                        <div className="text-sm">暂无文档</div>
                                        <div className="text-xs">上传文档后将在此处显示</div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full">
                                    {allDocuments.map((doc) => (
                                        <div key={doc.id}
                                             className="relative group border rounded-lg p-3 hover:bg-muted/20 transition-colors min-w-0">
                                            <div className="flex items-start gap-3">
                                                <FileText
                                                    className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5"/>
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div
                                                        className="font-medium text-sm leading-tight pr-6 truncate">{doc.name}</div>
                                                    <div className="space-y-1.5">
                                                        {getStatusBadge(doc.indexing_status)}
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            {doc.word_count.toLocaleString()} 字
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                                                    >
                                                        <Trash2
                                                            className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            确定要删除文档 "{doc.name}" 吗？
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteDocument(doc.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            删除
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}