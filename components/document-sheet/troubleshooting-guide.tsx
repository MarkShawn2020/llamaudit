/**
 * DocumentSheet 故障排除指南
 * 系统性的调试工具和解决方案
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Bug, Settings, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// 诊断结果类型
type DiagnosticResult = {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning' | 'info';
    message: string;
    solution?: string;
    code?: string;
  }>;
};

/**
 * DocumentSheet 诊断工具
 */
export function DocumentSheetDiagnostics() {
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // 运行诊断
  const runDiagnostics = async () => {
    setIsRunning(true);
    
    try {
      const results: DiagnosticResult[] = [];

      // 1. Provider 检查
      const providerChecks = await checkProvider();
      results.push({
        category: 'Provider 配置',
        checks: providerChecks,
      });

      // 2. 组件渲染检查
      const componentChecks = await checkComponents();
      results.push({
        category: '组件渲染',
        checks: componentChecks,
      });

      // 3. 状态管理检查
      const stateChecks = await checkStateManagement();
      results.push({
        category: '状态管理',
        checks: stateChecks,
      });

      // 4. 事件绑定检查
      const eventChecks = await checkEventBinding();
      results.push({
        category: '事件绑定',
        checks: eventChecks,
      });

      // 5. 样式和显示检查
      const styleChecks = await checkStyles();
      results.push({
        category: '样式和显示',
        checks: styleChecks,
      });

      // 6. API和数据检查
      const apiChecks = await checkApiAndData();
      results.push({
        category: 'API和数据',
        checks: apiChecks,
      });

      setDiagnosticResults(results);
    } catch (error) {
      console.error('Diagnostic failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Provider 检查
  const checkProvider = async () => {
    const checks = [];

    // 检查 DocumentSheetProvider 是否存在
    try {
      const providerExists = document.querySelector('[data-document-sheet-provider]') !== null;
      checks.push({
        name: 'DocumentSheetProvider 存在性',
        status: providerExists ? 'pass' : 'fail' as const,
        message: providerExists 
          ? 'DocumentSheetProvider 已正确配置' 
          : 'DocumentSheetProvider 未找到',
        solution: !providerExists ? `
确保在应用根组件中添加了 DocumentSheetProvider：

\`\`\`tsx
import { DocumentSheetProvider } from '@/components/document-sheet';

export default function RootLayout({ children }) {
  return (
    <DocumentSheetProvider>
      {children}
    </DocumentSheetProvider>
  );
}
\`\`\`
        ` : undefined,
      });
    } catch (error) {
      checks.push({
        name: 'DocumentSheetProvider 检查',
        status: 'fail',
        message: '无法检查 Provider 状态',
        solution: '请确保 Provider 正确导入和使用',
      });
    }

    // 检查 Context 可用性
    try {
      // 这里应该检查 useDocumentSheet hook 是否可用
      checks.push({
        name: 'Context 可用性',
        status: 'info',
        message: '需要在组件内部检查 useDocumentSheet hook',
        solution: `
在使用 DocumentSheetTrigger 的组件中添加调试代码：

\`\`\`tsx
import { useDocumentSheet } from '@/components/document-sheet';

function DebugComponent() {
  try {
    const context = useDocumentSheet();
    console.log('DocumentSheet Context:', context);
    return null;
  } catch (error) {
    console.error('Context not available:', error);
    return null;
  }
}
\`\`\`
        `,
      });
    } catch (error) {
      checks.push({
        name: 'Context 可用性',
        status: 'fail',
        message: 'Context 不可用',
        solution: '确保组件在 DocumentSheetProvider 内部使用',
      });
    }

    return checks;
  };

  // 组件渲染检查
  const checkComponents = async () => {
    const checks = [];

    // 检查 DocumentSheet 组件是否渲染
    const sheetExists = document.querySelector('[data-document-sheet]') !== null;
    checks.push({
      name: 'DocumentSheet 组件渲染',
      status: sheetExists ? 'pass' : 'fail' as const,
      message: sheetExists 
        ? 'DocumentSheet 组件已渲染' 
        : 'DocumentSheet 组件未找到',
      solution: !sheetExists ? `
确保在应用中渲染了 DocumentSheet 组件：

\`\`\`tsx
import { DocumentSheet } from '@/components/document-sheet';

export default function App() {
  return (
    <div>
      {/* 你的应用内容 */}
      <main>{children}</main>
      
      {/* 全局 DocumentSheet 组件 */}
      <DocumentSheet />
    </div>
  );
}
\`\`\`
      ` : undefined,
    });

    // 检查 shadcn/ui Sheet 组件
    try {
      const sheetComponentExists = typeof window !== 'undefined' && 
        document.querySelector('.sheet-content, [data-radix-popper-content-wrapper]') !== null;
      
      checks.push({
        name: 'Radix Sheet 组件',
        status: 'info',
        message: 'Radix Sheet 组件状态需要在运行时检查',
        solution: `
确保已安装 @radix-ui/react-dialog：

\`\`\`bash
npm install @radix-ui/react-dialog
\`\`\`

检查 shadcn/ui Sheet 组件是否正确导入：

\`\`\`tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
\`\`\`
        `,
      });
    } catch (error) {
      checks.push({
        name: 'Radix Sheet 组件',
        status: 'fail',
        message: '无法检查 Radix Sheet 组件',
        solution: '检查 @radix-ui/react-dialog 是否正确安装',
      });
    }

    return checks;
  };

  // 状态管理检查
  const checkStateManagement = async () => {
    const checks = [];

    // 检查 React Query
    try {
      const queryClientExists = window && (window as any).__REACT_QUERY_DEVTOOLS__;
      checks.push({
        name: 'React Query 集成',
        status: queryClientExists ? 'pass' : 'info' as const,
        message: queryClientExists 
          ? 'React Query DevTools 已启用' 
          : 'React Query 状态需要检查',
        solution: `
确保 React Query 正确配置：

\`\`\`tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DocumentSheetProvider>
        {/* 应用内容 */}
      </DocumentSheetProvider>
    </QueryClientProvider>
  );
}
\`\`\`
        `,
      });
    } catch (error) {
      checks.push({
        name: 'React Query 集成',
        status: 'warning',
        message: '无法检查 React Query 状态',
        solution: '确保 @tanstack/react-query 正确安装和配置',
      });
    }

    return checks;
  };

  // 事件绑定检查
  const checkEventBinding = async () => {
    const checks = [];

    // 检查点击事件
    checks.push({
      name: '点击事件绑定',
      status: 'info',
      message: '需要检查 DocumentSheetTrigger 的点击事件',
      solution: `
添加调试代码检查点击事件：

\`\`\`tsx
<DocumentSheetTrigger
  datasetId="test-dataset"
  documentId="test-document"
  onHover={false}
>
  <div 
    onClick={() => console.log('Trigger clicked!')}
    style={{ border: '2px solid red', padding: '10px' }}
  >
    测试点击区域
  </div>
</DocumentSheetTrigger>
\`\`\`
      `,
    });

    // 检查事件传播
    checks.push({
      name: '事件传播检查',
      status: 'info',
      message: '检查是否有其他元素阻止了点击事件',
      solution: `
添加事件调试代码：

\`\`\`tsx
function DebugWrapper({ children }) {
  return (
    <div 
      onClick={(e) => {
        console.log('Click captured at wrapper level');
        // 不要调用 e.stopPropagation()
      }}
      onClickCapture={(e) => {
        console.log('Click captured (capture phase)');
      }}
    >
      {children}
    </div>
  );
}
\`\`\`
      `,
    });

    return checks;
  };

  // 样式和显示检查
  const checkStyles = async () => {
    const checks = [];

    // 检查 CSS 样式
    checks.push({
      name: 'CSS 样式检查',
      status: 'info',
      message: '检查是否有样式冲突影响 Sheet 显示',
      solution: `
检查以下可能的样式问题：

1. Z-index 冲突：
\`\`\`css
/* 确保 Sheet 有足够高的 z-index */
[data-radix-dialog-overlay] {
  z-index: 50;
}
[data-radix-dialog-content] {
  z-index: 51;
}
\`\`\`

2. 显示属性：
\`\`\`css
/* 确保没有被隐藏 */
.sheet-content {
  display: block !important;
  visibility: visible !important;
}
\`\`\`

3. 位置属性：
\`\`\`css
/* 确保正确定位 */
[data-radix-dialog-content] {
  position: fixed;
  top: 0;
  right: 0;
}
\`\`\`
      `,
    });

    // 检查 Tailwind CSS
    checks.push({
      name: 'Tailwind CSS 配置',
      status: 'info',
      message: '检查 Tailwind CSS 是否正确配置',
      solution: `
确保 Tailwind CSS 正确配置：

1. tailwind.config.js 包含所有必要路径：
\`\`\`js
module.exports = {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    // 其他路径
  ],
}
\`\`\`

2. 全局样式文件包含 Tailwind：
\`\`\`css
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`
      `,
    });

    return checks;
  };

  // API和数据检查
  const checkApiAndData = async () => {
    const checks = [];

    // 检查数据传递
    checks.push({
      name: '数据参数检查',
      status: 'info',
      message: '检查传递给 DocumentSheetTrigger 的参数',
      solution: `
添加参数验证：

\`\`\`tsx
<DocumentSheetTrigger
  datasetId={datasetId || 'MISSING_DATASET_ID'}
  documentId={documentId || 'MISSING_DOCUMENT_ID'}
  documentName={documentName || 'Unknown Document'}
>
  <div onClick={() => {
    console.log('Parameters:', {
      datasetId,
      documentId,
      documentName
    });
  }}>
    Click to debug
  </div>
</DocumentSheetTrigger>
\`\`\`
      `,
    });

    // 检查 API 配置
    checks.push({
      name: 'API 配置检查',
      status: 'info',
      message: '检查 Dify API 配置是否正确',
      solution: `
检查 DifyConfig Context：

\`\`\`tsx
import { useDifyConfig } from '@/contexts/dify-config-context';

function DebugApiConfig() {
  const { config } = useDifyConfig();
  console.log('Dify Config:', config);
  return null;
}
\`\`\`

确保 API 配置正确：
- API Base URL 是否正确
- API Key 是否有效
- 网络连接是否正常
      `,
    });

    return checks;
  };

  // 渲染诊断结果
  const renderDiagnosticResult = (result: DiagnosticResult) => (
    <Card key={result.category} className="mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {result.category}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.checks.map((check, index) => {
          const statusIcon = {
            pass: <CheckCircle2 className="h-4 w-4 text-green-600" />,
            fail: <XCircle className="h-4 w-4 text-red-600" />,
            warning: <AlertTriangle className="h-4 w-4 text-orange-600" />,
            info: <Info className="h-4 w-4 text-blue-600" />,
          };

          const statusVariant = {
            pass: 'success' as const,
            fail: 'destructive' as const,
            warning: 'warning' as const,
            info: 'secondary' as const,
          };

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon[check.status]}
                  <span className="font-medium text-sm">{check.name}</span>
                </div>
                <Badge variant={statusVariant[check.status]}>
                  {check.status}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground ml-6">
                {check.message}
              </p>
              
              {check.solution && (
                <Alert className="ml-6">
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
                      {check.solution}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Bug className="h-6 w-6" />
          DocumentSheet 故障诊断
        </h1>
        <p className="text-muted-foreground">
          系统性排查 DocumentSheet 不显示的问题
        </p>
        
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full max-w-xs"
        >
          {isRunning ? (
            <>
              <Zap className="h-4 w-4 mr-2 animate-spin" />
              诊断中...
            </>
          ) : (
            <>
              <Bug className="h-4 w-4 mr-2" />
              开始诊断
            </>
          )}
        </Button>
      </div>

      <Separator />

      {/* 诊断结果 */}
      {diagnosticResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">诊断结果</h2>
          {diagnosticResults.map(renderDiagnosticResult)}
        </div>
      )}

      {/* 常见问题和解决方案 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">常见问题快速修复</h2>
        
        <Tabs defaultValue="provider" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="component">组件</TabsTrigger>
            <TabsTrigger value="events">事件</TabsTrigger>
            <TabsTrigger value="styles">样式</TabsTrigger>
          </TabsList>

          <TabsContent value="provider" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Provider 配置问题</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>最常见问题：忘记添加 DocumentSheetProvider</strong>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
{`// ✅ 正确配置
import { DocumentSheetProvider, DocumentSheet } from '@/components/document-sheet';

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DocumentSheetProvider>
        {children}
        <DocumentSheet /> {/* 重要：全局渲染 */}
      </DocumentSheetProvider>
    </QueryClientProvider>
  );
}`}
                    </pre>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="component" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>组件渲染问题</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>DocumentSheet 组件未渲染</strong>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
{`// ❌ 错误：在局部组件中渲染
function DocumentList() {
  return (
    <div>
      {documents.map(...)}
      <DocumentSheet /> {/* 错误位置 */}
    </div>
  );
}

// ✅ 正确：在应用根层级渲染
function App() {
  return (
    <div>
      <DocumentList />
      <DocumentSheet /> {/* 正确位置 */}
    </div>
  );
}`}
                    </pre>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>事件绑定问题</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>点击事件被阻止或参数错误</strong>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
{`// 🔍 调试点击事件
<DocumentSheetTrigger
  datasetId={datasetId} // 确保不为空
  documentId={documentId} // 确保不为空
  documentName={doc.name}
>
  <div 
    onClick={() => {
      console.log('Clicked!', { datasetId, documentId });
    }}
    style={{ 
      border: '1px solid red', // 调试边框
      padding: '8px',
      cursor: 'pointer'
    }}
  >
    {doc.name}
  </div>
</DocumentSheetTrigger>`}
                    </pre>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="styles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>样式显示问题</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>CSS 冲突或 Z-index 问题</strong>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
{`/* 临时调试样式 */
[data-radix-dialog-overlay] {
  background-color: rgba(255, 0, 0, 0.5) !important; /* 红色背景调试 */
  z-index: 9999 !important;
}

[data-radix-dialog-content] {
  border: 3px solid red !important; /* 红色边框调试 */
  z-index: 10000 !important;
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
}`}
                    </pre>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default DocumentSheetDiagnostics;