'use client';

import {TIOBComp} from "@/components/projects/detail/tiob-comp";
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {Project} from '@/lib/actions/project-actions';
import {
    useCreateDocumentByFile,
    useDatasetDetails,
    useDatasetDocuments,
    useDeleteDocument
} from '@/hooks/use-dify-dataset';
import {Badge} from '@/components/ui/badge';
import {BarChart2, FileText, Loader2, RefreshCw, Trash2, Upload} from 'lucide-react';
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
import {DocumentSheet, DocumentSheetTrigger} from '@/components/document-sheet';

export default function ProjectAnalysis({
                                            projectId,
                                            project,
                                            onProjectUpdate
                                        }: {
    projectId: string,
    project?: Project,
    onProjectUpdate?: (updates: Partial<Project>) => void
}) {
    const [tiobDialogOpen, setTiobDialogOpen] = useState(false);
    const [uploadingToKnowledgeBase, setUploadingToKnowledgeBase] = useState(false);

    // 知识库相关hooks - 只在项目有datasetId时启用
    const {
        data: dataset,
        error: datasetError,
        isLoading: isLoadingDataset,
        refetch: refetchDataset
    } = useDatasetDetails(project?.datasetId, !!project?.datasetId);

    // 查询知识库文档（使用无限查询）- 简化启用条件，移除对dataset的依赖
    const {
        data: documentsResponse,
        error: documentsError,
        isLoading: isLoadingDocuments,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useDatasetDocuments(project?.datasetId, !!project?.datasetId);

    // 展平所有页面的数据
    const allDocuments = useMemo(() =>
            documentsResponse?.pages?.flatMap(page => page.data) || [],
        [documentsResponse?.pages]
    );

    // 自动加载所有数据 - 移除对fetchNextPage的依赖以避免循环
    useEffect(() => {
        // 如果有数据且还有更多页，自动加载
        if (documentsResponse && hasNextPage && !isFetchingNextPage && !isLoadingDocuments) {
            fetchNextPage();
        }
    }, [documentsResponse?.pages?.length, hasNextPage, isFetchingNextPage, isLoadingDocuments]); // 移除fetchNextPage依赖

    // 上传文档到知识库
    const createDocument = useCreateDocumentByFile(project?.datasetId || '');

    // 删除知识库文档
    const deleteDocument = useDeleteDocument(project?.datasetId || '');

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

    // 触发文件选择
    const triggerFileUpload = () => {
        document.getElementById('file-upload')?.click();
    };

    // 文件选择后处理
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !project?.datasetId) return;

        setUploadingToKnowledgeBase(true);
        let successCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;

        try {
            // 顺序处理文件，以便更好地跟踪每个文件的结果
            for (const file of Array.from(files)) {
                try {
                    const result = await createDocument.mutateAsync({
                        file,
                        options: {
                            indexing_technique: 'high_quality',
                            process_mode: 'automatic'
                        }
                    });

                    // 这里的结果已经通过hook处理了，我们只需要统计
                    // 实际的去重检测在useCreateDocumentByFile中进行
                    successCount++;
                } catch (error) {
                    console.error(`文件 ${file.name} 上传失败:`, error);
                    errorCount++;
                }
            }

            // 重置文件输入
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            // 显示详细的上传结果摘要
            if (files.length > 1) {
                const totalFiles = files.length;
                let message = `文件处理完成`;
                let description = [];

                if (successCount > 0) {
                    description.push(`${successCount} 个文件上传成功`);
                }
                if (duplicateCount > 0) {
                    description.push(`${duplicateCount} 个重复文件已跳过`);
                }
                if (errorCount > 0) {
                    description.push(`${errorCount} 个文件上传失败`);
                }

                if (errorCount > 0) {
                    toast.error(message, {
                        description: description.join('，'),
                        duration: 6000,
                    });
                } else if (duplicateCount > 0) {
                    toast.info(message, {
                        description: description.join('，'),
                        duration: 5000,
                    });
                } else {
                    toast.success(message, {
                        description: description.join('，'),
                        duration: 4000,
                    });
                }
            }
            // 单文件上传的反馈已经在hook中处理了

        } catch (error) {
            console.error('批量文件上传失败:', error);
            toast.error('批量文件上传失败，请重试');
        } finally {
            setUploadingToKnowledgeBase(false);
        }
    };

    // 删除文档
    const handleDeleteDocument = async (documentId: string) => {
        if (!project?.datasetId) return;

        try {
            await deleteDocument.mutateAsync(documentId);
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
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg">文档</CardTitle>
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


                            <Button
                                onClick={triggerFileUpload}
                                disabled={uploadingToKnowledgeBase || !project?.datasetId}
                                size="sm"
                            >
                                {uploadingToKnowledgeBase ? (
                                    <RefreshCw className="h-4 w-4 animate-spin"/>
                                ) : (
                                    <Upload className="h-4 w-4"/>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="w-full">
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept=".txt,.pdf,.doc,.docx,.md"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {!dataset ? (
                        <div className="text-center py-12 text-muted-foreground">
                            知识库初始化中...
                        </div>
                    ) : isLoadingDocuments ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin"/>
                        </div>
                    ) : documentsError ? (
                        <div className="text-center py-12 text-destructive">
                            加载失败，请重试
                        </div>
                    ) : !allDocuments.length ? (
                        // 空状态：整个区域都是上传区域
                        <div
                            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/25 transition-all group"
                            onClick={triggerFileUpload}
                        >
                            <div className="text-center space-y-3">
                                <div
                                    className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                    <Upload
                                        className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors"/>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-base font-semibold">
                                        {uploadingToKnowledgeBase ? '正在上传文档...' : '开始上传文档'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        支持 PDF, DOC, DOCX, TXT, MD 格式
                                    </div>
                                    {uploadingToKnowledgeBase && (
                                        <div
                                            className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                                            <span
                                                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block"/>
                                            处理中，请稍候...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // 有文档状态：显示网格列表 + 底部上传提示
                        <div className="space-y-4 w-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full">
                                {allDocuments.map((doc) => (
                                    <DocumentSheetTrigger
                                        key={doc.id}
                                        datasetId={project?.datasetId || 'default'}
                                        documentId={doc.id}
                                        documentName={doc.name}
                                        onHover={true}
                                    >
                                        <div
                                            className="relative group border rounded-lg p-3 hover:bg-muted/20 transition-colors min-w-0 cursor-pointer">
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
                                    </DocumentSheetTrigger>
                                ))}
                            </div>

                            {/* 加载更多按钮 */}
                            {hasNextPage && (
                                <div className="flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="gap-2"
                                    >
                                        {isFetchingNextPage ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                                加载中...
                                            </>
                                        ) : (
                                            `加载更多文档 (${allDocuments.length} / ${dataset?.document_count || '?'})`
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* 继续上传区域 */}
                            <div
                                className="border border-dashed border-muted-foreground/20 rounded-lg p-4 cursor-pointer hover:bg-muted/10 transition-colors group"
                                onClick={triggerFileUpload}
                            >
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Upload className="h-4 w-4 group-hover:text-primary transition-colors"/>
                                    {uploadingToKnowledgeBase ? (
                                        <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse inline-block"/>
                                        正在上传文档...
                                    </span>
                                    ) : (
                                        '点击添加更多文档'
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <DocumentSheet/>
        </>
    );
}
