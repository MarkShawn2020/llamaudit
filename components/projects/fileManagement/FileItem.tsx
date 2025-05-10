'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox, CheckboxIndicator } from '@/components/ui/checkbox';
import { Loader2, Eye, Download, Trash, ChevronDown, ChevronUp } from 'lucide-react';
import { ProjectFile } from '@/lib/api/project-file-api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { getFileIcon } from '../utils/fileIcons';
import { Markdown } from '@/components/ui/markdown';
import { FileAnalysisTask } from '../hooks/useStreamingAnalysis';

interface FileItemProps {
  file: ProjectFile;
  isSelected: boolean;
  isAnalyzing: boolean;
  isDeletingFile: boolean;
  analysisTask?: FileAnalysisTask | null;
  isExpanded?: boolean;
  onSelect: (fileId: string, checked: boolean) => void;
  onView: (file: ProjectFile) => void;
  onDownload: (file: ProjectFile) => void;
  onDelete: (fileId: string) => void;
  onToggleExpand?: (fileId: string) => void;
  onCancelAnalysis?: (fileId: string) => void;
}

export function FileItem({
  file,
  isSelected,
  isAnalyzing,
  isDeletingFile,
  analysisTask,
  isExpanded = false,
  onSelect,
  onView,
  onDownload,
  onDelete,
  onToggleExpand,
  onCancelAnalysis
}: FileItemProps) {
  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    // 如果点击事件源自操作按钮区域，不触发行选择
    if (!(e.target as HTMLElement).closest('.action-buttons')) {
      onSelect(file.id, !isSelected);
    }
  };

  // 判断分析状态
  const isFileAnalyzing = isAnalyzing && (file.isAnalyzed === false);
  const hasAnalysisResult = analysisTask && (analysisTask.streamingResult !== '');
  const isAnalysisComplete = analysisTask?.isComplete === true;
  const hasAnalysisError = analysisTask?.error !== null;
  
  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={handleClick}
      >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(file.id, checked === true)}
          disabled={isAnalyzing}
        >
          <CheckboxIndicator />
        </Checkbox>
      </TableCell>
      <TableCell className="font-medium flex items-center gap-2">
        {getFileIcon(file.filename)}
        <span className="truncate max-w-[200px]" title={file.filename}>
          {file.filename}
        </span>
      </TableCell>
      <TableCell>
        {file.category === 'meeting' && '会议纪要'}
        {file.category === 'contract' && '合同文件'}
        {file.category === 'attachment' && '附件'}
        {!file.category && '文档'}
      </TableCell>
      <TableCell>{formatFileSize(file.size)}</TableCell>
      <TableCell>{formatDate(file.createdAt)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isFileAnalyzing ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              分析中
            </span>
          ) : file.isAnalyzed ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              已分析
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              未分析
            </span>
          )}
          
          {/* 如果有分析结果，展示展开/折叠按钮 */}
          {hasAnalysisResult && onToggleExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(file.id);
              }}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2 action-buttons">
          <Button size="sm" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            onView(file);
          }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            onDownload(file);
          }}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file.id);
            }}
            disabled={isDeletingFile}
          >
            {isDeletingFile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
      
      {/* 分析结果展开区 */}
      {isExpanded && hasAnalysisResult && (
        <TableRow className="bg-muted/10">
          <TableCell colSpan={7} className="p-0">
            <div className="px-4 py-3 border-t">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium">分析结果</h4>
                {isFileAnalyzing && onCancelAnalysis && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onCancelAnalysis(file.id)}
                    className="text-red-500 text-xs h-7"
                  >
                    取消分析
                  </Button>
                )}
              </div>
              
              <div className="rounded-md border p-3 max-h-[400px] overflow-auto">
                {analysisTask?.streamingResult ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
                    <Markdown>{analysisTask.streamingResult}</Markdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">正在加载分析结果...</p>
                )}
                
                {hasAnalysisError && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
                    <p className="font-medium">分析错误</p>
                    <p>{analysisTask?.error}</p>
                  </div>
                )}
                
                {isAnalysisComplete && !hasAnalysisError && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-sm">
                    分析完成
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
} 