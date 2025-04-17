'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox, CheckboxIndicator } from '@/components/ui/checkbox';
import { Loader2, Eye, Download, Trash } from 'lucide-react';
import { ProjectFile } from '@/lib/api/project-file-api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { getFileIcon } from '../utils/fileIcons';

interface FileItemProps {
  file: ProjectFile;
  isSelected: boolean;
  isAnalyzing: boolean;
  isDeletingFile: boolean;
  onSelect: (fileId: string, checked: boolean) => void;
  onView: (file: ProjectFile) => void;
  onDownload: (file: ProjectFile) => void;
  onDelete: (fileId: string) => void;
}

export function FileItem({
  file,
  isSelected,
  isAnalyzing,
  isDeletingFile,
  onSelect,
  onView,
  onDownload,
  onDelete
}: FileItemProps) {
  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    // 如果点击事件源自操作按钮区域，不触发行选择
    if (!(e.target as HTMLElement).closest('.action-buttons')) {
      onSelect(file.id, !isSelected);
    }
  };

  return (
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
  );
} 