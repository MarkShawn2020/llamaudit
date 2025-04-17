import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Search, ShieldCheck, Database } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl">
                智能审计平台
                <span className="block text-primary">基于 DeepSeek 大模型</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                利用DeepSeek-V3和DeepSeek-R1等先进大语言模型，自动提取会议纪要和合同关键信息，
                进行合规性检查，并提供智能问答功能，大幅提升审计效率。
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
                <Link href="/projects">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-lg px-8 py-4 inline-flex items-center justify-center">
                    立即体验
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <Image 
                src="/hero.png" 
                alt="智审大师 - AI驱动的审计辅助系统" 
                width={600} 
                height={400}
                className="rounded-lg shadow-lg"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  智能信息提取
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  使用DeepSeek-R1强大的理解能力，自动从会议纪要中提取"三重一大"决策信息，
                  从合同中提取关键条款，大幅减少人工录入工作量。
                </p>
              </div>
            </div>

            <div className="mt-10 lg:mt-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  自动合规检查
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  基于可自定义的合规规则，系统自动对文档进行合规性检查，
                  高效识别潜在风险，生成详细合规报告。
                </p>
              </div>
            </div>

            <div className="mt-10 lg:mt-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                <Search className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  智能文档问答
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  对导入的会议纪要、合同等文档进行提问，系统能理解文档内容并给出准确答案，
                  同时提供详细的推理过程，提升审计决策的透明度。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">核心功能</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-2">被审计单位管理</h3>
              <p className="text-gray-600">维护被审计单位基本信息，包括单位代码、单位名称等，方便组织和管理审计工作。</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-2">文件导入与管理</h3>
              <p className="text-gray-600">支持导入Word和PDF格式的会议纪要、合同及附件，按不同单位和文件类型进行组织管理。</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-2">三重一大信息提取</h3>
              <p className="text-gray-600">自动从会议纪要中提取会议时间、文号、议题、结论、事项类别等关键信息，减少人工操作。</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-2">合同信息提取</h3>
              <p className="text-gray-600">自动识别合同编号、签署日期、合同金额、支付条款等关键信息，便于合同管理和审查。</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-2">自定义合规规则</h3>
              <p className="text-gray-600">支持设置自定义合规检查规则，如参会人员要求、审批流程要求等，灵活适应不同审计需求。</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-2">智能问答与分析</h3>
              <p className="text-gray-600">基于导入的文档内容，回答审计人员的问题，辅助分析复杂情况，提高审计工作效率。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                基于最先进的AI技术
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-gray-500">
                审计系统集成了DeepSeek-V3和DeepSeek-R1大模型，在关键信息提取、理解和分析方面具有卓越能力。
                DeepSeek-R1模型专门针对复杂推理进行了优化，能提供详细的推理过程，确保审计结果的可解释性。
              </p>
            </div>
            <div className="mt-8 lg:mt-0 flex justify-center lg:justify-end">
              <Link href="/product">
                <Button className="bg-white hover:bg-gray-100 text-primary border border-gray-200 rounded-full text-xl px-12 py-6 inline-flex items-center justify-center">
                  了解技术细节
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
