import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Filter, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export default async function DocumentLibraryPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

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
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Upload className="h-4 w-4 mr-2" />
            上传文件
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <select className="border rounded px-2 py-1 text-sm mr-2">
                <option>所有单位</option>
                <option>XX公司</option>
                <option>YY事业单位</option>
              </select>
              <select className="border rounded px-2 py-1 text-sm">
                <option>所有文档类型</option>
                <option>会议纪要</option>
                <option>合同</option>
                <option>附件</option>
              </select>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="搜索文档..." 
                className="border rounded px-3 py-1 pl-8 text-sm w-64"
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
              <tr className="text-center">
                <td colSpan={6} className="px-6 py-12 text-gray-500">
                  暂无文档，请上传文件
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
