'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload, UploadedFile } from '@/components/FileUpload';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { FileIcon, FileText, File, Trash2, Eye } from 'lucide-react';

interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadDate: string;
  category: 'meeting' | 'contract' | 'attachment';
  isAnalyzed: boolean;
}

// 模拟文件数据
const MOCK_FILES = {
  '1': [
    {
      id: 'file1',
      name: '第三季度经营分析会议纪要.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 521000,
      url: 'https://example.com/files/file1.docx',
      uploadDate: '2023-10-20',
      category: 'meeting',
      isAnalyzed: true
    },
    {
      id: 'file2',
      name: '年度工作总结会议.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 382000,
      url: 'https://example.com/files/file2.docx',
      uploadDate: '2023-11-05',
      category: 'meeting',
      isAnalyzed: true
    },
    {
      id: 'file3',
      name: '设备采购合同.pdf',
      type: 'application/pdf',
      size: 1240000,
      url: 'https://example.com/files/file3.pdf',
      uploadDate: '2023-11-20',
      category: 'contract',
      isAnalyzed: false
    }
  ],
  '2': [
    {
      id: 'file4',
      name: '工厂扩建项目会议纪要.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 450000,
      url: 'https://example.com/files/file4.docx',
      uploadDate: '2023-09-15',
      category: 'meeting',
      isAnalyzed: true
    }
  ],
  '3': [
    {
      id: 'file5',
      name: '环保设备升级会议纪要.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 380000,
      url: 'https://example.com/files/file5.docx',
      uploadDate: '2023-08-10',
      category: 'meeting',
      isAnalyzed: false
    },
    {
      id: 'file6',
      name: '技术合作协议.pdf',
      type: 'application/pdf',
      size: 950000,
      url: 'https://example.com/files/file6.pdf',
      uploadDate: '2023-09-05',
      category: 'contract',
      isAnalyzed: false
    }
  ]
} as Record<string, ProjectFile[]>;

export default function ProjectFiles({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟从API获取文件列表
    setTimeout(() => {
      setFiles(MOCK_FILES[projectId] || []);
      setLoading(false);
    }, 300);
  }, [projectId]);

  const handleUploadComplete = (file: UploadedFile) => {
    // 添加新上传的文件到列表
    const newFile: ProjectFile = {
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.url,
      uploadDate: new Date().toISOString().split('T')[0],
      category: determineCategory(file.name),
      isAnalyzed: false
    };
    
    setFiles(prev => [...prev, newFile]);
    toast.success(`文件 ${file.name} 上传成功`);
  };

  const determineCategory = (fileName: string): 'meeting' | 'contract' | 'attachment' => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('会议') || lowerName.includes('纪要')) {
      return 'meeting';
    } else if (lowerName.includes('合同') || lowerName.includes('协议')) {
      return 'contract';
    }
    return 'attachment';
  };

  const handleDelete = (fileId: string) => {
    // 这里应该是实际的API调用
    setTimeout(() => {
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success('文件已删除');
    }, 300);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const renderFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileIcon className="h-5 w-5 text-red-500" />;
    } else if (fileType.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>文件上传</CardTitle>
          <CardDescription>
            上传会议纪要、合同等文件，支持 Word 和 PDF 格式
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={(error) => toast.error(`上传失败: ${error.message}`)}
            accept={{
              'application/pdf': ['.pdf'],
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            }}
            maxSize={20 * 1024 * 1024} // 20MB
            maxFiles={10}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>文件列表</CardTitle>
          <CardDescription>
            已上传的文件列表，可查看和管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse">加载文件列表...</div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无上传的文件</p>
              <p className="text-sm mt-1">请上传会议纪要、合同等文件</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">文件名</TableHead>
                    <TableHead>类别</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>上传日期</TableHead>
                    <TableHead>分析状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {renderFileIcon(file.type)}
                        <span className="truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {file.category === 'meeting' && '会议纪要'}
                        {file.category === 'contract' && '合同文件'}
                        {file.category === 'attachment' && '附件'}
                      </TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>{file.uploadDate}</TableCell>
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
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="查看文件">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="删除文件" 
                            onClick={() => handleDelete(file.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 