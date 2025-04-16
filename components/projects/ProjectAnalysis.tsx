'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PlayIcon, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { MeetingAnalysisResult, analyzeMeetingDocuments } from '@/lib/api/document-api';
import { getProjectFiles, updateFileAnalysisStatus, ProjectFile } from '@/lib/api/project-file-api';
import { formatDate } from '@/lib/utils';

export default function ProjectAnalysis({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<MeetingAnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从API获取文件列表
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

    fetchFiles();
  }, [projectId]);

  const handleSelectFile = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.filter(file => !file.isAnalyzed).map(file => file.id));
    }
  };

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
      
      setAnalysisResults(prev => [...prev, ...pendingResults]);
      
      // 更新为processing状态
      setAnalysisResults(prev => 
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
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const fileId = selectedFiles[i];
        
        if (result.status === 'fulfilled') {
          // 成功解析
          setAnalysisResults(prev => 
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
          setAnalysisResults(prev => 
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

      toast.success(`已完成${results.length}个文件的解析`);
      
      // 清空选择
      setSelectedFiles([]);
    } catch (error) {
      console.error('批量解析文件时出错:', error);
      toast.error('批量解析文件失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderStatus = (status: MeetingAnalysisResult['status'], error?: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-yellow-600">
            <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
            <span className="text-xs">等待处理</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">解析中...</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span className="text-xs">已完成</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-red-600" title={error}>
            <XCircle className="h-3 w-3" />
            <span className="text-xs">解析失败</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>三重一大分析任务</CardTitle>
          <CardDescription>
            选择文件并分析提取三重一大相关信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={files.length > 0 && selectedFiles.length === files.filter(f => !f.isAnalyzed).length}
                      onCheckedChange={handleSelectAll}
                      disabled={loading || isAnalyzing}
                    >
                      <CheckboxIndicator />
                    </Checkbox>
                  </TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>上传日期</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="animate-pulse">加载文件列表...</div>
                    </TableCell>
                  </TableRow>
                ) : files.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <p>暂无可分析的文件</p>
                      <p className="text-sm mt-1">请先上传会议纪要、合同等文件</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={() => handleSelectFile(file.id)}
                          disabled={isAnalyzing || file.isAnalyzed}
                        >
                          <CheckboxIndicator />
                        </Checkbox>
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

      {analysisResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>分析结果</CardTitle>
            <CardDescription>
              提取的三重一大信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">文件名</TableHead>
                    <TableHead>会议时间</TableHead>
                    <TableHead>文号</TableHead>
                    <TableHead>会议议题</TableHead>
                    <TableHead>事项类别</TableHead>
                    <TableHead>涉及金额</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="truncate max-w-[160px]" title={result.fileName}>
                            {result.fileName}
                          </span>
                        </div>
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
                        {renderStatus(result.status, result.error)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button variant="outline">导出结果</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 