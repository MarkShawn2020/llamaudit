/**
 * 智能问答助手演示页面
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  KnowledgeAssistant,
  SimpleKnowledgeAssistant,
  DebugKnowledgeAssistant,
  KnowledgeAssistantProvider,
  AssistantTrigger,
  AssistantStatusIndicator,
  useKnowledgeAssistantContext
} from './index';

/**
 * 基础演示
 */
export function BasicDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">智能问答助手演示</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>功能特性</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  基于知识库的智能问答
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  实时对话界面
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  知识来源展示
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  响应式设计
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  可自定义配置
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>技术栈</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Badge>React</Badge>
                  前端框架
                </li>
                <li className="flex items-center gap-2">
                  <Badge>TypeScript</Badge>
                  类型安全
                </li>
                <li className="flex items-center gap-2">
                  <Badge>Dify API</Badge>
                  知识库检索
                </li>
                <li className="flex items-center gap-2">
                  <Badge>OpenRouter</Badge>
                  AI模型调用
                </li>
                <li className="flex items-center gap-2">
                  <Badge>Tailwind CSS</Badge>
                  样式框架
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>使用示例</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              点击右下角的智能助手按钮开始对话，或者点击下面的快速开始按钮。
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">常见问题：</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    "这个系统有什么功能？",
                    "如何进行文档审查？",
                    "支持哪些文件格式？",
                    "怎样创建新的数据集？",
                  ].map((question, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => {
                        // 这里可以直接触发助手并发送问题
                        console.log('Question:', question);
                      }}
                    >
                      {question}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 简单的智能助手集成 */}
      <SimpleKnowledgeAssistant />
    </div>
  );
}

/**
 * 高级演示（带调试信息）
 */
export function AdvancedDemo() {
  const config = {
    datasetId: process.env.NEXT_PUBLIC_DIFY_DATASET_ID || 'demo-dataset',
    difyApiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY || 'demo-key',
    difyBaseUrl: process.env.NEXT_PUBLIC_DIFY_BASE_URL || 'https://api.dify.ai',
    openRouterApiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || 'demo-key',
    aiModel: 'claude-3-haiku',
    maxContextLength: 4000,
    retrievalTopK: 5,
    scoreThreshold: 0.3,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            智能问答助手
          </h1>
          <p className="text-xl text-muted-foreground">
            基于知识库的智能对话系统
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>实时演示</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                这是一个完整的智能问答系统演示。系统会根据您的问题检索相关知识，
                然后结合AI生成准确的回答。
              </p>
              
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium mb-2">系统配置：</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>数据集ID: {config.datasetId.slice(0, 8)}...</div>
                    <div>AI模型: {config.aiModel}</div>
                    <div>检索数量: {config.retrievalTopK}</div>
                    <div>相关性阈值: {config.scoreThreshold}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>系统状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">知识库连接</span>
                  <Badge variant="outline" className="text-green-600">正常</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI模型状态</span>
                  <Badge variant="outline" className="text-green-600">在线</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">响应时间</span>
                  <Badge variant="outline">&lt; 2s</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 带调试信息的智能助手 */}
      <DebugKnowledgeAssistant 
        config={config}
        showDebugInfo={true}
      />
    </div>
  );
}

/**
 * 上下文演示（展示如何在应用中集成）
 */
export function ContextDemo() {
  return (
    <KnowledgeAssistantProvider>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">上下文集成演示</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <TriggerCard 
              title="快速提问"
              description="点击快速向助手提问"
              message="这个系统有什么功能？"
            />
            
            <TriggerCard 
              title="文档帮助"
              description="了解如何使用文档功能"
              message="如何上传和管理文档？"
            />
            
            <TriggerCard 
              title="数据集管理"
              description="学习数据集相关操作"
              message="怎样创建和配置数据集？"
            />
            
            <TriggerCard 
              title="问题反馈"
              description="遇到问题需要帮助"
              message="我遇到了问题，需要技术支持。"
            />
          </div>

          <AssistantStatusIndicator />
        </div>
      </div>
    </KnowledgeAssistantProvider>
  );
}

/**
 * 触发卡片组件
 */
function TriggerCard({ 
  title, 
  description, 
  message 
}: { 
  title: string; 
  description: string; 
  message: string; 
}) {
  return (
    <AssistantTrigger message={message}>
      <Card className="transition-all hover:shadow-lg hover:scale-105 cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{description}</p>
          <div className="mt-4 text-sm text-blue-600">
            点击向助手提问 →
          </div>
        </CardContent>
      </Card>
    </AssistantTrigger>
  );
}

/**
 * 完整功能演示
 */
export function FullFeaturedDemo() {
  const { assistant } = useKnowledgeAssistantContext();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">完整功能演示</h2>
        <p className="text-muted-foreground">
          展示智能助手的所有功能特性
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 统计信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">对话统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>总消息数</span>
                <Badge>{assistant.messages.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>用户消息</span>
                <Badge>{assistant.messages.filter(m => m.type === 'user').length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>助手回复</span>
                <Badge>{assistant.messages.filter(m => m.type === 'assistant').length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 系统状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">系统状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>助手状态</span>
                <Badge variant={assistant.isOpen ? 'default' : 'outline'}>
                  {assistant.isOpen ? '打开' : '关闭'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>处理状态</span>
                <Badge variant={assistant.isLoading ? 'default' : 'outline'}>
                  {assistant.isLoading ? '处理中' : '空闲'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>错误状态</span>
                <Badge variant={assistant.error ? 'destructive' : 'outline'}>
                  {assistant.error ? '有错误' : '正常'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">操作面板</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                size="sm" 
                className="w-full"
                onClick={assistant.openAssistant}
              >
                打开助手
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={assistant.clearMessages}
                disabled={assistant.messages.length === 0}
              >
                清空对话
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const exported = assistant.exportConversation?.('txt');
                  if (exported) {
                    console.log('Exported conversation:', exported);
                  }
                }}
                disabled={assistant.messages.length === 0}
              >
                导出对话
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default BasicDemo;