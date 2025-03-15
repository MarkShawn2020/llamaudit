import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, FileText, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export default async function ExtractInfoPage() {
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
        <h1 className="text-2xl font-bold">信息提取</h1>
        <Button className="bg-orange-600 hover:bg-orange-700">
          开始批量提取
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <div className="bg-blue-50 p-2 rounded-full mr-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            会议纪要 - 三重一大信息提取
          </h2>
          <p className="text-gray-600 mb-6">
            从会议纪要中自动提取三重一大决策信息，包括会议时间、议题、结论、涉及资金等关键字段。
          </p>
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <div className="flex items-center mr-4">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              <span>已提取: 0</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-500 mr-1" />
              <span>待提取: 0</span>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            查看提取结果
          </Button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <div className="bg-orange-50 p-2 rounded-full mr-2">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            合同信息提取
          </h2>
          <p className="text-gray-600 mb-6">
            从合同文档中自动提取合同编号、签署日期、金额、条款等关键信息，便于管理和审查。
          </p>
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <div className="flex items-center mr-4">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              <span>已提取: 0</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-500 mr-1" />
              <span>待提取: 0</span>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            查看提取结果
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">信息提取说明</h2>
        <div className="text-gray-600 space-y-3">
          <p>
            系统利用DeepSeek-R1大模型进行智能信息提取，不仅能够提取常规字段，还能理解复杂的上下文语义，
            确保提取信息的准确性和完整性。
          </p>
          <h3 className="font-medium mt-4">三重一大信息提取字段：</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>会议时间、文号、会议议题、会议结论、内容摘要</li>
            <li>事项类别（重大决策、重要干部任免、重大项目、大额资金）</li>
            <li>事项详情、涉及资金数额、相关部门、相关人员、决策依据</li>
          </ul>
          
          <h3 className="font-medium mt-4">合同信息提取字段：</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>合同编号、签署日期、合同名称、甲方、乙方</li>
            <li>合同金额（含税/不含税）、支付条款、履约期限</li>
            <li>双方义务、验收标准、违约责任</li>
          </ul>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">待提取文档</h2>
          <Button variant="ghost" size="sm">查看全部</Button>
        </div>
        <div className="text-gray-500 text-center py-12">
          暂无待提取文档，请先上传文件
        </div>
      </div>
    </div>
  );
} 
