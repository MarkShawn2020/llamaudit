'use client';

import { useActionState, useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, File, Trash2, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { logger } from '@/lib/logger';
import { getFilesByProjectId } from '@/lib/db/documents';

// 文档状态枚举
type DocumentStatus = 
  | 'uploading' // 正在上传
  | 'upload_failed' // 上传失败
  | 'uploaded' // 已上传
  | 'analyzing' // 正在分析
  | 'analysis_failed' // 分析失败
  | 'analyzed'; // 已分析

// 文档类型定义
interface Document {
  id: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  uploadDate: string;
  status: DocumentStatus;
  userId: string;
  isAnalyzed: boolean;
  progress?: number; // 上传进度 0-100
  analysisResult?: string; // 分析结果
  error?: string; // 错误信息
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
function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
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
function DocumentCard({ 
  document, 
  onAnalyze, 
  onRemove,
  expanded
}: { 
  document: Document; 
  onAnalyze: (doc: Document) => void; 
  onRemove: (doc: Document) => void;
  expanded: boolean;
}) {
  const canAnalyze = document.status === 'uploaded' || document.status === 'analysis_failed';
  const isExpanded = expanded || document.status === 'analyzing' || document.status === 'analyzed';
  
  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <File className={`h-6 w-6 ${getFileIconColor(document.fileType)}`} />
            <div>
              <CardTitle className="text-sm font-medium">{document.originalName}</CardTitle>
              <CardDescription className="text-xs">
                {formatFileSize(document.fileSize)} • {new Date(document.uploadDate).toLocaleString()}
              </CardDescription>
            </div>
          </div>
          <DocumentStatusBadge status={document.status} />
        </div>
      </CardHeader>
      
      {document.status === 'uploading' && (
        <CardContent className="pb-2">
          <Progress value={document.progress || 0} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{document.progress}%</p>
        </CardContent>
      )}
      
      {document.error && (
        <CardContent className="py-2">
          <p className="text-xs text-red-500 italic">{document.error}</p>
        </CardContent>
      )}
      
      {isExpanded && document.analysisResult && (
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
                {document.analysisResult}
              </Markdown>
            </ScrollArea>
          </div>
        </CardContent>
      )}
      
      <CardFooter className="pt-0 pb-3 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onRemove(document)}
          disabled={document.status === 'uploading' || document.status === 'analyzing'}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          删除
        </Button>
        
        {canAnalyze && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onAnalyze(document)}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            分析
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function ProjectAnalysis({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [filesState, getFilesAction] = useActionState(getFilesByProjectId, {projectId})
  
  // 加载项目文档列表
  const loadDocuments = useCallback(() => {
    logger.info("load documents..", {projectId})
    try {
      setIsLoading(true);
      // 使用startTransition包裹action调用
      startTransition(() => {
        // 只触发action，不使用返回值
        getFilesAction();
      });
    } catch (error) {
      console.error('启动transition失败:', error);
      setIsLoading(false);
    }
  }, [projectId, getFilesAction]);
  
  // 监听filesState变化，处理数据
  useEffect(() => {
    if (filesState) {
      try {
        if (Array.isArray(filesState)) {
          setDocuments(filesState.map((doc: any) => ({
            ...doc,
            status: doc.isAnalyzed ? 'analyzed' : 'uploaded'
          })));
        } else {
          console.warn('文档数据返回格式不正确:', filesState);
          setDocuments([]);
        }
      } catch (error) {
        console.error('处理文档数据失败:', error);
        toast({
          title: '加载失败',
          description: '无法加载项目文档，请稍后重试',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [filesState]);

  
  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, []);
  
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
    // 创建临时文档对象
    const tempDoc: Document = {
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
    
    // 添加到文档列表
    setDocuments(prev => [...prev, tempDoc]);
    
    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user', projectId); // 实际上是将projectId作为auditUnitId传递
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setDocuments(prev => prev.map(doc => 
          doc.id === tempDoc.id && doc.status === 'uploading' 
            ? { ...doc, progress: Math.min((doc.progress || 0) + 10, 90) }
            : doc
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
      setDocuments(prev => prev.map(doc => 
        doc.id === tempDoc.id 
          ? { 
              ...doc, 
              id: data.id,
              status: 'uploaded',
              progress: 100,
              filePath: data.filePath || '',
              userId: data.userId || ''
            }
          : doc
      ));
      
      toast({
        title: '上传成功',
        description: `文件 ${file.name} 上传成功`,
      });
    } catch (error) {
      console.error('文件上传失败:', error);
      
      // 更新文档状态为上传失败
      setDocuments(prev => prev.map(doc => 
        doc.id === tempDoc.id 
          ? { ...doc, status: 'upload_failed', error: error instanceof Error ? error.message : '上传失败' }
          : doc
      ));
      
      toast({
        title: '上传失败',
        description: `文件 ${file.name} 上传失败: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: 'destructive'
      });
    }
  };
  
  // 删除文档
  const handleRemoveDocument = async (doc: Document) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('删除文档失败');
      }
      
      // 从列表中移除文档
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      
      toast({
        title: '删除成功',
        description: `文件 ${doc.originalName} 已成功删除`
      });
    } catch (error) {
      console.error('删除文档失败:', error);
      toast({
        title: '删除失败',
        description: `无法删除文件: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: 'destructive'
      });
    }
  };
  
  // 文档分析
  const handleAnalyzeDocument = async (doc: Document) => {
    try {
      // 更新文档状态为分析中
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, status: 'analyzing', analysisResult: '' } : d
      ));
      
      // 创建EventSource进行流式分析
      const fileIds = JSON.stringify([doc.id]);
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
            setDocuments(prev => prev.map(d => 
              d.id === doc.id ? { ...d, analysisResult: combinedResult } : d
            ));
          }
          
          // 分析完成
          if (data.event === 'done') {
            // 更新文档状态为已分析
            setDocuments(prev => prev.map(d => 
              d.id === doc.id ? { ...d, status: 'analyzed', isAnalyzed: true } : d
            ));
            
            // 关闭连接
            eventSource.close();
            
            // 保存分析结果到数据库
            saveAnalysisResult(doc.id, combinedResult);
          }
        } catch (error) {
          console.error('处理分析事件失败:', error);
          handleAnalysisError(doc.id, error, eventSource);
        }
      };
      
      // 处理错误
      eventSource.onerror = (error) => {
        console.error('分析事件源错误:', error);
        handleAnalysisError(doc.id, error, eventSource);
      };
      
    } catch (error) {
      console.error('启动分析失败:', error);
      handleAnalysisError(doc.id, error);
    }
  };
  
  // 处理分析错误
  const handleAnalysisError = (docId: string, error: any, eventSource?: EventSource) => {
    // 关闭EventSource
    if (eventSource) {
      eventSource.close();
    }
    
    // 更新文档状态为分析失败
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { 
        ...d, 
        status: 'analysis_failed', 
        error: error instanceof Error ? error.message : '分析过程中出现错误'
      } : d
    ));
    
    toast({
      title: '分析失败',
      description: error instanceof Error ? error.message : '分析过程中出现错误',
      variant: 'destructive'
    });
  };
  
  // 保存分析结果
  const saveAnalysisResult = async (docId: string, result: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${docId}/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result })
      });
      
      if (!response.ok) {
        console.error('保存分析结果失败');
      }
    } catch (error) {
      console.error('保存分析结果请求失败:', error);
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
            <p className="mt-2 text-sm text-muted-foreground">加载文档列表...</p>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="h-40 border rounded-lg flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2" />
            <p>尚未上传任何文档</p>
            <p className="text-xs mt-1">点击上传按钮添加文档进行分析</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {documents.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onAnalyze={handleAnalyzeDocument}
              onRemove={handleRemoveDocument}
              expanded={expandedDocId === doc.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
