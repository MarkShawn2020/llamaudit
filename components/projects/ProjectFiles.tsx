'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Project } from '@/lib/api/project-api';
import { getProjectFiles, uploadProjectFile, deleteProjectFile, ProjectFile } from '@/lib/api/project-file-api';
import { toast } from 'sonner';
import { formatFileSize, formatDate } from '@/lib/utils';
import { Loader2, Trash, FileUp, Eye, Download } from 'lucide-react';

interface ProjectFilesProps {
  project: Project;
  onUpdate: () => void;
}

export default function ProjectFiles({ project, onUpdate }: ProjectFilesProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchFiles();
  }, [project.id]);

  // 获取项目文件列表
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const filesList = await getProjectFiles(project.id);
      setFiles(filesList);
    } catch (error) {
      console.error('获取文件列表失败:', error);
      toast.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // 转换FileList为数组
      const filesArray = Array.from(selectedFiles);
      
      // 使用新API上传文件
      const result = await uploadProjectFile(
        project.id, 
        filesArray,
        (progress) => setUploadProgress(progress)
      );
      
      // 更新本地文件状态
      setFiles([...files, ...result.files]);
      
      // 通知父组件
      onUpdate();
      
      toast.success(`成功上传 ${filesArray.length} 个文件`);
    } catch (error) {
      console.error('文件上传失败:', error);
      toast.error('文件上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // 重置文件输入
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      setDeleting(fileId);
      await deleteProjectFile(project.id, fileId);
      
      // 更新本地状态 - 移除已删除文件
      setFiles(files.filter(file => file.id !== fileId));
      
      // 通知父组件
      onUpdate();
      
      toast.success('文件已删除');
    } catch (error) {
      console.error('删除文件失败:', error);
      toast.error('删除文件失败');
    } finally {
      setDeleting(null);
    }
  };

  const downloadFile = (file: ProjectFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const viewFile = (file: ProjectFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>项目文件</CardTitle>
        <CardDescription>管理项目相关的所有文件</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center gap-2">
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
          <span className="text-sm text-muted-foreground">
            上传项目相关的文档和资料
          </span>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>文件名</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    <div className="flex justify-center items-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span>加载文件列表...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    暂无文件，点击"选择文件"上传
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">{file.filename}</TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{formatDate(file.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => viewFile(file)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadFile(file)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteFile(file.id)}
                          disabled={deleting === file.id}
                        >
                          {deleting === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 