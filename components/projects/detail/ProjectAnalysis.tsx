'use client';

import {TIOBComp} from "@/components/projects/detail/tiob-comp";
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
import { DifyConfigComponent } from '@/components/dify-config';
import { Project } from '@/lib/actions/project-actions';
import { 
    useDatasetDetails, 
    useDatasetDocuments, 
    useCreateDocumentByFile, 
    useDeleteDocument 
} from '@/hooks/use-dify-dataset';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    FileText,
    Trash2,
    BarChart2,
    RefreshCw,
    Upload,
    Settings
} from 'lucide-react';
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
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';

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

    // 知识库相关hooks
    const { 
        data: dataset, 
        error: datasetError, 
        isLoading: isLoadingDataset,
        refetch: refetchDataset
    } = useDatasetDetails(project?.datasetId, !!project?.datasetId);

    // 查询知识库文档
    const { 
        data: documentsResponse, 
        error: documentsError, 
        isLoading: isLoadingDocuments,
        refetch: refetchDocuments
    } = useDatasetDocuments(project?.datasetId, !!project?.datasetId && !!dataset);

    // 上传文档到知识库
    const createDocument = useCreateDocumentByFile();
    
    // 删除知识库文档
    const deleteDocument = useDeleteDocument();


    // 触发文件选择
    const triggerFileUpload = () => {
        document.getElementById('file-upload')?.click();
    };

    // 文件选择后处理
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !project?.datasetId) return;

        setUploadingToKnowledgeBase(true);
        try {
            const uploadPromises = Array.from(files).map(file =>
                createDocument.mutateAsync({
                    datasetId: project.datasetId!,
                    file,
                    options: {
                        indexing_technique: 'high_quality',
                        process_mode: 'automatic'
                    }
                })
            );

            await Promise.all(uploadPromises);
            
            // 重置文件输入
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            
            toast.success(`成功上传 ${files.length} 个文件`);
        } catch (error) {
            console.error('文件上传失败:', error);
            toast.error('文件上传失败，请重试');
        } finally {
            setUploadingToKnowledgeBase(false);
        }
    };

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

    // 获取状态徽章 - 统一设计系统
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                        已完成
                    </Badge>
                );
            case 'waiting':
            case 'queuing':
                return (
                    <Badge variant="secondary" className="text-xs">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1" />
                        等待中
                    </Badge>
                );
            case 'indexing':
            case 'processing':
                return (
                    <Badge variant="secondary" className="text-xs">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse" />
                        处理中
                    </Badge>
                );
            case 'error':
                return (
                    <Badge variant="destructive" className="text-xs">
                        <div className="w-2 h-2 bg-current rounded-full mr-1" />
                        错误
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-xs">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full mr-1" />
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
                        <CardTitle className="text-lg">文档</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {dataset ? (
                                <span className="flex items-center gap-2">
                                    <span>{dataset.document_count} 个文档</span>
                                    {dataset.document_count > 0 && (
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    )}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    知识库初始化中...
                                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={tiobDialogOpen} onOpenChange={setTiobDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <BarChart2 className="h-4 w-4" />
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

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>配置</DialogTitle>
                                </DialogHeader>
                                <DifyConfigComponent />
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={triggerFileUpload}
                            disabled={uploadingToKnowledgeBase || !project?.datasetId}
                            size="sm"
                        >
                            {uploadingToKnowledgeBase ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
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
                        <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                ) : documentsError ? (
                    <div className="text-center py-12 text-destructive">
                        加载失败，请重试
                    </div>
                ) : !documentsResponse?.data.length ? (
                    // 空状态：整个区域都是上传区域
                    <div 
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 cursor-pointer hover:border-primary/50 hover:bg-muted/25 transition-all group"
                        onClick={triggerFileUpload}
                    >
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <div className="text-lg font-semibold">
                                    {uploadingToKnowledgeBase ? '正在上传文档...' : '开始上传文档'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    支持 PDF, DOC, DOCX, TXT, MD 格式文件
                                </div>
                                {uploadingToKnowledgeBase && (
                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        文档正在处理中，请稍候...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // 有文档状态：显示列表 + 底部上传提示
                    <div className="space-y-4">
                        <div className="space-y-3">
                            {documentsResponse.data.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="font-medium truncate text-sm">{doc.name}</div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                {getStatusBadge(doc.indexing_status)}
                                                <span className="flex items-center gap-1">
                                                    <span>字数：</span>
                                                    <span className="font-mono">{doc.word_count.toLocaleString()}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <Trash2 className="h-4 w-4" />
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

                        {/* 继续上传区域 */}
                        <div 
                            className="border border-dashed border-muted-foreground/20 rounded-lg p-4 cursor-pointer hover:bg-muted/10 transition-colors group"
                            onClick={triggerFileUpload}
                        >
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Upload className="h-4 w-4 group-hover:text-primary transition-colors" />
                                {uploadingToKnowledgeBase ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
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
    );
}
