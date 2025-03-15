'use client';

import { UploadDialog } from '@/app/components/upload-dialog';
import { Button } from '@/components/ui/button';
import { getDocuments, uploadDocuments } from '@/lib/document-service';
import { ChevronLeft, File, FileText, Filter, Upload } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DocumentItem {
  id: string;
  name: string;
  organizationName: string;
  documentType: string;
  uploadedAt: string;
  extractedInfo: boolean;
}

export default function DocumentLibraryPage() {
  return (
    <ClientDocumentLibraryPage />
  );
}

function ClientDocumentLibraryPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // 文档列表状态
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // 筛选状态
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 获取文档列表
  const fetchDocuments = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const response = await getDocuments({
        organizationId: selectedOrg || undefined,
        documentType: selectedType || undefined,
      });
      
      if (response.success) {
        setDocuments(response.data || []);
      } else {
        setLoadError('获取文档列表失败');
      }
    } catch (error) {
      console.error('获取文档列表错误:', error);
      setLoadError('获取文档列表时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载和筛选条件变化时获取数据
  useEffect(() => {
    fetchDocuments();
  }, [selectedOrg, selectedType]);

  // 处理文件上传
  const handleUploadFiles = async (files: File[], organizationId: string, documentType: string) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    try {
      const result = await uploadDocuments(files, organizationId, documentType);
      
      if (result.success) {
        setUploadSuccess(true);
        // 上传成功后刷新文档列表
        fetchDocuments();
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
      } else {
        setUploadError(result.message);
      }
    } catch (error) {
      setUploadError('上传过程中发生错误');
      console.error('上传出错:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // 过滤文档列表（本地搜索）
  const filteredDocuments = searchQuery 
    ? documents.filter(doc => 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.organizationName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/documents" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        返回文档管理
      </Link>
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">文档库</h1>
        <div className="space-x-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </Button>
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            上传文件
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
      
      {loadError && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
          <p>加载文档失败: {loadError}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <select 
                className="border rounded px-2 py-1 text-sm mr-2"
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                <option value="">所有单位</option>
                <option value="org1">XX公司</option>
                <option value="org2">YY事业单位</option>
              </select>
              <select 
                className="border rounded px-2 py-1 text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">所有文档类型</option>
                <option value="meeting">会议纪要</option>
                <option value="contract">合同</option>
                <option value="attachment">附件</option>
              </select>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="搜索文档..." 
                className="border rounded px-3 py-1 pl-8 text-sm w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件名
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  单位
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  上传时间
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  提取状态
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">加载中...</p>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr className="text-center">
                  <td colSpan={6} className="px-6 py-12 text-gray-500">
                    暂无文档，请上传文件
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {doc.documentType.includes('pdf') ? (
                          <FileText className="h-4 w-4 text-red-500 mr-2" />
                        ) : (
                          <File className="h-4 w-4 text-blue-500 mr-2" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.organizationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.documentType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doc.extractedInfo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.extractedInfo ? '已提取' : '未提取'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-orange-600 hover:text-orange-900 mr-3">
                        查看
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        提取
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
