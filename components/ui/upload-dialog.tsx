import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import OSS from 'ali-oss';
import { File, FileText, Upload, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

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
  const [organizationId, setOrganizationId] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('meeting');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [credentials, setCredentials] = useState<STSToken | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    // 清除对应的上传进度
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
  };

  const uploadToOSS = async (file: File, index: number) => {
    const client = await getOSSClient();
    const fileName = `${organizationId}/${documentType}/${Date.now()}-${file.name}`;

    try {
      await client.multipartUpload(fileName, file, {
        progress: (p) => {
          setUploadProgress((prev) => ({
            ...prev,
            [index]: Math.floor(p * 100),
          }));
        },
        headers: {
          // 添加必要的 headers
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
        },
      });
      return fileName;
    } catch (error: any) {
      console.error('文件上传失败:', error);
      
      // 处理 CORS 错误
      if (error.code === 'AccessDenied' || error.message?.includes('CORS')) {
        throw new Error(`跨域请求被拒绝，请确保已正确配置 OSS 的 CORS 规则。\n具体错误: ${error.message}`);
      }
      
      // 处理其他常见错误
      if (error.code === 'InvalidAccessKeyId') {
        throw new Error('AccessKey 无效，请检查配置');
      }
      if (error.code === 'SignatureDoesNotMatch') {
        throw new Error('签名验证失败，请检查 AccessKey Secret');
      }
      if (error.code === 'NoSuchBucket') {
        throw new Error('Bucket 不存在，请检查配置');
      }
      
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0 || !organizationId) return;
    
    setIsUploading(true);
    setError(null);  // 重置错误状态
    
    try {
      const uploadPromises = files.map((file, index) => uploadToOSS(file, index));
      await Promise.all(uploadPromises);
      
      // 调用父组件的 onUpload 回调
      await onUpload(files, organizationId, documentType);
      
      // 重置状态
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
              <option value="meeting">会议纪要</option>
              <option value="contract">合同</option>
              <option value="attachment">附件</option>
            </select>
          </div>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center">
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-1">
                拖放文件到此处，或点击选择文件
              </p>
              <p className="text-xs text-gray-400">
                支持Word和PDF格式文件
              </p>
              <input
                type="file"
                className="hidden"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".docx,.doc,.pdf"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={openFileSelector}
              >
                选择文件
              </Button>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">已选择 {files.length} 个文件</h4>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <li key={index} className="space-y-2">
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center">
                        {file.type.includes('pdf') ? (
                          <FileText className="h-4 w-4 text-red-500 mr-2" />
                        ) : (
                          <File className="h-4 w-4 text-blue-500 mr-2" />
                        )}
                        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-gray-500 hover:text-gray-700"
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {uploadProgress[index] !== undefined && (
                      <div className="w-full">
                        <Progress value={uploadProgress[index]} className="h-1" />
                        <span className="text-xs text-gray-500">{uploadProgress[index]}%</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-2 p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || !organizationId || isUploading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isUploading ? '上传中...' : '上传文件'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
