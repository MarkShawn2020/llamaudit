'use client';

import React, { useState, useEffect } from 'react';
import { FileUpload, UploadedFile } from '@/components/FileUpload';
import FileAnalysisTable from './FileAnalysisTable';
import { Button } from '@/components/ui/button';
import { PlayIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MeetingAnalysisResult, analyzeMeetingDocuments } from '@/lib/api/document-api';
import { toast } from 'sonner';

export default function Dashboard() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [analysisResults, setAnalysisResults] = useState<MeetingAnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 处理文件上传完成事件
  const handleUploadComplete = (file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
    
    // 添加一个待处理的分析结果
    setAnalysisResults(prev => [
      ...prev,
      {
        id: file.id,
        fileName: file.name,
        status: 'pending',
        fileUrl: file.url,
        fileSize: file.size,
        fileType: file.type
      }
    ]);

    toast.success(`文件 ${file.name} 上传成功`);
  };

  // 处理文件上传错误
  const handleUploadError = (error: Error) => {
    toast.error(`文件上传失败: ${error.message}`);
  };

  // 一键解析所有文件
  const handleAnalyzeAll = async () => {
    const pendingFiles = analysisResults
      .filter(result => result.status === 'pending')
      .map(result => result.id);
    
    if (pendingFiles.length === 0) {
      toast.warning('没有待处理的文件');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // 更新所有待处理文件的状态为正在处理
      setAnalysisResults(prev => 
        prev.map(result => 
          pendingFiles.includes(result.id) 
            ? { ...result, status: 'processing' } 
            : result
        )
      );

      // 调用API批量解析文件
      const analysisPromises = analyzeMeetingDocuments(pendingFiles);
      
      // 使用Promise.allSettled处理所有解析请求
      const results = await Promise.allSettled(analysisPromises);
      
      // 更新解析结果
      results.forEach((result, index) => {
        const fileId = pendingFiles[index];
        
        if (result.status === 'fulfilled') {
          // 成功解析
          setAnalysisResults(prev => 
            prev.map(item => 
              item.id === fileId ? result.value : item
            )
          );
        } else {
          // 解析失败
          setAnalysisResults(prev => 
            prev.map(item => 
              item.id === fileId 
                ? { 
                    ...item, 
                    status: 'error', 
                    error: result.reason instanceof Error 
                      ? result.reason.message 
                      : '解析失败' 
                  } 
                : item
            )
          );
        }
      });

      toast.success(`已完成${results.length}个文件的解析`);
    } catch (error) {
      console.error('批量解析文件时出错:', error);
      toast.error('批量解析文件失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">会议纪要解析</h1>
      </div>
      
      {/* 上传区域 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>文件上传</CardTitle>
          <Button
            variant="default"
            onClick={handleAnalyzeAll}
            disabled={isAnalyzing || analysisResults.filter(r => r.status === 'pending').length === 0}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                一键解析
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            accept={{
              'application/pdf': ['.pdf'],
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            }}
            maxSize={20 * 1024 * 1024} // 20MB
            maxFiles={10}
            className="mb-4"
          />
          
          <p className="text-sm text-muted-foreground">
            已上传 {uploadedFiles.length} 个文件，其中 {analysisResults.filter(r => r.status === 'pending').length} 个待解析
          </p>
        </CardContent>
      </Card>
      
      {/* 解析结果区域 */}
      <Card>
        <CardHeader>
          <CardTitle>解析结果</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <FileAnalysisTable results={analysisResults} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 