/**
 * DocumentSheet 快速调试工具
 * 用于验证集成是否成功
 */

'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Bug, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// 导入DocumentSheet相关组件进行测试
import { useDocumentSheet, DocumentSheetTrigger } from '@/components/document-sheet';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

/**
 * 快速诊断组件
 */
export function QuickDebugTool() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // 运行快速检查
  const runQuickCheck = () => {
    setIsRunning(true);
    const checkResults: CheckResult[] = [];

    try {
      // 检查1: Provider是否可用
      try {
        const context = useDocumentSheet();
        checkResults.push({
          name: 'DocumentSheetProvider',
          status: 'pass',
          message: 'Provider 正常工作',
          details: `Context状态: isOpen=${context.isOpen}, datasetId=${context.datasetId}`,
        });
      } catch (error) {
        checkResults.push({
          name: 'DocumentSheetProvider',
          status: 'fail',
          message: 'Provider 未配置或不可用',
          details: (error as Error).message,
        });
      }

      // 检查2: DOM元素是否存在
      const sheetElement = document.querySelector('[data-radix-dialog-root]');
      checkResults.push({
        name: 'Sheet DOM元素',
        status: sheetElement ? 'pass' : 'fail',
        message: sheetElement ? 'Sheet组件已渲染' : 'Sheet组件未找到',
        details: sheetElement ? 'Radix Dialog根元素存在' : '请确保DocumentSheet组件已渲染',
      });

      // 检查3: CSS样式
      const hasRadixStyles = document.querySelector('[data-radix-dialog-overlay]') !== null ||
                           getComputedStyle(document.documentElement).getPropertyValue('--radix-dialog-overlay') !== '';
      checkResults.push({
        name: 'Radix UI样式',
        status: hasRadixStyles ? 'pass' : 'warning',
        message: hasRadixStyles ? 'Radix UI样式已加载' : 'Radix UI样式可能缺失',
        details: 'Radix Dialog样式检查',
      });

      // 检查4: React Query
      const hasReactQuery = typeof window !== 'undefined' && 
                           (window as any).__REACT_QUERY_DEVTOOLS__ !== undefined;
      checkResults.push({
        name: 'React Query',
        status: hasReactQuery ? 'pass' : 'warning',
        message: hasReactQuery ? 'React Query DevTools已启用' : 'React Query状态未知',
        details: 'React Query用于数据管理',
      });

      setResults(checkResults);
    } catch (error) {
      console.error('Quick check failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          DocumentSheet 快速诊断
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 运行检查按钮 */}
        <Button 
          onClick={runQuickCheck} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? '检查中...' : '运行快速诊断'}
        </Button>

        {/* 检查结果 */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">诊断结果:</h3>
            {results.map((result, index) => {
              const statusIcon = {
                pass: <CheckCircle2 className="h-4 w-4 text-green-600" />,
                fail: <XCircle className="h-4 w-4 text-red-600" />,
                warning: <AlertTriangle className="h-4 w-4 text-orange-600" />,
              };

              const statusVariant = {
                pass: 'success' as const,
                fail: 'destructive' as const,
                warning: 'warning' as const,
              };

              return (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {statusIcon[result.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{result.name}</span>
                      <Badge variant={statusVariant[result.status]}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground mt-1">{result.details}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 测试按钮 */}
        <div className="space-y-3">
          <h3 className="font-semibold">功能测试:</h3>
          <TestTriggerButton />
          <ManualTestButton />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 测试触发器按钮
 */
function TestTriggerButton() {
  return (
    <DocumentSheetTrigger
      datasetId="test-dataset"
      documentId="test-document"
      documentName="测试文档"
    >
      <Button variant="outline" className="w-full">
        <Play className="h-4 w-4 mr-2" />
        测试DocumentSheetTrigger
      </Button>
    </DocumentSheetTrigger>
  );
}

/**
 * 手动测试按钮
 */
function ManualTestButton() {
  const handleManualTest = () => {
    try {
      const { openDocumentSheet } = useDocumentSheet();
      openDocumentSheet('manual-test-dataset', 'manual-test-doc', '手动测试文档');
    } catch (error) {
      alert('手动测试失败: ' + (error as Error).message);
    }
  };

  return (
    <Button onClick={handleManualTest} variant="outline" className="w-full">
      <Bug className="h-4 w-4 mr-2" />
      手动测试Hook调用
    </Button>
  );
}

/**
 * 完整的调试页面组件
 */
export default function DebugPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">DocumentSheet 调试工具</h1>
        <p className="text-muted-foreground">
          快速诊断和测试DocumentSheet组件的集成状态
        </p>
      </div>

      {/* 快速诊断工具 */}
      <QuickDebugTool />

      {/* 集成检查清单 */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>集成检查清单</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>必需步骤（缺一不可）:</strong>
                <ol className="mt-2 space-y-1 list-decimal list-inside text-sm">
                  <li>在 <code>app/layout.tsx</code> 中添加 <code>DocumentSheetProvider</code></li>
                  <li>在文档列表中使用 <code>DocumentSheetTrigger</code> 包装点击元素</li>
                  <li>在页面中渲染 <code>DocumentSheet</code> 组件</li>
                  <li>确保 <code>datasetId</code> 和 <code>documentId</code> 不为空</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>验证方法:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                  <li>运行上方的快速诊断工具</li>
                  <li>点击"测试DocumentSheetTrigger"按钮</li>
                  <li>检查浏览器控制台是否有错误</li>
                  <li>确认Sheet从右侧滑出</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* 常见错误和解决方案 */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>常见错误快速修复</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-red-600 mb-2">
                错误: "useDocumentSheet must be used within a DocumentSheetProvider"
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                解决方案: 确保在 app/layout.tsx 中正确添加了 DocumentSheetProvider
              </p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`<DocumentSheetProvider>
  <div className="relative flex min-h-screen flex-col">
    {children}
  </div>
</DocumentSheetProvider>`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold text-orange-600 mb-2">
                问题: 点击文档没有反应
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                解决方案: 检查文档卡片是否正确使用了 DocumentSheetTrigger
              </p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`<DocumentSheetTrigger
  datasetId={project.datasetId}
  documentId={doc.id}
  documentName={doc.name}
>
  <div className="cursor-pointer">
    {/* 文档卡片内容 */}
  </div>
</DocumentSheetTrigger>`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold text-blue-600 mb-2">
                问题: Sheet打开但内容为空
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                解决方案: 确保DocumentSheet组件已渲染且API配置正确
              </p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`// 在组件底部添加
<DocumentSheet />

// 检查API配置
console.log('Dify Config:', useDifyConfig());`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}