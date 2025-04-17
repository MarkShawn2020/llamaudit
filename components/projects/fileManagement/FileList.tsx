'use client';

import { useMemo } from 'react';
import { ProjectFile } from '@/lib/api/project-file-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox, CheckboxIndicator } from '@/components/ui/checkbox';
import { Loader2, PlayIcon } from 'lucide-react';
import { FileItem } from './FileItem';
import { FileUploader } from './FileUploader';

interface FileListProps {
  projectId: string;
  files: ProjectFile[];
  selectedFiles: string[];
  loading: boolean;
  isAnalyzing: boolean;
  deletingFileId: string | null;
  onSelectFile: (fileId: string, checked: boolean) => void;
  onSelectAllFiles: () => void;
  onAnalyze: () => void;
  onDeleteFile: (fileId: string) => void;
  onViewFile: (file: ProjectFile) => void;
  onDownloadFile: (file: ProjectFile) => void;
  onUploadComplete: (newFiles: ProjectFile[]) => void;
}

export function FileList({
  projectId,
  files,
  selectedFiles,
  loading,
  isAnalyzing,
  deletingFileId,
  onSelectFile,
  onSelectAllFiles,
  onAnalyze,
  onDeleteFile,
  onViewFile,
  onDownloadFile,
  onUploadComplete
}: FileListProps) {
  // 判断是否所有文件都已被选中
  const allFilesSelected = useMemo(() => {
    return files.length > 0 && selectedFiles.length === files.length;
  }, [files, selectedFiles]);

  return (
    <Card>
      <div className='flex gap-3 justify-between items-center px-4'>
        <CardHeader>
          <CardTitle>项目文件管理</CardTitle>
          <CardDescription>
            上传、管理和准备分析的文件
          </CardDescription>
        </CardHeader>

        <div className='flex gap-3 justify-between items-center px-4'>
          <FileUploader 
            projectId={projectId} 
            onUploadComplete={onUploadComplete} 
          />

          <div className="flex">
            <Button
              onClick={onAnalyze}
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
        </div>
      </div>

      <CardContent>
        <div className="rounded-md border overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allFilesSelected}
                    onCheckedChange={onSelectAllFiles}
                    disabled={loading || isAnalyzing}
                  >
                    <CheckboxIndicator />
                  </Checkbox>
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
                  <FileItem 
                    key={file.id}
                    file={file}
                    isSelected={selectedFiles.includes(file.id)}
                    isAnalyzing={isAnalyzing}
                    isDeletingFile={deletingFileId === file.id}
                    onSelect={onSelectFile}
                    onView={onViewFile}
                    onDownload={onDownloadFile}
                    onDelete={onDeleteFile}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 