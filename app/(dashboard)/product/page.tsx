import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, ChevronRight, Code, FileText } from 'lucide-react';

export default function ProductPage() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center text-primary/90 hover:text-primary/80 mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回首页
      </Link>
      
      <h1 className="text-4xl font-bold mb-8">LLM审计 - DeepSeek大模型驱动的审计解决方案</h1>
      
      <div className="prose max-w-none">
        <p className="text-xl text-gray-600 mb-8">
          利用DeepSeek的先进大语言模型能力，我们打造了一套智能审计系统，专注于提高审计工作效率、
          降低人工负担，同时提升审计结果的准确性和可解释性。
        </p>
        
        <h2 className="text-2xl font-bold mt-12 mb-6">技术亮点</h2>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-primary/10 p-6 rounded-lg border border-orange-100">
            <div className="flex items-center mb-4">
              <Brain className="h-8 w-8 text-primary/90 mr-3" />
              <h3 className="text-xl font-semibold">DeepSeek-R1 推理能力</h3>
            </div>
            <p>
              DeepSeek-R1是一个专为复杂推理设计的大模型，具有出色的上下文理解和逻辑推理能力。系统利用其
              reasoning_content功能，不仅提供结果，还展示详细的推理过程，使审计决策更加透明和可靠。
            </p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <div className="flex items-center mb-4">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold">智能文档解析</h3>
            </div>
            <p>
              系统能够理解和提取各类文档中的关键信息，包括会议纪要中的决策内容、合同中的条款细节等。
              对于"三重一大"决策事项，系统可自动识别事项类别、涉及金额、相关人员等信息。
            </p>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mt-12 mb-6">DeepSeek模型集成细节</h2>
        
        <div className="overflow-x-auto mb-12">
          <table className="min-w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 p-3 text-left">模型</th>
                <th className="border border-gray-200 p-3 text-left">应用场景</th>
                <th className="border border-gray-200 p-3 text-left">技术特点</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 p-3">DeepSeek-V3</td>
                <td className="border border-gray-200 p-3">文档问答、简单信息处理</td>
                <td className="border border-gray-200 p-3">快速响应，高效处理常见问题</td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-3">DeepSeek-R1</td>
                <td className="border border-gray-200 p-3">会议纪要分析、合同解析、合规检查</td>
                <td className="border border-gray-200 p-3">高级推理能力，提供reasoning_content，可解释性强</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <h2 className="text-2xl font-bold mt-12 mb-6">系统架构</h2>
        
        <div className="mb-12">
          <p className="mb-4">
            系统采用现代化的架构设计，前后端分离，数据流程清晰：
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>前端UI层</strong>：使用Next.js构建响应式界面，提供直观的用户体验</li>
            <li><strong>API层</strong>：RESTful API设计，处理请求并与AI模型交互</li>
            <li><strong>AI处理层</strong>：集成DeepSeek模型，执行文本理解和推理</li>
            <li><strong>数据存储层</strong>：使用PostgreSQL数据库和Drizzle ORM，高效存储和检索数据</li>
            <li><strong>文件存储层</strong>：安全管理上传的文档文件</li>
          </ol>
        </div>
        
        <h2 className="text-2xl font-bold mt-12 mb-6">数据安全与隐私</h2>
        
        <div className="mb-12">
          <p>
            我们高度重视数据安全和隐私保护，采取了以下措施：
          </p>
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li>所有文档和数据存储在客户自己的服务器上，不会上传到外部</li>
            <li>与DeepSeek API的通信采用加密传输</li>
            <li>严格的访问控制和用户权限管理</li>
            <li>定期安全审计和漏洞扫描</li>
          </ul>
        </div>
        
        <h2 className="text-2xl font-bold mt-12 mb-6">示例：推理过程展示</h2>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-12">
          <h3 className="text-lg font-semibold mb-4">三重一大会议纪要分析示例</h3>
          <div className="bg-white p-4 rounded border border-gray-300 mb-4">
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {`用户输入: 从该会议纪要中提取关键信息
              
会议纪要内容: 
XX公司2023年第三季度经营决策会议纪要
时间：2023年7月15日
与会人员：张董事长、李总经理、王财务总监、赵技术总监
议题：关于投资新生产线项目的讨论
...`}
            </p>
          </div>
          
          <div className="mb-4">
            <h4 className="text-md font-medium mb-2">推理过程 (reasoning_content):</h4>
            <div className="bg-gray-100 p-4 rounded text-sm text-gray-700 whitespace-pre-line overflow-x-auto">
              {`让我从这份会议纪要中提取关键信息。我需要找出：会议时间、文号、议题、结论等。

首先，我可以看到以下信息：
- 会议名称：XX公司2023年第三季度经营决策会议
- 会议时间：2023年7月15日
- 与会人员：张董事长、李总经理、王财务总监、赵技术总监
- 议题：关于投资新生产线项目的讨论

这是一个关于投资的决策会议，属于"三重一大"中的"重大项目"类别...`}
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium mb-2">提取结果 (JSON):</h4>
            <div className="bg-black text-green-400 p-4 rounded text-sm font-mono overflow-x-auto">
              {`{
  "meetingDate": "2023-07-15",
  "documentNumber": "",
  "meetingTopic": "关于投资新生产线项目的讨论",
  "eventType": "重大项目",
  "involvedAmount": 3000000,
  ...
}`}
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-16">
          <Link href="/dashboard">
            <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full text-lg flex items-center">
              进入系统体验
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 
