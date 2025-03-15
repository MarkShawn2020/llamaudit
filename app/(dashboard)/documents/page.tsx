'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, FileText, Search, BarChart } from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { UploadDialog } from '@/app/components/upload-dialog';
import { uploadDocuments } from '@/lib/document-service';
import { useState } from 'react';

export default function DocumentsPage() {
  return (
    <ClientDocumentsPage />
  );
}



function ClientDocumentsPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUploadFiles = async (files: File[], organizationId: string, documentType: string) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    try {
      const result = await uploadDocuments(files, organizationId, documentType);
      
      if (result.success) {
        setUploadSuccess(true);
        // 可以在这里添加一些提示或刷新文档列表
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
      } else {
        setUploadError(result.message);
      }
      
      return result;
    } catch (error) {
      setUploadError('上传过程中发生错误');
      console.error('上传出错:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">文档管理</h1>
        <div className="space-x-2">
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            上传文件
          </Button>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            添加审计单位
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
          <p>上传失败: {uploadError}</p>
        </div>
      )}
      
      {uploadSuccess && (
        <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded mb-4">
          <p>文件上传成功!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="bg-blue-50 p-4 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">文档库</h3>
          <p className="text-gray-600 mb-6 flex-grow">
            管理和组织所有上传的会议纪要、合同及其他文档，支持按单位和文档类型筛选。
          </p>
          <Button variant="outline" className="w-full">
            <Link href="/documents/library" className="w-full flex items-center justify-center">
              浏览文档库
            </Link>
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="bg-orange-50 p-4 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <BarChart className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">信息提取</h3>
          <p className="text-gray-600 mb-6 flex-grow">
            从会议纪要中提取"三重一大"决策信息，从合同中提取关键条款，实现自动化信息整理。
          </p>
          <Button variant="outline" className="w-full">
            <Link href="/documents/extract" className="w-full flex items-center justify-center">
              信息提取
            </Link>
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="bg-green-50 p-4 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">智能问答</h3>
          <p className="text-gray-600 mb-6 flex-grow">
            针对文档内容提问，获取准确答案和详细的推理过程，辅助审计分析和决策。
          </p>
          <Button variant="outline" className="w-full">
            <Link href="/documents/qa" className="w-full flex items-center justify-center">
              开始问答
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">开始使用</h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <span className="font-medium">添加审计单位</span> - 首先添加需要审计的单位信息
          </li>
          <li>
            <span className="font-medium">上传文档</span> - 上传会议纪要、合同等文档
          </li>
          <li>
            <span className="font-medium">提取信息</span> - 使用AI自动提取关键信息
          </li>
          <li>
            <span className="font-medium">合规检查</span> - 设置规则并检查文档合规性
          </li>
          <li>
            <span className="font-medium">智能问答</span> - 针对文档内容提问获取分析
          </li>
        </ol>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">最近活动</h2>
          <Button variant="ghost" size="sm">查看全部</Button>
        </div>
        <div className="text-gray-500 text-center py-12">
          暂无活动记录，开始上传文档并提取信息吧！
        </div>
      </div>

      {/* 上传文件对话框 */}
      <UploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUpload={handleUploadFiles}
      />
    </div>
  );
} 
