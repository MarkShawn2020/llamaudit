'use client';

import {FileCard} from "@/components/projects/detail/file-card";
import {projectFilesAtomFamily} from '@/components/projects/detail/project-atoms';
import {TIOBComp} from "@/components/projects/detail/tiob-comp";
import {AnalysisEvent, AnalysisEventSource} from "@/components/projects/utils/analysis-event";
import {UIFile} from "@/components/projects/utils/ui-file";
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {useToast} from '@/components/ui/use-toast';
import {deleteProjectFile, saveFileAnalysisResult} from '@/lib/actions/file-actions';
import {getFilesByProjectId} from '@/lib/db/documents';
import {logger} from '@/lib/logger';
import {useAtom} from 'jotai'
import {BarChart2, RefreshCw, Upload} from 'lucide-react';
import {startTransition, useActionState, useCallback, useEffect, useRef, useState} from 'react';
import { DifyConfigComponent } from '@/components/dify-config';
import { useDifyConfig } from '@/contexts/dify-config-context';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {Database} from 'lucide-react';
import { useSyncFileToKnowledgeBase, useRemoveFileFromKnowledgeBase, useInvalidateKnowledgeBase } from '@/hooks/use-knowledge-base';
import { useProjectFiles } from '@/hooks/use-project-files';

