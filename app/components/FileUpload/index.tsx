import { uploadFile } from '@/lib/api/file-api';
import { cn } from '@/lib/utils';
import { AlertCircle, Check, FileText, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';

export interface FileUploadProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: Error) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  className?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface FileWithProgress {
  file: File;
  progress: number;
  error?: string;
  complete?: boolean;
  id?: string;
  url?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
  },
  maxSize = 10 * 1024 * 1024, // 默认10MB
  maxFiles = 5,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const newFiles = acceptedFiles.map((file) => ({
        file,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // 上传文件
      for (const fileWithProgress of newFiles) {
        try {
          // 设置进度更新回调
          const onProgress = (progress: number) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.file === fileWithProgress.file
                  ? { ...f, progress }
                  : f
              )
            );
          };

          // 上传文件并获取结果
          const result = await uploadFile(fileWithProgress.file, onProgress);

          // 更新文件状态为已完成
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? {
                    ...f,
                    progress: 100,
                    complete: true,
                    id: result.id,
                    url: result.url,
                  }
                : f
            )
          );

          // 调用完成回调
          if (onUploadComplete) {
            onUploadComplete({
              id: result.id,
              name: fileWithProgress.file.name,
              size: fileWithProgress.file.size,
              type: fileWithProgress.file.type,
              url: result.url,
            });
          }
        } catch (error) {
          console.error('文件上传错误:', error);
          
          // 更新文件状态为错误
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? {
                    ...f,
                    error: error instanceof Error ? error.message : '上传失败',
                  }
                : f
            )
          );

          // 调用错误回调
          if (onUploadError && error instanceof Error) {
            onUploadError(error);
          }
        }
      }
    },
    [onUploadComplete, onUploadError]
  );

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
  });

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-primary/5'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            拖拽文件到此处上传，或<span className="text-primary font-medium">点击选择文件</span>
          </p>
          <p className="text-xs text-muted-foreground">
            支持的文件类型: PDF, DOC, DOCX, JPG, PNG (最大 {maxSize / 1024 / 1024} MB)
          </p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <Card className="bg-destructive/10 text-destructive p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">文件格式或大小不符合要求</p>
              <ul className="text-sm list-disc list-inside">
                {fileRejections.map(({ file, errors }) => (
                  <li key={file.name}>
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB) - 
                    {errors.map(e => e.message).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithProgress, index) => (
            <div
              key={`${fileWithProgress.file.name}-${index}`}
              className="flex items-center gap-3 p-3 border rounded-md"
            >
              <FileText className="h-8 w-8 text-primary-muted flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <p className="text-sm font-medium truncate">{fileWithProgress.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(fileWithProgress.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                
                {fileWithProgress.error ? (
                  <p className="text-xs text-destructive mt-1">{fileWithProgress.error}</p>
                ) : (
                  <Progress 
                    value={fileWithProgress.progress} 
                    className="h-1.5 mt-2" 
                  />
                )}
              </div>

              <div className="flex-shrink-0">
                {fileWithProgress.complete ? (
                  <Check className="h-5 w-5 text-success" />
                ) : fileWithProgress.error ? (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFile(fileWithProgress.file)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFile(fileWithProgress.file)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 