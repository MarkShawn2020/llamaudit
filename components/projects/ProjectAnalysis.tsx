'use client';

import { useActionState, useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileIcon, Trash2, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { logger } from '@/lib/logger';
import { getFilesByProjectId } from '@/lib/db/documents';
import { File as DBFile } from '@/lib/db/schema';
import { ProjectFile } from '@/lib/api/project-api';
import { saveFileAnalysisResult, deleteProjectFile } from '@/lib/actions/file-actions';

// 文件状态枚举
type FileStatus = 
  | 'uploading' // 正在上传
  | 'upload_failed' // 上传失败
  | 'uploaded' // 已上传
  | 'analyzing' // 正在分析
  | 'analysis_failed' // 分析失败
  | 'analyzed'; // 已分析

// 扩展文件类型以适配UI需求
interface UIFile {
  id: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  status: FileStatus;
  userId: string;
  isAnalyzed?: boolean;
  progress?: number; // 上传进度 0-100
  analysisResult?: string; // 分析结果
  error?: string; // 错误信息
  uploadDate: string;
}

// 分析事件类型
type AnalysisEvent = {
  event: string;
  task_id?: string;
  message?: string;
  error?: string;
  data?: any;
  answer?: string;
};

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * 获取文件图标颜色
 */
function getFileIconColor(fileType: string): string {
  if (fileType.includes('pdf')) return 'text-red-500';
  if (fileType.includes('word') || fileType.includes('doc')) return 'text-blue-500';
  if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv')) return 'text-green-500';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'text-orange-500';
  if (fileType.includes('image')) return 'text-purple-500';
  return 'text-gray-500';
}

/**
 * 文档状态徽章组件
 */
function FileStatusBadge({ status }: { status: FileStatus }) {
  switch (status) {
    case 'uploading':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" /> 上传中</Badge>;
    case 'upload_failed':
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> 上传失败</Badge>;
    case 'uploaded':
      return <Badge variant="outline" className="border-green-500 text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> 已上传</Badge>;
    case 'analyzing':
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> 分析中</Badge>;
    case 'analysis_failed':
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> 分析失败</Badge>;
    case 'analyzed':
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> 已分析</Badge>;
    default:
      return null;
  }
}

/**
 * 单个文档卡片组件
 */
function FileCard({ 
  file, 
  onAnalyze, 
  onRemove,
  expanded
}: { 
  file: UIFile; 
  onAnalyze: (file: UIFile) => void; 
  onRemove: (file: UIFile) => void;
  expanded: boolean;
}) {
  const canAnalyze = file.status === 'uploaded' || file.status === 'analysis_failed';
  const isExpanded = expanded || file.status === 'analyzing' || file.status === 'analyzed';
  
  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <FileIcon className={`h-6 w-6 ${getFileIconColor(file.fileType)}`} />
            <div>
              <CardTitle className="text-sm font-medium">{file.originalName}</CardTitle>
              <CardDescription className="text-xs">
                {formatFileSize(file.fileSize)} • {new Date(file.uploadDate).toLocaleString()}
              </CardDescription>
            </div>
          </div>
          <FileStatusBadge status={file.status} />
        </div>
      </CardHeader>
      
      {file.status === 'uploading' && (
        <CardContent className="pb-2">
          <Progress value={file.progress || 0} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{file.progress}%</p>
        </CardContent>
      )}
      
      {file.error && (
        <CardContent className="py-2">
          <p className="text-xs text-red-500 italic">{file.error}</p>
        </CardContent>
      )}
      
      {isExpanded && file.analysisResult && (
        <CardContent className="pt-0 pb-2">
          <div className="border rounded-md p-3 bg-gray-50 mt-2">
            <ScrollArea className="h-[200px]">
              <Markdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // 使用components属性代替className
                  p: ({node, ...props}) => <p className="prose prose-sm max-w-none" {...props} />,
                  // 其他元素也可以在这里定义
                  ul: ({node, ...props}) => <ul className="prose prose-sm max-w-none" {...props} />,
                  ol: ({node, ...props}) => <ol className="prose prose-sm max-w-none" {...props} />,
                  li: ({node, ...props}) => <li className="prose prose-sm" {...props} />,
                  h1: ({node, ...props}) => <h1 className="prose prose-sm" {...props} />,
                  h2: ({node, ...props}) => <h2 className="prose prose-sm" {...props} />,
                  h3: ({node, ...props}) => <h3 className="prose prose-sm" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="prose prose-sm" {...props} />,
                  code: ({node, ...props}) => <code className="prose prose-sm" {...props} />,
                  pre: ({node, ...props}) => <pre className="prose prose-sm" {...props} />
                }}
              >
                {file.analysisResult}
              </Markdown>
            </ScrollArea>
          </div>
        </CardContent>
      )}
      
      <CardFooter className="pt-0 pb-3 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onRemove(file)}
          disabled={file.status === 'uploading' || file.status === 'analyzing'}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          删除
        </Button>
        
        {canAnalyze && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onAnalyze(file)}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            分析
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function ProjectAnalysis({ 
  projectId, 
  initialFiles = [],
  onFileChange
}: { 
  projectId: string, 
  initialFiles?: ProjectFile[],
  onFileChange?: (files: UIFile[]) => void 
}) {
  const [files, setFiles] = useState<UIFile[]>(() => initialFiles.map(file => ({
    id: file.id,
    originalName: file.filename,
    fileSize: file.size,
    fileType: file.type,
    filePath: file.url,
    uploadDate: file.createdAt,
    // 根据isAnalyzed状态设置正确的状态
    status: file.isAnalyzed ? 'analyzed' : 'uploaded' as FileStatus,
    userId: '',
    isAnalyzed: file.isAnalyzed || false,
    // 从元数据中加载分析结果，如果有的话
    analysisResult: file.metadata || ''
  })));
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [filesState, getFilesAction] = useActionState(getFilesByProjectId, [])
  
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
          setFiles(filesState.map((file: any) => ({
            ...file,
            status: file.isAnalyzed ? 'analyzed' : 'uploaded',
            // 确保分析结果数据存在，使用metadata字段作为分析结果
            analysisResult: file.metadata || file.analysisResult || ''
          })));
        } else {
          console.warn('文件数据返回格式不正确:', filesState);
          setFiles([]);
        }
      } catch (error) {
        console.error('处理文件数据失败:', error);
        toast({
          title: '加载失败',
          description: '无法加载项目文档，请稍后重试',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [filesState, initialFiles.length]);

  
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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // 处理多个文件上传
    Array.from(files).forEach(file => uploadFile(file));
    
    // 重置文件输入以允许重复上传同一个文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // 上传单个文件
  const uploadFile = async (file: File) => {
    // 创建临时文件对象
    const tempFile: UIFile = {
      id: `temp-${Date.now()}-${file.name}`,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      filePath: '',
      uploadDate: new Date().toISOString(),
      status: 'uploading',
      userId: '',
      isAnalyzed: false,
      progress: 0
    };
    
    // 添加到文件列表
    const updatedFiles = [
      tempFile,
      ...files
    ];
    setFiles(updatedFiles);
    
    // 通知父组件文件数量变化
    if (onFileChange) {
      onFileChange(updatedFiles);
    }
    
    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user', projectId); // 实际上是将projectId作为auditUnitId传递
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(file => 
          file.id === tempFile.id && file.status === 'uploading' 
            ? { ...file, progress: Math.min((file.progress || 0) + 10, 90) }
            : file
        ));
      }, 300);
      
      // 发送上传请求
      const response = await fetch('/api/dify/upload', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }
      
      const data = await response.json();
      
      // 更新文档状态为已上传
      setFiles(prev => prev.map(file => 
        file.id === tempFile.id 
          ? { 
              ...file, 
              id: data.id,
              status: 'uploaded',
              progress: 100,
              filePath: data.filePath || '',
              userId: data.userId || ''
            }
          : file
      ));
      
      toast({
        title: '上传成功',
        description: `文件 ${file.name} 上传成功`,
      });
    } catch (error) {
      console.error('文件上传失败:', error);
      
      // 更新文件状态为上传失败
      setFiles(prev => prev.map(file => 
        file.id === tempFile.id 
          ? { ...file, status: 'upload_failed', error: error instanceof Error ? error.message : '上传失败' }
          : file
      ));
      
      toast({
        title: '上传失败',
        description: `文件 ${file.name} 上传失败: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: 'destructive'
      });
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
          title: '删除成功',
          description: `文件 ${file.originalName} 已成功删除`
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
  
  // 分析文件
  const handleAnalyzeFile = async (file: UIFile) => {
    try {
      // 更新文件状态为分析中
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'analyzing', analysisResult: '' } : f
      ));
      
      // 创建EventSource进行流式分析
      const fileIds = JSON.stringify([file.id]);
      const eventSource = new EventSource(`/api/dify/stream-analysis?fileIds=${encodeURIComponent(fileIds)}`);
      
      // 分析结果
      let combinedResult = '';
      
      // 处理事件
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AnalysisEvent;
          
          if (data.event === 'error') {
            throw new Error(data.message || '分析失败');
          }
          
          // Dify直接返回的数据，包含answer字段
          if (data.answer) {
            combinedResult += data.answer;
            
            // 更新分析结果
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { ...f, analysisResult: combinedResult } : f
            ));
          }
          
          // 分析完成
          if (data.event === 'done') {
            // 更新文件状态为已分析
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { ...f, status: 'analyzed', isAnalyzed: true } : f
            ));
            
            // 关闭连接
            eventSource.close();
            
            // 保存分析结果到数据库
            saveAnalysisResult(file.id, combinedResult);
          }
        } catch (error) {
          console.error('处理分析事件失败:', error);
          handleAnalysisError(file.id, error, eventSource);
        }
      };
      
      // 处理错误
      eventSource.onerror = (error) => {
        console.error('分析事件源错误:', error);
        handleAnalysisError(file.id, error, eventSource);
      };
      
    } catch (error) {
      console.error('启动分析失败:', error);
      handleAnalysisError(file.id, error);
    }
  };
  
  // 处理分析错误
  const handleAnalysisError = (fileId: string, error: any, eventSource?: EventSource) => {
    // 关闭EventSource
    if (eventSource) {
      eventSource.close();
    }
    
    // 更新文件状态为分析失败
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { 
        ...f, 
        status: 'analysis_failed', 
        error: error instanceof Error ? error.message : '分析过程中出现错误'
      } : f
    ));
    
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
        title: '保存失败',
        description: '无法保存分析结果，请稍后重试',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">项目文档分析</h3>
        
        <Button onClick={handleUploadClick}>
          <Upload className="h-4 w-4 mr-2" />
          上传文档
        </Button>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
        />
      </div>
      
      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">加载文件列表...</p>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div className="h-40 border rounded-lg flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2" />
            <p>尚未上传任何文件</p>
            <p className="text-xs mt-1">点击上传按钮添加文件进行分析</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {files.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onAnalyze={handleAnalyzeFile}
              onRemove={handleRemoveFile}
              expanded={expandedFileId === file.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