export default function FilesTab({
                                            projectId, initialFiles = [], onFileChange
                                        }: {
    projectId: string, initialFiles?: UIFile[],  // Changed from ProjectFile[] to UIFile[]
    onFileChange?: (files: UIFile[]) => void
}) {
    // 使用React Query获取文件数据
    const { data: queryFiles = [], isLoading: queryLoading } = useProjectFiles(projectId);
    
    // Use project-specific atom instead of global atom
    const [files, setFiles] = useAtom(projectFilesAtomFamily(projectId));
    const [isLoading, setIsLoading] = useState(true);
    
    // 同步React Query数据到Jotai atom
    useEffect(() => {
      if (queryFiles.length > 0) {
        setFiles(queryFiles);
      }
      // 无论是否有文件，都标记加载完成
      if (!queryLoading) {
        setIsLoading(false);
      }
    }, [queryFiles, queryLoading, setFiles]);
    const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(new Set());
    
    // 切换文件展开状态
    const toggleFileExpanded = useCallback((fileId: string) => {
        setExpandedFileIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileId)) {
                newSet.delete(fileId);
            } else {
                newSet.add(fileId);
            }
            return newSet;
        });
    }, []);

    // 当文件状态变化时自动管理展开状态
    useEffect(() => {
        files.forEach(file => {
            // 如果文件开始分析，自动展开
            if (file.status === 'analyzing') {
                setExpandedFileIds(prev => new Set(prev).add(file.id));
            }
        });
    }, [files]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {toast} = useToast();
    const [filesState, getFilesAction] = useActionState(getFilesByProjectId, [])
    const [tiobDialogOpen, setTiobDialogOpen] = useState(false);
    const { config: difyConfig } = useDifyConfig();
    const [globalSyncEnabled, setGlobalSyncEnabled] = useState(true); // 全局同步设置
    
    // React Query mutations for knowledge base sync
    const syncFileToKB = useSyncFileToKnowledgeBase();
    const removeFileFromKB = useRemoveFileFromKnowledgeBase();
    const { invalidateAll } = useInvalidateKnowledgeBase();





    // 触发文件选择对话框
    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // 处理文件上传
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        // 创建临时文件数组，先将所有文件添加到UI中
        const tempFiles: UIFile[] = Array.from(selectedFiles).map(file => ({
            id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`,
            originalName: file.name,
            fileSize: file.size,
            fileType: file.type,
            filePath: '',
            uploadDate: new Date().toISOString(),
            status: 'uploading',
            userId: '',
            isAnalyzed: false,
            progress: 0,
            syncToKnowledgeBase: globalSyncEnabled // 使用全局设置作为默认值
        }));

        // 批量更新所有文件到状态中
        setFiles(prev => [...tempFiles, ...prev]);

        // 通知父组件文件数量变化
        if (onFileChange) {
            onFileChange([...tempFiles, ...files]);
        }

        // 并行处理多个文件上传
        const uploadTasks = Array.from(selectedFiles).map((file, index) => {
            const tempFile = tempFiles[index]; // 获取对应的临时文件对象
            return uploadFile(file, tempFile.id);
        });

        // 所有上传完成后的操作
        Promise.all(uploadTasks)
            .then((results) => {
                logger.info(`All ${results.length} files upload completed`);
            })
            .catch(error => {
                logger.error('Error handling file uploads:', error);
            });

        // 重置文件输入以允许重复上传同一个文件
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 上传单个文件 - 返回Promise以支持并行上传
    const uploadFile = async (file: File, tempFileId: string): Promise<string> => {

        try {
            // 创建FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('user', projectId); // 实际上是将projectId作为auditUnitId传递

            // 为每个文件创建唯一的上传ID，用于跟踪上传进度
            const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // 模拟上传进度 - 为每个文件单独跟踪进度
            const progressInterval = setInterval(() => {
                setFiles(prev => prev.map(file => file.id === tempFileId && file.status === 'uploading' ? {
                    ...file,
                    progress: Math.min((file.progress || 0) + 10, 90)
                } : file));
            }, 300);

            // 发送上传请求 - 使用 AbortController 以支持取消上传
            const controller = new AbortController();
            const signal = controller.signal;

            // 获取当前文件的同步设置
            const currentFile = files.find(f => f.id === tempFileId);
            const shouldSync = currentFile?.syncToKnowledgeBase ?? globalSyncEnabled;

            const uploadUrl = shouldSync 
                ? `/api/projects/${projectId}/upload-to-knowledge-base`
                : `/api/projects/${projectId}/upload`;

            const response = await fetch(uploadUrl, {
                method: 'POST', body: formData, signal
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '上传失败');
            }

            const data = await response.json();

            // 更新文档状态为已上传
            setFiles(prev => prev.map(file => file.id === tempFileId ? {
                ...file,
                id: data.id,
                status: 'uploaded',
                progress: 100,
                filePath: data.filePath || '',
                userId: data.userId || ''
            } : file));

            toast({
                title: '上传成功', 
                description: shouldSync 
                    ? `文件 ${file.name} 上传成功并已同步到知识库`
                    : `文件 ${file.name} 上传成功`,
            });

            // 如果同步到知识库，手动触发知识库数据更新
            if (shouldSync) {
                // 文件已通过upload-to-knowledge-base端点上传并同步
                // 手动刷新知识库相关查询
                invalidateAll(projectId);
            }

            // 返回服务器分配的文件ID
            return data.id || "";
        } catch (error) {
            console.error('文件上传失败:', error);

            // 更新文件状态为上传失败
            setFiles(prev => prev.map(file => file.id === tempFileId ? {
                ...file,
                status: 'upload_failed',
                error: error instanceof Error ? error.message : '上传失败'
            } : file));

            toast({
                title: '上传失败',
                description: `文件 ${file.name} 上传失败: ${error instanceof Error ? error.message : '未知错误'}`,
                variant: 'destructive'
            });

            return "";
        }
    };

    // 删除文件
    const handleRemoveFile = async (file: UIFile) => {
        try {
            // 使用server action删除文件
            const result = await deleteProjectFile(projectId, file.id);

            if (result.success) {
                // 从列表中移除文件
                const updatedFiles = files.filter(f => f.id !== file.id);
                setFiles(updatedFiles);

                // 通知父组件文件数量变化
                if (onFileChange) {
                    onFileChange(updatedFiles);
                }

                toast({
                    title: '删除成功', description: `文件 ${file.originalName} 已成功删除`
                });
            } else {
                throw new Error('删除文件失败');
            }
        } catch (error) {
            console.error('删除文件失败:', error);
            toast({
                title: '删除失败',
                description: `无法删除文件: ${error instanceof Error ? error.message : '未知错误'}`,
                variant: 'destructive'
            });
        }
    };

    // 批量分析文件
    const handleAnalyzeMultipleFiles = async (filesToAnalyze: UIFile[]) => {
        // 确保有文件需要分析
        if (!filesToAnalyze || filesToAnalyze.length === 0) return;

        logger.info(`批量分析 ${filesToAnalyze.length} 个文件`, {
            projectId, fileIds: filesToAnalyze.map(f => f.id)
        });

        try {
            // 使用Promise.all并行处理所有文件的分析
            const analysisPromises = filesToAnalyze.map(file => handleAnalyzeFile(file));

            // 等待所有分析完成
            await Promise.all(analysisPromises);

            // 所有文件分析完成后的通知
            toast({
                title: '批量分析完成', description: `已完成 ${filesToAnalyze.length} 个文件的分析`
            });
        } catch (error) {
            // 错误已在handleAnalyzeFile中处理，这里只需记录总体错误
            logger.error('批量分析总体异常', {error: error instanceof Error ? error.message : '未知错误'});
        }
    };

    // 分析单个文件
    const handleAnalyzeFile = async (file: UIFile) => {
        let eventSource: AnalysisEventSource | null = null;
        try {
            // 更新文件状态为分析中
            setFiles(prev => prev.map(f => f.id === file.id ? {...f, status: 'analyzing', analysisResult: ''} : f));

            // 创建EventSource进行流式分析，传递Dify配置
            eventSource = new AnalysisEventSource([file.id], difyConfig);

            // 分析结果
            let combinedResult = '';

            // 处理事件
            eventSource.onEvent((data) => {
                try {
                    if (data.event === 'error') {
                        throw new Error(data.message || '分析失败');
                    }

                    // Dify直接返回的数据，包含answer字段
                    if (data.answer) {
                        combinedResult += data.answer;

                        // 更新分析结果
                        setFiles(prev => prev.map(f => f.id === file.id ? {...f, analysisResult: combinedResult} : f));
                    }

                    // 分析完成
                    if (data.event === 'done') {
                        // 更新文件状态为已分析
                        setFiles(prev => prev.map(f => f.id === file.id ? {
                            ...f,
                            status: 'analyzed',
                            isAnalyzed: true
                        } : f));

                        // 关闭连接
                        if (eventSource) {
                            eventSource.close();
                        }

                        // 保存分析结果到数据库
                        saveAnalysisResult(file.id, combinedResult);
                    }
                } catch (error) {
                    console.error('处理分析事件失败:', error);
                    if (eventSource) {
                        handleAnalysisError(file.id, error, eventSource);
                    }
                }
            });

            // 处理错误
            eventSource.onError((error) => {
                console.error('分析事件源错误:', error);
                if (eventSource) {
                    handleAnalysisError(file.id, error, eventSource);
                }
            });

        } catch (error) {
            console.error('启动分析失败:', error);
            if (eventSource) {
                handleAnalysisError(file.id, error, eventSource);
            }
        }
    };

    // 处理分析错误 - 支持单个或多个文件ID
    const handleAnalysisError = (fileIds: string | string[], error: any, eventSource?: AnalysisEventSource | EventSource) => {
        // 关闭EventSource
        if (eventSource) {
            eventSource.close();
        }

        // 更新文件状态为分析失败 - 支持单个或多个文件ID
        const fileIdArray = Array.isArray(fileIds) ? fileIds : [fileIds];

        setFiles(prev => prev.map(f => fileIdArray.includes(f.id) ? {
            ...f, status: 'analysis_failed', error: error instanceof Error ? error.message : '分析过程中出现错误'
        } : f));

        toast({
            title: '分析失败',
            description: error instanceof Error ? error.message : '分析过程中出现错误',
            variant: 'destructive'
        });
    };

    // 保存分析结果
    const saveAnalysisResult = async (fileId: string, result: string) => {
        try {
            // 使用server action保存分析结果
            await saveFileAnalysisResult(fileId, result);
        } catch (error) {
            console.error('保存分析结果请求失败:', error);
            toast({
                title: '保存失败', description: '无法保存分析结果，请稍后重试', variant: 'destructive'
            });
        }
    };

    // 处理单个文件的同步切换
    const handleSyncToggle = async (file: UIFile, syncEnabled: boolean) => {
        // 立即设置loading状态
        setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, syncToKnowledgeBase: syncEnabled, syncLoading: true } : f
        ));

        try {
            // 如果启用同步且文件已上传，同步到知识库
            if (syncEnabled && (file.status === 'uploaded' || file.status === 'analyzed')) {
                await syncFileToKB.mutateAsync({ projectId, fileId: file.id });
                
                toast({
                    title: '同步成功',
                    description: `文件 ${file.originalName} 已同步到知识库`
                });

            } else if (!syncEnabled) {
                // 如果禁用同步，从知识库中移除
                await removeFileFromKB.mutateAsync({ projectId, fileId: file.id });
                
                toast({
                    title: '移除成功',
                    description: `文件 ${file.originalName} 已从知识库移除`
                });
            }

            // 操作成功，移除loading状态
            setFiles(prev => prev.map(f => 
                f.id === file.id ? { ...f, syncLoading: false } : f
            ));

        } catch (error) {
            // 如果操作失败，恢复之前的状态并移除loading
            setFiles(prev => prev.map(f => 
                f.id === file.id ? { ...f, syncToKnowledgeBase: !syncEnabled, syncLoading: false } : f
            ));
            
            toast({
                title: '同步操作失败',
                description: error instanceof Error ? error.message : '未知错误',
                variant: 'destructive'
            });
        }
    };

    return (<div className="space-y-6 py-4">
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <h3 className="text-lg font-medium">项目文档分析</h3>

                    {/* 全局同步设置 - 在小屏幕上显示在标题下方 */}
                    <div className="flex items-center space-x-2 sm:order-none order-last">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="global-sync" className="text-sm font-medium whitespace-nowrap">
                            默认同步到知识库
                        </Label>
                        <Switch
                            id="global-sync"
                            checked={globalSyncEnabled}
                            onCheckedChange={setGlobalSyncEnabled}
                        />
                    </div>
                </div>
                
                {/* 操作按钮组 - 在小屏幕上换行 */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Dialog open={tiobDialogOpen} onOpenChange={setTiobDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                                <BarChart2 className="h-4 w-4 mr-2"/>
                                <span className="hidden sm:inline">三重一大事项</span>
                                <span className="sm:hidden">三重一大</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="!max-w-[95vw] sm:!max-w-[90vw] overflow-hidden">
                            <DialogHeader>
                                <DialogTitle>三重一大事项分析</DialogTitle>
                                <DialogDescription>
                                    从项目文档中提取的重大问题决策、项目安排、资金使用等事项
                                </DialogDescription>
                            </DialogHeader>
                            <div className="overflow-auto max-h-[70vh] sm:max-h-[80vh]">
                                <TIOBComp project={{name: projectId}}/>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => {
                            const filesToAnalyze = files.filter(f => f.status === 'uploaded' || f.status === 'analysis_failed');
                            if (filesToAnalyze.length > 0) {
                                handleAnalyzeMultipleFiles(filesToAnalyze);
                            } else {
                                toast({
                                    title: '没有可分析的文件',
                                    description: '请先上传文件再进行分析',
                                    variant: 'destructive'
                                });
                            }
                        }}
                    >
                        <RefreshCw className="h-4 w-4 mr-2"/>
                        <span className="hidden sm:inline">批量分析</span>
                        <span className="sm:hidden">分析</span>
                    </Button>

                    <Button onClick={handleUploadClick} size="sm" className="flex-1 sm:flex-none">
                        <Upload className="h-4 w-4 mr-2"/>
                        <span className="hidden sm:inline">上传文档</span>
                        <span className="sm:hidden">上传</span>
                    </Button>

                    <DifyConfigComponent />
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                multiple
                accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
            />

            {isLoading ? (<div className="h-40 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                        <p className="mt-2 text-sm text-muted-foreground">加载文件列表...</p>
                    </div>
                </div>) : files.length === 0 ? (
                <div className="h-40 border rounded-lg flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2"/>
                        <p>尚未上传任何文件</p>
                        <p className="text-xs mt-1">点击上传按钮添加文件进行分析</p>
                    </div>
                </div>) : (<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {files.map(file => (<FileCard
                            key={file.id}
                            file={file}
                            onAnalyze={handleAnalyzeFile}
                            onRemove={handleRemoveFile}
                            expanded={expandedFileIds.has(file.id)}
                            onToggleExpanded={toggleFileExpanded}
                            onSyncToggle={handleSyncToggle}
                        />))}
                </div>)}
        </div>);
}
