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

export default function FilesTab({
                                            projectId, initialFiles = [], onFileChange
                                        }: {
    projectId: string, initialFiles?: UIFile[],  // Changed from ProjectFile[] to UIFile[]
    onFileChange?: (files: UIFile[]) => void
}) {
    // Use project-specific atom instead of global atom
    const [files, setFiles] = useAtom(projectFilesAtomFamily(projectId));
    const [isLoading, setIsLoading] = useState(true);
    const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {toast} = useToast();
    const [filesState, getFilesAction] = useActionState(getFilesByProjectId, [])
    const [tiobDialogOpen, setTiobDialogOpen] = useState(false);
    const { config: difyConfig } = useDifyConfig();
    const [globalSyncEnabled, setGlobalSyncEnabled] = useState(true); // 全局同步设置

    // 初始化 Jotai atom 状态
    useEffect(() => {
        if (initialFiles.length > 0) {
            setFiles(initialFiles);
        }
    }, [initialFiles, setFiles]);

    // 加载项目文档列表
    const loadFiles = useCallback(() => {
        logger.info("load documents..", {projectId})
        try {
            setIsLoading(true);
            // 使用startTransition包裹action调用
            startTransition(() => {
                // 只触发action，不使用返回值
                const formData = new FormData();
                formData.append('projectId', projectId);
                getFilesAction(formData);
            });
        } catch (error) {
            console.error('启动transition失败:', error);
            setIsLoading(false);
        }
    }, [projectId, getFilesAction]);

    // 监听filesState变化，处理数据 - 只在初始文件为空时加载
    useEffect(() => {
        if (filesState && initialFiles.length === 0) {
            try {
                if (Array.isArray(filesState)) {
                    const uiFiles = filesState.map((file: any) => ({
                        ...file, status: file.isAnalyzed ? 'analyzed' : 'uploaded', // 确保分析结果数据存在，使用metadata字段作为分析结果
                        analysisResult: file.metadata || file.analysisResult || ''
                    }));
                    setFiles(uiFiles);
                } else {
                    console.warn('文件数据返回格式不正确:', filesState);
                    setFiles([]);
                }
            } catch (error) {
                console.error('处理文件数据失败:', error);
                toast({
                    title: '加载失败', description: '无法加载项目文档，请稍后重试', variant: 'destructive'
                });
            } finally {
                setIsLoading(false);
            }
        }
    }, [filesState, initialFiles.length, setFiles]);

    // 初始加载 - 只在没有初始文件时才从服务器加载
    useEffect(() => {
        // 如果已有初始文件数据，则不需要再加载
        if (initialFiles.length === 0) {
            loadFiles();
        } else {
            setIsLoading(false); // 直接设置加载完成
        }
    }, [initialFiles.length, loadFiles]);

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

            // 如果同步到知识库，触发知识库更新事件
            if (shouldSync) {
                window.dispatchEvent(new CustomEvent('knowledgeBaseUpdated', {
                    detail: { projectId, action: 'fileAdded', fileName: file.name }
                }));
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

        // 立即通知知识库组件进入loading状态
        window.dispatchEvent(new CustomEvent('knowledgeBaseSyncStart', {
            detail: { projectId, fileName: file.originalName, action: syncEnabled ? 'fileAdded' : 'fileRemoved' }
        }));

        try {
            // 如果启用同步且文件已上传，同步到知识库
            if (syncEnabled && (file.status === 'uploaded' || file.status === 'analyzed')) {
                const response = await fetch(`/api/projects/${projectId}/sync-file-to-knowledge-base`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId: file.id }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '同步到知识库失败');
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message || '同步到知识库失败');
                }

            } else if (!syncEnabled) {
                // 如果禁用同步，从知识库中移除
                const response = await fetch(`/api/projects/${projectId}/remove-file-from-knowledge-base`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId: file.id }),
                });

                if (!response.ok) {
                    throw new Error('从知识库移除失败');
                }
            }

            // 操作成功，移除loading状态
            setFiles(prev => prev.map(f => 
                f.id === file.id ? { ...f, syncLoading: false } : f
            ));

            // 触发知识库更新事件
            window.dispatchEvent(new CustomEvent('knowledgeBaseUpdated', {
                detail: { projectId, action: syncEnabled ? 'fileAdded' : 'fileRemoved', fileName: file.originalName }
            }));

        } catch (error) {
            // 如果操作失败，恢复之前的状态并移除loading
            setFiles(prev => prev.map(f => 
                f.id === file.id ? { ...f, syncToKnowledgeBase: !syncEnabled, syncLoading: false } : f
            ));
            
            // 通知知识库组件操作失败
            window.dispatchEvent(new CustomEvent('knowledgeBaseSyncError', {
                detail: { projectId, fileName: file.originalName }
            }));
            
            toast({
                title: '同步操作失败',
                description: error instanceof Error ? error.message : '未知错误',
                variant: 'destructive'
            });
        }
    };

    return (<div className="space-y-6 py-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">项目文档分析</h3>

                <div className="flex items-center space-x-4">
                    {/* 全局同步设置 */}
                    <div className="flex items-center space-x-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="global-sync" className="text-sm font-medium">
                            默认同步到知识库
                        </Label>
                        <Switch
                            id="global-sync"
                            checked={globalSyncEnabled}
                            onCheckedChange={setGlobalSyncEnabled}
                        />
                    </div>
                    
                    <div className="flex space-x-2">
                    <Dialog open={tiobDialogOpen} onOpenChange={setTiobDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <BarChart2 className="h-4 w-4 mr-2"/>
                                三重一大事项
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="!max-w-[90vw] overflow-hidden">
                            <DialogHeader>
                                <DialogTitle>三重一大事项分析</DialogTitle>
                                <DialogDescription>
                                    从项目文档中提取的重大问题决策、项目安排、资金使用等事项
                                </DialogDescription>
                            </DialogHeader>
                            <div className="overflow-auto max-h-[80vh]">
                                <TIOBComp project={{name: projectId}}/>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
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
                        批量分析
                    </Button>

                    <Button onClick={handleUploadClick}>
                        <Upload className="h-4 w-4 mr-2"/>
                        上传文档
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
            </div>

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
                </div>) : (<div className="grid gap-4 lg:grid-cols-2">
                    {files.map(file => (<FileCard
                            key={file.id}
                            file={file}
                            onAnalyze={handleAnalyzeFile}
                            onRemove={handleRemoveFile}
                            expanded={expandedFileId === file.id}
                            onSyncToggle={handleSyncToggle}
                        />))}
                </div>)}
        </div>);
}
