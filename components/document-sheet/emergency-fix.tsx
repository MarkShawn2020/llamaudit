/**
 * 紧急修复工具 - DocumentSheet集成问题
 * 当常规修复不工作时的备用解决方案
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Bug, 
  Zap, 
  FileText,
  Settings,
  Play
} from 'lucide-react';

// 强制导入DocumentSheet相关组件
let DocumentSheetComponents: any = null;
try {
  DocumentSheetComponents = require('@/components/document-sheet');
} catch (error) {
  console.error('Failed to import DocumentSheet components:', error);
}

interface DiagnosticStep {
  name: string;
  check: () => boolean | Promise<boolean>;
  fix: () => void | Promise<void>;
  status: 'pending' | 'checking' | 'pass' | 'fail' | 'fixed';
  message: string;
  critical: boolean;
}

/**
 * 紧急修复组件
 */
export function EmergencyDocumentSheetFix() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  // 诊断步骤定义
  const diagnosticSteps: DiagnosticStep[] = [
    {
      name: 'DocumentSheet组件导入',
      critical: true,
      status: 'pending',
      message: '检查DocumentSheet组件是否可以导入',
      check: () => {
        return DocumentSheetComponents !== null && 
               typeof DocumentSheetComponents.DocumentSheet === 'function';
      },
      fix: async () => {
        console.log('尝试重新导入DocumentSheet组件...');
        try {
          // 强制重新导入
          delete require.cache[require.resolve('@/components/document-sheet')];
          DocumentSheetComponents = require('@/components/document-sheet');
        } catch (error) {
          console.error('重新导入失败:', error);
          throw new Error('DocumentSheet组件导入失败，请检查组件是否存在');
        }
      }
    },
    
    {
      name: 'Provider Context可用性',
      critical: true,
      status: 'pending',
      message: '检查DocumentSheetProvider是否正确配置',
      check: () => {
        try {
          // 尝试在全局创建一个测试Context
          if (DocumentSheetComponents?.useDocumentSheet) {
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      },
      fix: async () => {
        console.log('尝试修复Provider配置...');
        // 创建临时Provider修复提示
        const fixCode = `
// 在 app/layout.tsx 中添加:
import { DocumentSheetProvider } from '@/components/document-sheet';

// 然后在QueryProvider内部包装:
<DocumentSheetProvider>
  <div className="flex min-h-screen flex-col">
    {children}
  </div>
</DocumentSheetProvider>
        `;
        
        console.log('Provider修复代码:', fixCode);
        
        // 尝试动态创建Provider (仅用于测试)
        if (typeof window !== 'undefined') {
          (window as any).__DOCUMENT_SHEET_PROVIDER_FIX__ = fixCode;
        }
      }
    },

    {
      name: 'DOM元素检查',
      critical: false,
      status: 'pending', 
      message: '检查页面中是否存在文档列表元素',
      check: () => {
        const docElements = document.querySelectorAll('.relative.group.border');
        return docElements.length > 0;
      },
      fix: async () => {
        console.log('尝试修复文档列表元素...');
        // 为现有文档元素添加点击事件
        const docElements = document.querySelectorAll('.relative.group.border');
        docElements.forEach((element, index) => {
          if (!element.hasAttribute('data-fixed')) {
            element.setAttribute('data-fixed', 'true');
            element.addEventListener('click', () => {
              console.log(`点击了文档 #${index + 1}`);
              // 触发紧急Sheet显示
              showEmergencySheet(index);
            });
            element.classList.add('cursor-pointer');
          }
        });
        console.log(`已为 ${docElements.length} 个文档元素添加点击事件`);
      }
    },

    {
      name: 'Sheet渲染检查',
      critical: false,
      status: 'pending',
      message: '检查DocumentSheet组件是否已渲染到DOM',
      check: () => {
        const sheetRoot = document.querySelector('[data-radix-dialog-root]');
        return sheetRoot !== null;
      },
      fix: async () => {
        console.log('尝试渲染紧急Sheet组件...');
        
        // 创建紧急Sheet容器
        if (!document.getElementById('emergency-sheet-container')) {
          const container = document.createElement('div');
          container.id = 'emergency-sheet-container';
          document.body.appendChild(container);
          
          // 这里应该渲染DocumentSheet组件
          // 由于是紧急修复，我们创建一个简单的模拟Sheet
          createEmergencySheet(container);
        }
      }
    }
  ];

  // 创建紧急Sheet
  const createEmergencySheet = (container: HTMLElement) => {
    const emergencyHTML = `
      <div id="emergency-document-sheet" class="fixed inset-0 z-50 hidden">
        <div class="fixed inset-0 bg-black/50" onclick="closeEmergencySheet()"></div>
        <div class="fixed right-0 top-0 h-full w-[600px] bg-white shadow-lg transform translate-x-full transition-transform duration-300">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">文档详情 (紧急模式)</h2>
              <button onclick="closeEmergencySheet()" class="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div id="emergency-sheet-content">
              <p class="text-gray-600">正在加载文档信息...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = emergencyHTML;
    
    // 添加全局函数
    (window as any).closeEmergencySheet = () => {
      const sheet = document.getElementById('emergency-document-sheet');
      if (sheet) {
        sheet.classList.add('hidden');
        const content = sheet.querySelector('.fixed.right-0') as HTMLElement;
        if (content) content.style.transform = 'translateX(100%)';
      }
    };
  };

  // 显示紧急Sheet
  const showEmergencySheet = (docIndex: number) => {
    const sheet = document.getElementById('emergency-document-sheet');
    if (sheet) {
      sheet.classList.remove('hidden');
      const content = sheet.querySelector('.fixed.right-0') as HTMLElement;
      if (content) {
        content.style.transform = 'translateX(0)';
      }
      
      // 更新内容
      const contentEl = document.getElementById('emergency-sheet-content');
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="space-y-4">
            <div class="border-b pb-4">
              <h3 class="font-medium">文档 #${docIndex + 1}</h3>
              <p class="text-sm text-gray-600">紧急模式下的文档详情</p>
            </div>
            <div class="space-y-2">
              <div class="text-sm">
                <strong>状态:</strong> <span class="text-green-600">紧急修复已激活</span>
              </div>
              <div class="text-sm">
                <strong>文档索引:</strong> ${docIndex + 1}
              </div>
              <div class="text-sm">
                <strong>修复模式:</strong> DOM直接操作
              </div>
            </div>
            <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p class="text-sm text-yellow-800">
                这是紧急修复模式。要恢复正常功能，请按照修复指南正确配置DocumentSheetProvider和DocumentSheetTrigger。
              </p>
            </div>
          </div>
        `;
      }
    }
  };

  // 运行诊断
  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics(diagnosticSteps);
    
    for (let i = 0; i < diagnosticSteps.length; i++) {
      setCurrentStep(i);
      const step = diagnosticSteps[i];
      
      // 更新状态为检查中
      setDiagnostics(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'checking' } : s
      ));
      
      try {
        const result = await step.check();
        
        if (result) {
          // 检查通过
          setDiagnostics(prev => prev.map((s, idx) => 
            idx === i ? { ...s, status: 'pass', message: s.message + ' ✅' } : s
          ));
        } else {
          // 检查失败，尝试修复
          setDiagnostics(prev => prev.map((s, idx) => 
            idx === i ? { ...s, status: 'fail', message: s.message + ' ❌ 尝试修复...' } : s
          ));
          
          await step.fix();
          
          // 重新检查
          const fixResult = await step.check();
          
          setDiagnostics(prev => prev.map((s, idx) => 
            idx === i ? { 
              ...s, 
              status: fixResult ? 'fixed' : 'fail',
              message: fixResult ? s.message + ' ✅ 已修复' : s.message + ' ❌ 修复失败'
            } : s
          ));
        }
        
        // 短暂延迟以便用户看到进度
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        setDiagnostics(prev => prev.map((s, idx) => 
          idx === i ? { 
            ...s, 
            status: 'fail', 
            message: s.message + ' ❌ ' + (error as Error).message 
          } : s
        ));
      }
    }
    
    setCurrentStep(-1);
    setIsRunning(false);
  };

  // 强制激活紧急模式
  const activateEmergencyMode = () => {
    console.log('🚨 激活紧急模式');
    
    // 创建紧急Sheet容器
    if (!document.getElementById('emergency-sheet-container')) {
      const container = document.createElement('div');
      container.id = 'emergency-sheet-container';
      document.body.appendChild(container);
      createEmergencySheet(container);
    }
    
    // 为所有文档元素添加点击事件
    const docElements = document.querySelectorAll('.relative.group.border');
    docElements.forEach((element, index) => {
      if (!element.hasAttribute('data-emergency-fixed')) {
        element.setAttribute('data-emergency-fixed', 'true');
        element.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`紧急模式：点击了文档 #${index + 1}`);
          showEmergencySheet(index);
        });
        element.classList.add('cursor-pointer');
        
        // 添加视觉提示
        const indicator = document.createElement('div');
        indicator.className = 'absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full';
        indicator.title = '紧急修复模式';
        element.appendChild(indicator);
      }
    });
    
    alert(`🚨 紧急模式已激活！\n\n已为 ${docElements.length} 个文档添加了点击事件。\n点击任意文档查看详情。\n\n注意：这是临时解决方案，请尽快应用正式修复。`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'fixed': return <Zap className="h-4 w-4 text-blue-600" />;
      case 'checking': return <Settings className="h-4 w-4 text-yellow-600 animate-spin" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pass': return 'success' as const;
      case 'fail': return 'destructive' as const;
      case 'fixed': return 'default' as const;
      case 'checking': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 头部 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Bug className="h-5 w-5" />
            DocumentSheet 紧急修复工具
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>紧急情况使用</strong> - 当常规修复方案不工作时的备用解决方案。
              建议优先尝试常规修复，此工具仅作为最后手段。
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4">
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunning}
              variant="outline"
            >
              {isRunning ? '诊断中...' : '运行系统诊断'}
            </Button>
            
            <Button 
              onClick={activateEmergencyMode}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              🚨 激活紧急模式
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 诊断结果 */}
      {diagnostics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>诊断结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {diagnostics.map((step, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    currentStep === index ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  {getStatusIcon(step.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{step.name}</span>
                      <div className="flex items-center gap-2">
                        {step.critical && (
                          <Badge variant="destructive" className="text-xs">关键</Badge>
                        )}
                        <Badge variant={getStatusVariant(step.status)}>
                          {step.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>紧急模式说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">🔍 系统诊断</h4>
              <p className="text-sm text-muted-foreground">
                检查DocumentSheet组件的导入、Provider配置、DOM元素等关键问题，并尝试自动修复。
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-2">🚨 紧急模式</h4>
              <p className="text-sm text-muted-foreground">
                当常规修复无效时，直接操作DOM为文档元素添加点击事件，创建简化的Sheet展示。
                这是临时解决方案，不具备完整功能。
              </p>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>重要提醒：</strong>紧急模式仅用于演示和测试。
                要获得完整功能，请按照修复指南正确配置DocumentSheetProvider和DocumentSheetTrigger。
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EmergencyDocumentSheetFix;