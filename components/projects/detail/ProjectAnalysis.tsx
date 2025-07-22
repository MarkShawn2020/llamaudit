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
    const [selectedKbFiles, setSelectedKbFiles] = useState<FileList | null>(null);

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


    // 文件上传处理
    const handleFileUpload = async () => {
        if (!selectedKbFiles || !project?.datasetId) return;

        setUploadingToKnowledgeBase(true);
        try {
            const uploadPromises = Array.from(selectedKbFiles).map(file =>
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
            setSelectedKbFiles(null);
            // 重置文件输入
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error('文件上传失败:', error);
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

    // 获取状态徽章
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />已完成</Badge>;
            case 'waiting':
            case 'queuing':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />等待中</Badge>;
            case 'indexing':
            case 'processing':
                return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />处理中</Badge>;
            case 'error':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />错误</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg">文档</CardTitle>
                        <CardDescription>
                            {dataset ? `${dataset.document_count} 个文档` : '知识库初始化中...'}
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
                            onClick={() => refetchDocuments()}
                            variant="ghost"
                            size="sm"
                            disabled={isLoadingDocuments}
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoadingDocuments ? 'animate-spin' : ''}`} />
                        </Button>

                        <Button
                            onClick={handleFileUpload}
                            disabled={!selectedKbFiles || uploadingToKnowledgeBase || !project?.datasetId}
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
                    onChange={(e) => setSelectedKbFiles(e.target.files)}
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
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 cursor-pointer hover:border-primary/50 hover:bg-muted/25 transition-all"
                        onClick={() => document.getElementById('file-upload')?.click()}
                    >
                        <div className="text-center">
                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <div className="text-lg font-medium mb-2">
                                {selectedKbFiles && selectedKbFiles.length > 0 
                                    ? `已选择 ${selectedKbFiles.length} 个文件` 
                                    : '上传您的第一个文档'
                                }
                            </div>
                            <div className="text-sm text-muted-foreground">
                                支持 PDF, DOC, DOCX, TXT, MD 格式
                            </div>
                        </div>
                    </div>
                ) : (
                    // 有文档状态：显示列表 + 顶部上传提示
                    <div className="space-y-4">
                        {selectedKbFiles && selectedKbFiles.length > 0 && (
                            <div className="p-3 bg-muted/50 rounded-lg text-sm">
                                已选择 {selectedKbFiles.length} 个文件，点击上传按钮添加到知识库
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            {documentsResponse.data.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{doc.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {getStatusBadge(doc.indexing_status)} · {doc.word_count.toLocaleString()} 字
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

                        {/* 继续上传提示 */}
                        <div 
                            className="border border-dashed border-muted-foreground/20 rounded-lg p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <div className="text-center text-sm text-muted-foreground">
                                点击添加更多文档
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
