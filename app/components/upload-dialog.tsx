import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Upload, FileText, File } from 'lucide-react';
import { useState } from 'react';

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
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
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    try {
      await onUpload(files, organizationId, documentType);
      // 上传成功后关闭对话框
      onClose();
      // 清空文件列表
      setFiles([]);
    } catch (error) {
      console.error('上传失败:', error);
      // 这里可以添加错误提示
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
              <option value="org1">XX公司</option>
              <option value="org2">YY事业单位</option>
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
              <label className="mt-4">
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                  accept=".docx,.doc,.pdf"
                />
                <Button type="button" variant="outline" size="sm">
                  选择文件
                </Button>
              </label>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">已选择 {files.length} 个文件</h4>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
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
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
