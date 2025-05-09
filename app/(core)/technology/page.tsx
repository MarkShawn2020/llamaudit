import { Button } from '@/components/ui/button';
import { ArrowLeft, Cpu, Database, LucideShield, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function TechnologyPage() {
  return (
    <main className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-6">
          技术细节
          <span className="block text-primary text-2xl mt-2">智审大师背后的先进技术</span>
        </h1>



        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">系统架构</h2>
          <div className="flex flex-col items-center mb-8">
            <div className="w-full max-w-4xl shadow-lg rounded-lg overflow-hidden border border-gray-100">
              <Image
                src="/architecture.png"
                alt="智审大师系统架构图"
                width={1000}
                height={700}
                className="w-full h-auto"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 italic">智审大师系统架构图</p>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-lg border border-gray-100 mt-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Database className="h-5 w-5 text-primary mr-2" />
                  数据层
                </h3>
                <p className="text-gray-600">
                  采用现代化的数据库架构，高效存储和管理各类审计数据，包括文档元数据、提取的结构化信息和审计结果。
                  支持高并发访问和数据安全备份。
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Cpu className="h-5 w-5 text-primary mr-2" />
                  处理层
                </h3>
                <p className="text-gray-600">
                  集成DeepSeek大模型推理引擎，借助DeepSeek-V3的混合专家架构和DeepSeek-R1的强化学习能力，
                  实现高效文档解析、精准信息提取和智能问答等核心功能。处理层采用微服务架构，保证系统的扩展性和维护性。
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <LucideShield className="h-5 w-5 text-primary mr-2" />
                  安全层
                </h3>
                <p className="text-gray-600">
                  实现严格的数据隔离和访问控制，确保审计信息的安全性。
                  所有数据均在用户私有环境中处理，不会上传至公共云端，满足合规与保密要求。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">大模型技术集成</h2>
          <p className="text-gray-600 mb-6">
            智审大师集成了DeepSeek系列最先进的大模型技术，通过私有化部署方式实现敏感审计数据的安全处理。
            各模型在不同任务中协同工作，为审计工作提供全方位智能支持。
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Cpu className="h-5 w-5 text-primary mr-2" />
                DeepSeek-V3模型
              </h3>
              <p className="text-gray-600 mb-4">
                DeepSeek-V3是基于混合专家系统（Mixture-of-Experts, MoE）架构的超大规模语言大模型，
                在智审大师中主要负责基础文本理解、生成和智能问答功能。
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
                <li>总参数规模：6710亿（671B）参数，每个token仅激活37B参数</li>
                <li>上下文窗口：128K tokens</li>
                <li>技术特点：多维度注意力压缩（MLA）、深度优化的MoE架构</li>
                <li>应用场景：智能问答、文档摘要、内容生成</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Zap className="h-5 w-5 text-primary mr-2" />
                DeepSeek-R1模型
              </h3>
              <p className="text-gray-600 mb-4">
                DeepSeek-R1是基于DeepSeek-V3-Base开发的深度推理大模型，能够进行复杂的思考和逻辑推理。
                在智审大师中，它主要负责关键信息提取和合规性分析。
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
                <li>参数规模：基于DeepSeek-V3-Base，采用优化训练策略</li>
                <li>技术特点：结合监督微调(SFT)和强化学习(RL)的创新训练方法</li>
                <li>主要优势：卓越的推理能力、自我验证和可解释性</li>
                <li>应用场景：合规检查、复杂信息提取、决策推理分析</li>
              </ul>
            </div>
          </div>
        </section>
        
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">技术特点</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">私有化部署</h3>
              <p className="text-gray-600">
                系统支持完全私有化部署，所有数据和处理均在客户内网环境中进行，确保敏感审计数据不会外泄。
                同时支持多种部署方式，包括专有服务器、容器化部署等，满足不同规模机构的需求。
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">高并发处理</h3>
              <p className="text-gray-600">
                采用异步处理和任务队列技术，系统能够高效处理大量并发的文档分析和信息提取请求。
                即使在大规模审计项目中，也能保持稳定的性能和响应速度。
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">可解释性设计</h3>
              <p className="text-gray-600">
                基于DeepSeek-R1模型的自我验证和链式思维能力，系统所有分析结果和决策建议都附带详细的推理过程和依据，
                确保审计人员能够理解并验证AI的判断。DeepSeek-R1在强化学习过程中自然涌现的反思和长推理链能力，
                使系统能够清晰解释决策路径，大大提高在实际审计工作中的可信度和实用性。
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">适应性学习</h3>
              <p className="text-gray-600">
                通过收集用户反馈和审计案例，系统能够持续优化模型表现和规则库，使其更加适应特定行业和机构的审计需求。
                这种适应性学习机制确保系统能够随着使用时间的增长而变得更加智能和高效。
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">性能指标</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">功能</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">准确率</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">处理速度</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">会议纪要信息提取</td>
                  <td className="py-4 px-6 text-sm text-gray-500">95%</td>
                  <td className="py-4 px-6 text-sm text-gray-500">8-12秒/份</td>
                  <td className="py-4 px-6 text-sm text-gray-500">对标准格式文档效果最佳</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">合同关键信息提取</td>
                  <td className="py-4 px-6 text-sm text-gray-500">89%</td>
                  <td className="py-4 px-6 text-sm text-gray-500">15-20秒/份</td>
                  <td className="py-4 px-6 text-sm text-gray-500">支持多种合同类型</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">合规性检查</td>
                  <td className="py-4 px-6 text-sm text-gray-500">95%</td>
                  <td className="py-4 px-6 text-sm text-gray-500">5-8秒/项</td>
                  <td className="py-4 px-6 text-sm text-gray-500">基于自定义规则库</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">智能问答</td>
                  <td className="py-4 px-6 text-sm text-gray-500">90%</td>
                  <td className="py-4 px-6 text-sm text-gray-500">1-2秒/问</td>
                  <td className="py-4 px-6 text-sm text-gray-500">复杂问题可能需要更长时间</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-12 text-center">
          <Link href="/projects">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-lg px-8 py-4 inline-flex items-center justify-center">
              立即体验智审大师
              <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
