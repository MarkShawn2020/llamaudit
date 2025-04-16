'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Checkbox, 
  CheckboxIndicator 
} from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  PlayIcon, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText, 
  Calendar, 
  FileUp,
  CreditCard,
  Users,
  Building,
  BarChart3,
  ChevronDown,
  Download,
  Trash,
  Eye
} from 'lucide-react';
import { MeetingAnalysisResult, analyzeMeetingDocuments } from '@/lib/api/document-api';
import { getProjectFiles, updateFileAnalysisStatus, uploadProjectFile, deleteProjectFile, ProjectFile } from '@/lib/api/project-file-api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { saveDocumentAnalysisResults } from '@/lib/api/analysis-api';
import { getProjectAnalysisResults } from '@/lib/api/analysis-api';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { exportAnalysisResults, ExportFormat } from "@/lib/export-utils";
import React from 'react';

interface FileAnalysisGroup {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadDate?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  results: MeetingAnalysisResult[];
}

// 优化全选复选框组件
const SelectAllCheckbox = React.memo(({ 
  checked, 
  onChange, 
  disabled 
}: { 
  checked: boolean, 
  onChange: () => void, 
  disabled?: boolean 
}) => {
  // 使用useCallback防止每次渲染创建新函数
  const handleChange = React.useCallback(() => {
    onChange();
  }, [onChange]);

  return (
    <Checkbox 
      checked={checked}
      onCheckedChange={handleChange}
      disabled={disabled}
    >
      <CheckboxIndicator />
    </Checkbox>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重渲染
  return prevProps.checked === nextProps.checked && 
         prevProps.disabled === nextProps.disabled;
});

// 优化文件选择复选框组件
const ItemCheckbox = React.memo(({ 
  fileId, 
  checked, 
  onChange, 
  disabled 
}: { 
  fileId: string, 
  checked: boolean, 
  onChange: (fileId: string, checked: boolean) => void, 
  disabled?: boolean 
}) => {
  // 使用useCallback防止每次渲染创建新函数
  const handleChange = React.useCallback((value: boolean | "indeterminate") => {
    onChange(fileId, value === true);
  }, [onChange, fileId]);

  return (
    <Checkbox 
      checked={checked}
      onCheckedChange={handleChange}
      disabled={disabled}
    >
      <CheckboxIndicator />
    </Checkbox>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重渲染
  return prevProps.checked === nextProps.checked && 
         prevProps.disabled === nextProps.disabled && 
         prevProps.fileId === nextProps.fileId;
});

export default function ProjectAnalysis({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [rawAnalysisResults, setRawAnalysisResults] = useState<MeetingAnalysisResult[]>([]);
  const [groupedResults, setGroupedResults] = useState<FileAnalysisGroup[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  
  // 文件上传相关状态
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('files');

  // 维护一个已处理文件ID的集合，避免重复处理
  const processedFileIdsRef = useRef<Set<string>>(new Set());
  
  // 添加引用来跟踪前一次的结果和文件状态，避免不必要的重新计算
  const prevResultsRef = useRef<MeetingAnalysisResult[]>([]);
  const prevFilesRef = useRef<ProjectFile[]>([]);

  useEffect(() => {
    // 从API获取文件列表
    fetchFiles();
    // 获取已保存的分析结果
    fetchAnalysisResults();
  }, [projectId]);

  // 修改useEffect，避免在依赖项改变时重新执行
  useEffect(() => {
    console.log(`处理分析结果: ${rawAnalysisResults.length}个结果`);
    
    // 如果结果为空，直接返回
    if (rawAnalysisResults.length === 0) {
      return;
    }
    
    // 检查是否需要重新处理结果 - 使用JSON.stringify比较对象内容而不是引用
    const currentResultsJson = JSON.stringify(rawAnalysisResults);
    const prevResultsJson = JSON.stringify(prevResultsRef.current);
    
    // 如果结果没有变化，则不处理
    if (currentResultsJson === prevResultsJson) {
      console.log('分析结果未变化，跳过处理');
      return;
    }
    
    // 更新结果引用
    prevResultsRef.current = JSON.parse(currentResultsJson);
    
    console.log('开始处理分析结果...');
    
    // 按文件ID分组结果
    const groupMap = new Map<string, FileAnalysisGroup>();
    
    // 处理每个分析结果
    rawAnalysisResults.forEach(result => {
      const fileId = result.id;
      
      if (!groupMap.has(fileId)) {
        // 查找文件信息
        const fileInfo = files.find(f => f.id === fileId);
        groupMap.set(fileId, {
          fileId,
          fileName: result.fileName || fileInfo?.filename || '',
          fileUrl: result.fileUrl || fileInfo?.url,
          fileSize: result.fileSize || fileInfo?.size,
          fileType: result.fileType || fileInfo?.type,
          uploadDate: fileInfo?.createdAt,
          status: result.status,
          error: result.error,
          results: []
        });
      }
      
      // 获取当前组
      const group = groupMap.get(fileId)!;
      
      // 更新组的状态
      group.status = result.status;
      if (result.error) {
        group.error = result.error;
      }

      // 处理完成状态的结果
      if (result.status === 'completed') {
        if (result.items && result.items.length > 0) {
          // 处理多项分析结果
          result.items.forEach(item => {
            if (!item.meetingTopic && !item.eventCategory) return;
            
            group.results.push({
              id: `${fileId}-${item.itemId || Math.random().toString(36).substring(2, 9)}`,
              fileName: result.fileName,
              status: 'completed',
              meetingTime: item.meetingTime,
              meetingNumber: item.meetingNumber,
              meetingTopic: item.meetingTopic,
              meetingConclusion: item.meetingConclusion,
              contentSummary: item.contentSummary,
              eventCategory: item.eventCategory,
              eventDetails: item.eventDetails,
              amountInvolved: item.amountInvolved,
              relatedDepartments: item.relatedDepartments,
              relatedPersonnel: item.relatedPersonnel,
              decisionBasis: item.decisionBasis,
              originalText: item.originalText
            });
          });
        } else if (result.meetingTopic || result.eventCategory) {
          // 处理单项分析结果
          group.results.push({
            ...result,
            id: `${fileId}-legacy`
          });
        }
      }
    });
    
    // 更新分组结果状态
    const groupedResultsData = Array.from(groupMap.values());
    console.log(`生成了${groupedResultsData.length}个文件分析组`);
    setGroupedResults(groupedResultsData);
    
    // 收集需要更新isAnalyzed状态的文件
    const analyzedFileIds = Array.from(groupMap.keys());
    const filesToUpdate = files.filter(
      file => analyzedFileIds.includes(file.id) && !file.isAnalyzed
    );
    
    // 只有在有文件需要更新状态时才更新files状态
    if (filesToUpdate.length > 0) {
      console.log(`更新${filesToUpdate.length}个文件的分析状态`);
      
      // 将更新文件和状态更新的逻辑移到这个函数外执行，打破依赖循环
      requestAnimationFrame(() => {
        // 防止循环更新：创建新的files数组而不是直接修改
        const updatedFiles = files.map(file => 
          analyzedFileIds.includes(file.id) && !file.isAnalyzed
            ? { ...file, isAnalyzed: true }
            : file
        );
        
        // 更新files状态，但用一个单独的setFiles调用来批量更新
        setFiles(updatedFiles);
        
        // 更新文件分析状态到数据库
        filesToUpdate.forEach(file => {
          updateFileAnalysisStatus(projectId, file.id, true).catch(err => 
            console.error(`更新文件状态失败: ${file.id}`, err)
          );
        });
      });
    }
    
  }, [rawAnalysisResults, projectId]); // 去掉files依赖，只依赖于rawAnalysisResults和projectId

  // 获取已保存的分析结果
  const fetchAnalysisResults = async () => {
    try {
      setLoadingResults(true);
      console.log('正在获取项目分析结果:', projectId);
      
      const results = await getProjectAnalysisResults(projectId);
      console.log('获取到分析结果:', results);
      
      if (!results || results.length === 0) {
        console.log('没有找到已保存的分析结果');
        setLoadingResults(false);
        return;
      }
      
      // 处理结果，将数据库中的结果转换为MeetingAnalysisResult格式
      const processedResults: MeetingAnalysisResult[] = [];
      
      // 遍历每个文件
      results.forEach(file => {
        if (!file || !file.analysisResults || file.analysisResults.length === 0) {
          return;
        }
        
        console.log(`处理文件 ${file.id}: ${file.originalName}, 分析结果数量: ${file.analysisResults.length}`);
        
        // 将文件的所有分析结果按itemIndex分组
        const itemGroups = new Map<number, any[]>();
        
        file.analysisResults.forEach(result => {
          const index = result.itemIndex || 0;
          if (!itemGroups.has(index)) {
            itemGroups.set(index, []);
          }
          itemGroups.get(index)!.push(result);
        });
        
        console.log(`文件 ${file.id} 分析事项组数: ${itemGroups.size}`);
        
        // 为每个文件创建一个分析结果对象
        const fileResult: MeetingAnalysisResult = {
          id: file.id || `file-${Date.now()}`,
          fileName: file.originalName || '未命名文件',
          status: 'completed',
          fileUrl: file.filePath,
          fileSize: Number(file.fileSize),
          fileType: file.fileType,
          items: []
        };
        
        // 将每组分析结果添加到items中
        itemGroups.forEach((items, index) => {
          // 使用每组的第一条记录作为代表
          const representative = items[0];
          
          fileResult.items?.push({
            itemId: String(index),
            meetingTime: representative.meetingTime ? new Date(representative.meetingTime).toISOString() : undefined,
            meetingNumber: representative.meetingNumber || undefined,
            meetingTopic: representative.meetingTopic || undefined,
            meetingConclusion: representative.meetingConclusion || undefined,
            contentSummary: representative.contentSummary || undefined,
            eventCategory: representative.eventCategory || undefined,
            eventDetails: representative.eventDetails || undefined,
            amountInvolved: representative.amountInvolved ? String(representative.amountInvolved) : undefined,
            relatedDepartments: representative.relatedDepartments || undefined,
            relatedPersonnel: representative.relatedPersonnel || undefined,
            decisionBasis: representative.decisionBasis || undefined,
            originalText: representative.originalText || undefined
          });
        });
        
        console.log(`文件 ${file.id} 处理后的结果项数量: ${fileResult.items?.length || 0}`);
        
        // 把整个文件的分析结果添加到结果数组
        processedResults.push(fileResult);
      });
      
      console.log('所有文件处理后的分析结果数量:', processedResults.length);
      
      // 更新状态
      if (processedResults.length > 0) {
        setRawAnalysisResults(processedResults);
        console.log('已更新分析结果状态');
      }
    } catch (error) {
      console.error('获取分析结果失败:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  // 获取项目文件列表
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const projectFiles = await getProjectFiles(projectId);
      setFiles(projectFiles);
    } catch (error) {
      console.error('获取文件列表失败:', error);
      toast.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 选择所有文件
  const handleSelectAll = useCallback(() => {
    setSelectedFiles(prev => {
      const allIds = files.map(file => file.id);
      // 如果当前所有文件都已选中，则清空所选；否则选择所有文件
      return prev.length === allIds.length ? [] : allIds;
    });
  }, [files]);

  // 判断是否所有文件都已被选中
  const allFilesSelected = useMemo(() => {
    return files.length > 0 && selectedFiles.length === files.length;
  }, [files, selectedFiles]);

  // 选择单个文件
  const handleSelectFile = useCallback((fileId: string, checked: boolean) => {
    setSelectedFiles(prev => {
      if (checked) {
        return [...prev, fileId];
      } else {
        return prev.filter(id => id !== fileId);
      }
    });
  }, []);

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('请选择需要分析的文件');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // 将选中的文件添加到分析结果列表，初始状态为pending
      const pendingResults = selectedFiles.map(fileId => {
        const file = files.find(f => f.id === fileId);
        return {
          id: fileId,
          fileName: file?.filename || '',
          status: 'pending' as const,
          fileUrl: file?.url,
          fileSize: file?.size,
          fileType: file?.type
        };
      });
      
      setRawAnalysisResults(prev => [...prev, ...pendingResults]);
      
      // 更新为processing状态
      setRawAnalysisResults(prev => 
        prev.map(result => 
          selectedFiles.includes(result.id) 
            ? { ...result, status: 'processing' as const } 
            : result
        )
      );

      // 调用API批量解析文件
      const analysisPromises = analyzeMeetingDocuments(selectedFiles);
      
      // 使用Promise.allSettled处理所有解析请求
      const results = await Promise.allSettled(analysisPromises);
      
      // 更新解析结果
      const successfulResults: MeetingAnalysisResult[] = [];
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const fileId = selectedFiles[i];
        
        if (result.status === 'fulfilled') {
          // 成功解析的结果添加到数组中
          successfulResults.push(result.value);
          
          // 更新UI状态
          setRawAnalysisResults(prev => 
            prev.map(item => 
              item.id === fileId ? result.value : item
            )
          );
          
          try {
            // 调用API更新文件的分析状态
            await updateFileAnalysisStatus(projectId, fileId, true);
            
            // 更新本地文件状态
            setFiles(prev => 
              prev.map(file => 
                file.id === fileId ? { ...file, isAnalyzed: true } : file
              )
            );
          } catch (error) {
            console.error(`更新文件[${fileId}]分析状态失败:`, error);
          }
        } else {
          // 解析失败
          setRawAnalysisResults(prev => 
            prev.map(item => 
              item.id === fileId 
                ? { 
                    ...item, 
                    status: 'error' as const, 
                    error: result.reason instanceof Error 
                      ? result.reason.message 
                      : '解析失败' 
                  } 
                : item
            )
          );
        }
      }

      // 保存成功的分析结果到数据库
      if (successfulResults.length > 0) {
        try {
          await saveDocumentAnalysisResults(projectId, successfulResults);
        } catch (error) {
          console.error('保存分析结果到数据库失败:', error);
          toast.error('分析结果已生成，但保存到数据库失败');
        }
      }

      toast.success(`已完成${results.length}个文件的解析`);
      
      // 切换到分析结果标签
      setActiveTab('analysis');
      
      // 清空选择
      setSelectedFiles([]);
    } catch (error) {
      console.error('批量解析文件时出错:', error);
      toast.error('批量解析文件失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (groupedResults.length === 0) {
      toast.warning('没有可导出的数据');
      return;
    }
    
    try {
      exportAnalysisResults(groupedResults, format);
      toast.success(`已成功导出${format.toUpperCase()}格式文件`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    }
  };

  // 文件上传相关函数
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      
      // 转换FileList为数组
      const filesArray = Array.from(selectedFiles);
      
      // 使用新API上传文件
      const result = await uploadProjectFile(
        projectId, 
        filesArray,
        (progress) => setUploadProgress(progress)
      );
      
      // 更新本地文件状态
      setFiles(prev => [...prev, ...result.files]);
      
      toast.success(`成功上传 ${filesArray.length} 个文件`);
    } catch (error) {
      console.error('文件上传失败:', error);
      
      // 获取具体错误信息
      let errorMessage = '文件上传失败';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // 设置错误状态
      setUploadError(errorMessage);
      
      // 重置进度
      setUploadProgress(0);
    } finally {
      setUploading(false);
      // 重置文件输入
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      setDeleting(fileId);
      await deleteProjectFile(projectId, fileId);
      
      // 更新本地状态 - 移除已删除文件
      setFiles(files.filter(file => file.id !== fileId));
      
      toast.success('文件已删除');
    } catch (error) {
      console.error('删除文件失败:', error);
      toast.error('删除文件失败');
    } finally {
      setDeleting(null);
    }
  };

  const downloadFile = (file: ProjectFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const viewFile = (file: ProjectFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const renderStatus = (status: MeetingAnalysisResult['status'], error?: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
            <span className="h-2 w-2 rounded-full bg-yellow-500 mr-1"></span>
            等待处理
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            解析中...
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            已完成
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200" title={error}>
            <XCircle className="h-3 w-3 mr-1" />
            解析失败
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="files">文件管理</TabsTrigger>
            <TabsTrigger value="analysis">文件分析</TabsTrigger>
          </TabsList>
        </div>
        
        {/* 文件管理标签内容 */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>项目文件管理</CardTitle>
              <CardDescription>
                上传、管理和准备分析的文件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    id="fileUpload"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <label htmlFor="fileUpload">
                    <Button 
                      variant="outline" 
                      disabled={uploading} 
                      className="cursor-pointer" 
                      asChild
                    >
                      <span>
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            上传中... {uploadProgress}%
                          </>
                        ) : (
                          <>
                            <FileUp className="mr-2 h-4 w-4" />
                            选择文件
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  <span className="text-sm text-muted-foreground">
                    上传项目相关的会议纪要、合同等文件
                  </span>
                </div>
                
                {uploadError && (
                  <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md border border-red-200 flex items-start gap-2">
                    <div className="h-4 w-4 mt-0.5 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    </div>
                    <div>
                      <strong>上传失败：</strong> {uploadError}
                      <div className="mt-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs" 
                          onClick={() => setUploadError(null)}
                        >
                          关闭
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <SelectAllCheckbox 
                          checked={allFilesSelected}
                          onChange={handleSelectAll}
                          disabled={loading || isAnalyzing}
                        />
                      </TableHead>
                      <TableHead>文件名</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>大小</TableHead>
                      <TableHead>上传日期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex justify-center items-center">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            <span>加载文件列表...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : files.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <p>暂无可分析的文件</p>
                          <p className="text-sm mt-1">请先上传会议纪要、合同等文件</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <ItemCheckbox
                              fileId={file.id}
                              checked={selectedFiles.includes(file.id)}
                              onChange={handleSelectFile}
                              disabled={isAnalyzing}
                            />
                          </TableCell>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="truncate max-w-[200px]" title={file.filename}>
                              {file.filename}
                            </span>
                          </TableCell>
                          <TableCell>
                            {file.category === 'meeting' && '会议纪要'}
                            {file.category === 'contract' && '合同文件'}
                            {file.category === 'attachment' && '附件'}
                          </TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                          <TableCell>{formatDate(file.createdAt)}</TableCell>
                          <TableCell>
                            {file.isAnalyzed ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                已分析
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                未分析
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => viewFile(file)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => downloadFile(file)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteFile(file.id)}
                                disabled={deleting === file.id}
                              >
                                {deleting === file.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={selectedFiles.length === 0 || isAnalyzing}
                  className="gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在分析...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4" />
                      开始分析
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 分析结果标签内容 */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>三重一大分析结果</CardTitle>
              <CardDescription>
                提取的三重一大信息
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingResults ? (
                <div className="p-6 text-center flex flex-col items-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p>加载分析结果中...</p>
                </div>
              ) : groupedResults.length > 0 ? (
                <Tabs defaultValue="card" className="w-full px-6">
                  <div className="flex justify-between items-center border-b pb-4">
                    <TabsList>
                      <TabsTrigger value="card">卡片视图</TabsTrigger>
                      <TabsTrigger value="table">表格视图</TabsTrigger>
                    </TabsList>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Download className="h-4 w-4" />
                          导出结果
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport('csv')}>
                          导出为CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                          导出为Excel (XLSX)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <TabsContent value="card" className="mt-4 pb-4">
                    <div className="space-y-6">
                      {groupedResults.map((group) => (
                        <Card key={group.fileId} className="overflow-hidden">
                          <CardHeader className="bg-muted/30 py-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-500" />
                                <CardTitle className="text-lg">{group.fileName}</CardTitle>
                                {renderStatus(group.status, group.error)}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{group.uploadDate ? formatDate(group.uploadDate) : '-'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileUp className="h-4 w-4" />
                                <span>{group.fileSize ? formatFileSize(group.fileSize) : '-'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <BarChart3 className="h-4 w-4" />
                                <span>{group.results.length} 项三重一大事项</span>
                              </div>
                            </div>
                          </CardHeader>
                          {group.status === 'completed' ? (
                            <CardContent className="p-0">
                              {group.results.length > 0 ? (
                                <Accordion type="multiple" className="w-full">
                                  {group.results.map((result, index) => (
                                    <AccordionItem key={`${group.fileId}-${index}`} value={`item-${index}`}>
                                      <AccordionTrigger className="px-6 py-3 hover:bg-muted/20 hover:no-underline">
                                        <div className="flex items-center gap-3 text-left">
                                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 px-2">
                                            {result.eventCategory || '未分类'}
                                          </Badge>
                                          <span className="font-medium">{result.meetingTopic || '未知议题'}</span>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="px-6 pt-2 pb-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <div className="text-sm font-medium mb-1">会议时间</div>
                                            <div>{result.meetingTime || '-'}</div>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium mb-1">文号</div>
                                            <div>{result.meetingNumber || '-'}</div>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium mb-1">事项类别</div>
                                            <div>{result.eventCategory || '-'}</div>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium mb-1">涉及金额</div>
                                            <div>{result.amountInvolved || '-'}</div>
                                          </div>
                                          <div className="col-span-2">
                                            <div className="text-sm font-medium mb-1">会议议题</div>
                                            <div>{result.meetingTopic || '-'}</div>
                                          </div>
                                          <div className="col-span-2">
                                            <div className="text-sm font-medium mb-1">事项详情</div>
                                            <div>{result.eventDetails || '-'}</div>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium mb-1">相关部门</div>
                                            <div className="flex items-center gap-1">
                                              <Building className="h-4 w-4 text-muted-foreground" />
                                              <span>{result.relatedDepartments || '-'}</span>
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium mb-1">相关人员</div>
                                            <div className="flex items-center gap-1">
                                              <Users className="h-4 w-4 text-muted-foreground" />
                                              <span>{result.relatedPersonnel || '-'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              ) : (
                                <div className="py-8 text-center text-muted-foreground">
                                  <p>未检测到三重一大相关内容</p>
                                </div>
                              )}
                            </CardContent>
                          ) : group.status === 'error' ? (
                            <CardContent className="py-8 text-center text-muted-foreground">
                              <p>分析失败：{group.error || '未知错误'}</p>
                            </CardContent>
                          ) : (
                            <CardContent className="py-8 text-center">
                              <div className="flex justify-center items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                <p>正在分析中...</p>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="table" className="mt-4">
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">文件名</TableHead>
                            <TableHead>会议时间</TableHead>
                            <TableHead>文号</TableHead>
                            <TableHead>会议议题</TableHead>
                            <TableHead>事项类别</TableHead>
                            <TableHead>涉及金额</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedResults.flatMap((group) => 
                            group.results.length > 0 ? 
                              group.results.map((result, index) => (
                                <TableRow key={`${group.fileId}-${index}`}>
                                  <TableCell className="font-medium">
                                    {index === 0 ? (
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <span className="truncate max-w-[160px]" title={group.fileName}>
                                          {group.fileName}
                                        </span>
                                      </div>
                                    ) : null}
                                  </TableCell>
                                  <TableCell>{result.meetingTime || '-'}</TableCell>
                                  <TableCell>{result.meetingNumber || '-'}</TableCell>
                                  <TableCell>
                                    <span className="truncate max-w-[160px] block" title={result.meetingTopic}>
                                      {result.meetingTopic || '-'}
                                    </span>
                                  </TableCell>
                                  <TableCell>{result.eventCategory || '-'}</TableCell>
                                  <TableCell>{result.amountInvolved || '-'}</TableCell>
                                  <TableCell>
                                    {index === 0 ? renderStatus(group.status, group.error) : null}
                                  </TableCell>
                                </TableRow>
                              ))
                            : (
                              <TableRow key={group.fileId}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="truncate max-w-[160px]" title={group.fileName}>
                                      {group.fileName}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                  {group.status === 'completed' ? '未检测到三重一大相关内容' : ''}
                                </TableCell>
                                <TableCell>
                                  {renderStatus(group.status, group.error)}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="p-6 text-center text-muted-foreground flex flex-col items-center">
                  <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg mb-2">暂无分析结果</p>
                  <p className="text-sm">请从文件管理标签选择文件并点击"开始分析"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 