'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { uploadProjectFile } from '@/lib/api/project-file-api';
import { ProjectFile } from '@/lib/api/project-file-api';

interface FileUploaderProps {
  projectId: string;
  onUploadComplete: (newFiles: ProjectFile[]) => void;
}

export function FileUploader({ projectId, onUploadComplete }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      // 转换FileList为数组
      const filesArray = Array.from(selectedFiles);

      // 使用API上传文件
      const result = await uploadProjectFile(
        projectId,
        filesArray,
        (progress) => setUploadProgress(progress)
      );

      // 通知父组件上传完成
      onUploadComplete(result.files);

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

  return (
    <div className="flex flex-col gap-3 px-2">
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
  );
} 