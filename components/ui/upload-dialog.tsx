import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import OSS from 'ali-oss';
import { FileText } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface STSToken {
  AccessKeyId: string;
  AccessKeySecret: string;
  SecurityToken: string;
  Expiration: string;
}

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], organizationId: string, documentType: string) => Promise<void>;
}

export function UploadDialog({ isOpen, onClose, onUpload }: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [credentials, setCredentials] = useState<STSToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  // 获取 STS Token
  const getSTSToken = async () => {
    try {
      const response = await fetch('/api/oss/get-sts-token');
      if (!response.ok) {
        throw new Error('Failed to get STS token');
      }
      const data = await response.json();
      setCredentials(data);
      return data;
    } catch (error) {
      console.error('获取 STS Token 失败:', error);
      throw error;
    }
  };

  // 检查凭证是否过期
  const isCredentialsExpired = useCallback((creds: STSToken | null) => {
    if (!creds) return true;
    const expireDate = new Date(creds.Expiration);
    const now = new Date();
    return expireDate.getTime() - now.getTime() <= 60000; // 如果剩余有效期小于1分钟，则视为过期
  }, []);

  // 获取 OSS 客户端实例
  const getOSSClient = async () => {
    let currentCredentials = credentials;
    if (isCredentialsExpired(currentCredentials)) {
      currentCredentials = await getSTSToken();
    }

    if (!currentCredentials) {
      throw new Error('Failed to get valid credentials');
    }

    return new OSS({
      region: process.env.NEXT_PUBLIC_OSS_REGION,
      bucket: process.env.NEXT_PUBLIC_OSS_BUCKET,
      accessKeyId: currentCredentials.AccessKeyId,
      accessKeySecret: currentCredentials.AccessKeySecret,
      stsToken: currentCredentials.SecurityToken,
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (files.length === 0 || !organizationId || !documentType) {
      setError('请选择文件、审计单位和文档类型');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(files, organizationId, documentType);
      onClose();
      setFiles([]);
      setUploadProgress({});
    } catch (error: any) {
      console.error('上传失败:', error);
      setError(error.message || '文件上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传文件</DialogTitle>
          <DialogDescription>
            上传Word或PDF格式的会议纪要、合同或其他文档。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">审计单位</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              <option value="">请选择单位</option>
              <option value="1">XX公司</option>
              <option value="2">YY事业单位</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">文档类型</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="">请选择类型</option>
              <option value="1">会议纪要</option>
              <option value="2">合同</option>
              <option value="3">附件</option>
            </select>
          </div>
          <div
            {...getRootProps()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            <input {...getInputProps()} />
            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <span>{file.name}</span>
                    {uploadProgress[index] !== undefined && (
                      <span className="text-sm text-gray-500">
                        ({uploadProgress[index]}%)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">
                <p>拖放文件到此处，或点击选择文件</p>
                <p className="text-sm">支持 PDF、DOC、DOCX 格式</p>
              </div>
            )}
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? '上传中...' : '上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
