/**
 * 乐观文件上传组件
 * 提供现代化的文件上传体验，支持乐观更新、进度显示和错误处理
 */

'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import {
  Upload,
  FileText,
  X,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Copy,
  Pause,
} from 'lucide-react';
import { useOptimisticFileUpload, FILE_STATUS_CONFIG } from '@/hooks/use-optimistic-upload';
import { OptimisticFile } from '@/lib/optimistic-upload';
import { cn } from '@/lib/utils';

interface OptimisticFileUploadProps {
  datasetId: string;
  className?: string;
  maxFiles?: number;
  acceptedFileTypes?: string[];
}

export default function OptimisticFileUpload({
  datasetId,
  className,
  maxFiles = 50,
  acceptedFileTypes = ['.txt', '.pdf', '.doc', '.docx', '.md']
}: OptimisticFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    files,
    progress,
    hasActiveUploads,
    hasFailedUploads,
    addFiles,
    retryUpload,
    cancelUpload,
    removeFile,
    clearCompleted,
    retryAllFailed,
    cancelAllPending,
  } = useOptimisticFileUpload(datasetId);

  // 触发文件选择
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
      // 重置输入，允许重复选择相同文件
      e.target.value = '';
    }
  };

  // 处理拖拽上传
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 渲染文件项
  const renderFileItem = (file: OptimisticFile) => {
    const config = FILE_STATUS_CONFIG[file.status];
    
    return (
      <Card key={file.localId} className="relative group transition-all duration-200 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 文件图标 */}
            <div className="flex-shrink-0 mt-1">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* 文件信息 */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* 文件名和状态 */}
              <div className="flex items-center justify-between gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="font-medium text-sm truncate max-w-[200px]">
                        {file.name}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{file.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Badge 
                  variant="secondary" 
                  className={cn("text-xs h-6", config.color, config.bgColor)}
                >
                  <span className="mr-1">{config.icon}</span>
                  {config.text}
                </Badge>
              </div>

              {/* 进度条（上传中时显示） */}
              {file.status === 'uploading' && (
                <div className="space-y-1">
                  <Progress value={file.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(file.progress)}%</span>
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              )}

              {/* 文件大小和其他信息 */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                {file.wordCount && (
                  <span>{file.wordCount.toLocaleString()} 字</span>
                )}
                {file.retryCount > 0 && (
                  <span>重试 {file.retryCount} 次</span>
                )}
              </div>

              {/* 错误信息 */}
              {file.error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{file.error}</span>
                </div>
              )}

              {/* 重复文件信息 */}
              {file.isDuplicate && (
                <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  <Copy className="h-3 w-3 flex-shrink-0" />
                  <span>{file.duplicateReason || '检测到重复内容'}</span>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {file.status === 'failed' && file.retryCount < 3 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => retryUpload(file.localId)}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>重试上传</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {['pending', 'uploading'].includes(file.status) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => cancelUpload(file.localId)}
                      >
                        <Pause className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>取消上传</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {!['uploading', 'processing'].includes(file.status) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeFile(file.localId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>移除文件</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 上传区域 */}
      {files.length === 0 ? (
        // 空状态：大的拖拽上传区域
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/25 transition-all group"
          onClick={handleFileSelect}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="space-y-2">
              <div className="text-lg font-semibold">上传文档到知识库</div>
              <div className="text-sm text-muted-foreference">
                点击选择文件或拖拽文件到此处
              </div>
              <div className="text-xs text-muted-foreference">
                支持 {acceptedFileTypes.join(', ')} 格式，单文件最大 50MB
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 有文件时：紧凑的上传按钮
        <div className="flex items-center justify-between">
          <Button onClick={handleFileSelect} className="gap-2">
            <Upload className="h-4 w-4" />
            添加更多文件
          </Button>

          {/* 批量操作按钮 */}
          <div className="flex gap-2">
            {hasFailedUploads && (
              <Button
                variant="outline"
                size="sm"
                onClick={retryAllFailed}
                className="gap-2"
              >
                <RotateCcw className="h-3 w-3" />
                重试失败
              </Button>
            )}

            {hasActiveUploads && (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelAllPending}
                className="gap-2"
              >
                <Pause className="h-3 w-3" />
                取消等待
              </Button>
            )}

            {progress.completed > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Trash2 className="h-3 w-3" />
                    清理完成
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>清理已完成的文件</AlertDialogTitle>
                    <AlertDialogDescription>
                      这将从列表中移除所有已完成、重复和已取消的文件。此操作不会影响已上传到知识库的文档。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={clearCompleted}>
                      确认清理
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      )}

      {/* 进度统计 */}
      {files.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">上传进度</h4>
            <div className="text-xs text-muted-foreground">
              {progress.completed + progress.duplicates} / {progress.total} 完成
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-blue-600">{progress.inProgress}</div>
              <div className="text-xs text-muted-foreground">进行中</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-green-600">{progress.completed}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-orange-600">{progress.duplicates}</div>
              <div className="text-xs text-muted-foreground">重复</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-red-600">{progress.failed}</div>
              <div className="text-xs text-muted-foreference">失败</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold">{progress.total}</div>
              <div className="text-xs text-muted-foreference">总计</div>
            </div>
          </div>
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <div className="space-y-2">
            {files.map(renderFileItem)}
          </div>
        </div>
      )}
    </div>
  );
}