import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Send, Brain } from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export default async function QAPage() {
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
        <h1 className="text-2xl font-bold">智能问答</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold mb-4">选择文档范围</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">审计单位</label>
                <select className="w-full border rounded px-3 py-2 text-sm">
                  <option>所有单位</option>
                  <option>XX公司</option>
                  <option>YY事业单位</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">文档类型</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="type-all" className="mr-2" checked />
                    <label htmlFor="type-all">所有文档</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="type-meeting" className="mr-2" />
                    <label htmlFor="type-meeting">会议纪要</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="type-contract" className="mr-2" />
                    <label htmlFor="type-contract">合同</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="type-attachment" className="mr-2" />
                    <label htmlFor="type-attachment">附件</label>
                  </div>
                </div>
              </div>
              <div className="pt-3">
                <Button className="w-full">应用筛选</Button>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">问题示例</h2>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                XX单位2023年第三季度有哪些重大项目决策？
              </div>
              <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                总结所有合同中的支付条款模式有哪些？
              </div>
              <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                近半年来，哪些会议涉及大额资金支出？
              </div>
              <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                所有合同中是否存在违约责任不明确的情况？
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[600px]">
            <div className="p-4 border-b">
              <div className="flex items-center">
                <div className="bg-orange-50 p-2 rounded-full mr-2">
                  <Brain className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="font-semibold">DeepSeek-R1 智能问答</h2>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <Brain className="h-12 w-12 text-gray-300 mb-3" />
                <p className="mb-1">智能问答助手已准备就绪</p>
                <p className="text-sm">请在下方输入您的问题</p>
              </div>
            </div>
            
            <div className="p-4 border-t">
              <div className="flex items-center">
                <input 
                  type="text" 
                  placeholder="输入您的问题..." 
                  className="flex-grow border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Button className="rounded-l-none rounded-r-lg bg-orange-600 hover:bg-orange-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                问答基于DeepSeek-R1大模型，能够提供详细的推理过程和准确的答案。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
