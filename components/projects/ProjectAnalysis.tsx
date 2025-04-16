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
  BarChart3
} from 'lucide-react';
import { MeetingAnalysisResult, analyzeMeetingDocuments } from '@/lib/api/document-api';
import { getProjectFiles, updateFileAnalysisStatus, ProjectFile } from '@/lib/api/project-file-api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { saveDocumentAnalysisResults } from '@/lib/api/analysis-api';

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

export default function ProjectAnalysis({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [rawAnalysisResults, setRawAnalysisResults] = useState<MeetingAnalysisResult[]>([]);
  const [groupedResults, setGroupedResults] = useState<FileAnalysisGroup[]>([]);
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

  // 处理分析结果分组
  useEffect(() => {
    // 按文件ID分组结果
    const groupMap = new Map<string, FileAnalysisGroup>();
    
    rawAnalysisResults.forEach(result => {
      const fileId = result.id;
      
      if (!groupMap.has(fileId)) {
        // 创建新的文件分组
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
      
      const group = groupMap.get(fileId)!;
      
      // 如果结果是已完成且有有效内容，则添加到结果列表
      if (result.status === 'completed' && result.meetingTopic) {
        group.results.push(result);
      }
      
      // 更新组的状态
      group.status = result.status;
      if (result.error) {
        group.error = result.error;
      }
    });
    
    setGroupedResults(Array.from(groupMap.values()));
  }, [rawAnalysisResults, files]);

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

      <Card>
        <CardHeader>
          <CardTitle>分析结果</CardTitle>
          <CardDescription>
            提取的三重一大信息
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {groupedResults.length > 0 ? (
            <Tabs defaultValue="card" className="w-full px-6">
              <div className="flex justify-between items-center border-b pb-4">
                <TabsList>
                  <TabsTrigger value="card">卡片视图</TabsTrigger>
                  <TabsTrigger value="table">表格视图</TabsTrigger>
                </TabsList>
                <Button variant="outline">导出结果</Button>
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
              <p className="text-sm">请从上方选择文件并点击"开始分析"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 