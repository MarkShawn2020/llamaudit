/**
 * DocumentSheet 实时验证器
 * 在浏览器控制台运行，实时检查集成状态
 * 
 * 使用方法：
 * 1. 打开开发者工具 (F12)
 * 2. 复制此文件全部内容到控制台
 * 3. 按回车执行
 */

(function DocumentSheetValidator() {
    console.clear();
    console.log('%c🔍 DocumentSheet 实时验证器', 'color: #2563eb; font-size: 18px; font-weight: bold;');
    console.log('%c=====================================', 'color: #2563eb;');
    
    const results = {
        provider: false,
        components: false,
        triggers: false,
        clickable: false,
        data: false,
        errors: []
    };
    
    // 1. Provider 检查
    console.log('\n%c1️⃣ Provider 配置检查', 'color: #0891b2; font-weight: bold;');
    
    try {
        // 检查 DocumentSheetProvider DOM 标记
        const providerElements = document.querySelectorAll('[data-document-sheet-provider]');
        const hasProviderAttribute = providerElements.length > 0;
        
        // 检查 React 组件树中的 Provider
        const hasReactProvider = typeof window !== 'undefined' && 
                                window.__REACT_DEVTOOLS_GLOBAL_HOOK__ &&
                                document.querySelector('body') &&
                                document.querySelector('body').__reactInternalInstance;
        
        results.provider = hasProviderAttribute || hasReactProvider;
        
        if (results.provider) {
            console.log('   ✅ DocumentSheetProvider:', '已配置');
        } else {
            console.log('   ❌ DocumentSheetProvider:', '未配置');
            results.errors.push('需要在 app/layout.tsx 中添加 DocumentSheetProvider');
        }
    } catch (error) {
        console.log('   ❌ Provider检查失败:', error.message);
        results.errors.push('Provider检查异常: ' + error.message);
    }
    
    // 2. Sheet 组件检查
    console.log('\n%c2️⃣ Sheet 组件检查', 'color: #0891b2; font-weight: bold;');
    
    try {
        // 检查 Radix Dialog 组件
        const radixDialog = document.querySelector('[data-radix-dialog-root]');
        const sheetContent = document.querySelector('[data-radix-dialog-content]');
        const portalContainer = document.querySelector('[data-radix-portal]');
        
        results.components = radixDialog !== null || portalContainer !== null;
        
        console.log('   📋 Radix Dialog Root:', radixDialog ? '✅ 存在' : '❌ 未找到');
        console.log('   📋 Sheet Content:', sheetContent ? '✅ 存在' : '❌ 未找到');
        console.log('   📋 Portal Container:', portalContainer ? '✅ 存在' : '❌ 未找到');
        
        if (!results.components) {
            results.errors.push('需要在组件中渲染 <DocumentSheet /> 组件');
        }
    } catch (error) {
        console.log('   ❌ 组件检查失败:', error.message);
        results.errors.push('组件检查异常: ' + error.message);
    }
    
    // 3. 文档列表和触发器检查
    console.log('\n%c3️⃣ 文档列表和触发器检查', 'color: #0891b2; font-weight: bold;');
    
    try {
        // 检查文档元素
        const docElements = document.querySelectorAll('.relative.group.border');
        const clickableElements = document.querySelectorAll('.cursor-pointer');
        const triggerElements = document.querySelectorAll('[data-document-sheet-trigger]');
        
        console.log('   📄 文档元素数量:', docElements.length);
        console.log('   👆 可点击元素数量:', clickableElements.length);
        console.log('   🎯 DocumentSheetTrigger数量:', triggerElements.length);
        
        results.triggers = triggerElements.length > 0 || clickableElements.length > 0;
        results.clickable = clickableElements.length > 0;
        
        if (docElements.length > 0 && clickableElements.length === 0) {
            results.errors.push('文档元素存在但缺少 DocumentSheetTrigger 包装');
        }
        
        // 检查文档元素的事件绑定
        let hasClickHandlers = 0;
        docElements.forEach((element, index) => {
            const hasClick = element.onclick !== null || 
                           element.addEventListener !== undefined ||
                           element.hasAttribute('data-click-handler');
            if (hasClick) hasClickHandlers++;
        });
        
        console.log('   🖱️ 有点击处理器的元素:', hasClickHandlers);
        
    } catch (error) {
        console.log('   ❌ 触发器检查失败:', error.message);
        results.errors.push('触发器检查异常: ' + error.message);
    }
    
    // 4. 数据和配置检查
    console.log('\n%c4️⃣ 数据和配置检查', 'color: #0891b2; font-weight: bold;');
    
    try {
        // 检查页面URL和项目数据
        const url = window.location.pathname;
        const isProjectPage = url.includes('/projects/');
        const hasProjectId = /\/projects\/[^\/]+/.test(url);
        
        console.log('   🌐 当前页面:', url);
        console.log('   📁 项目页面:', isProjectPage ? '✅ 是' : '❌ 否');
        console.log('   🆔 项目ID:', hasProjectId ? '✅ 有效' : '❌ 无效');
        
        // 检查 React Query 配置
        const hasReactQuery = typeof window !== 'undefined' && 
                             (window.__REACT_QUERY_DEVTOOLS__ !== undefined ||
                              document.querySelector('[data-rq-devtools]') !== null);
        
        console.log('   ⚛️ React Query:', hasReactQuery ? '✅ 已配置' : '⚠️ 状态未知');
        
        // 检查 Dify 配置
        const hasDifyConfig = typeof window !== 'undefined' && 
                             (window.__DIFY_CONFIG__ !== undefined ||
                              localStorage.getItem('dify-config') !== null);
        
        console.log('   🔧 Dify配置:', hasDifyConfig ? '✅ 已配置' : '⚠️ 状态未知');
        
        results.data = isProjectPage && hasProjectId;
        
    } catch (error) {
        console.log('   ❌ 数据检查失败:', error.message);
        results.errors.push('数据检查异常: ' + error.message);
    }
    
    // 5. 样式和CSS检查
    console.log('\n%c5️⃣ 样式和CSS检查', 'color: #0891b2; font-weight: bold;');
    
    try {
        // 检查 Tailwind CSS
        const testElement = document.createElement('div');
        testElement.className = 'hidden';
        document.body.appendChild(testElement);
        const hasTailwind = getComputedStyle(testElement).display === 'none';
        document.body.removeChild(testElement);
        
        console.log('   🎨 Tailwind CSS:', hasTailwind ? '✅ 已加载' : '❌ 未加载');
        
        // 检查 Radix UI 样式
        const hasRadixStyles = document.querySelector('style[data-radix]') !== null ||
                              document.querySelector('link[href*="radix"]') !== null;
        
        console.log('   🎭 Radix UI样式:', hasRadixStyles ? '✅ 已加载' : '⚠️ 状态未知');
        
    } catch (error) {
        console.log('   ❌ 样式检查失败:', error.message);
    }
    
    // 6. 综合诊断结果
    console.log('\n%c🎯 综合诊断结果', 'color: #dc2626; font-size: 16px; font-weight: bold;');
    console.log('%c=====================================', 'color: #dc2626;');
    
    const overallHealth = results.provider && results.components && results.triggers;
    
    if (overallHealth) {
        console.log('%c✅ 系统状态: 健康', 'color: #16a34a; font-weight: bold; font-size: 14px;');
        console.log('%c🎉 DocumentSheet 应该可以正常工作！', 'color: #16a34a;');
    } else {
        console.log('%c❌ 系统状态: 需要修复', 'color: #dc2626; font-weight: bold; font-size: 14px;');
        console.log('\n%c🔧 修复建议:', 'color: #ea580c; font-weight: bold;');
        
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    // 7. 快速修复代码
    console.log('\n%c⚡ 快速修复代码', 'color: #7c2d12; font-weight: bold;');
    console.log('%c=====================================', 'color: #7c2d12;');
    
    if (!results.provider) {
        console.log('%c📝 app/layout.tsx 修复:', 'color: #0891b2; font-weight: bold;');
        console.log(`
// 1. 添加导入
import { DocumentSheetProvider } from '@/components/document-sheet';

// 2. 在 QueryProvider 内部包装
<QueryProvider>
  <DocumentSheetProvider>
    <div className="flex min-h-screen flex-col">
      {children}
    </div>
  </DocumentSheetProvider>
</QueryProvider>`);
    }
    
    if (!results.triggers) {
        console.log('%c📝 ProjectAnalysis.tsx 修复:', 'color: #0891b2; font-weight: bold;');
        console.log(`
// 1. 添加导入
import { DocumentSheetTrigger, DocumentSheet } from '@/components/document-sheet';

// 2. 包装文档元素
<DocumentSheetTrigger
  datasetId={project.datasetId}
  documentId={doc.id}
  documentName={doc.name}
>
  <div className="cursor-pointer">
    {/* 现有文档内容 */}
  </div>
</DocumentSheetTrigger>

// 3. 在组件底部添加
<DocumentSheet />`);
    }
    
    // 8. 提供测试功能
    console.log('\n%c🧪 测试功能', 'color: #7c2d12; font-weight: bold;');
    console.log('%c=====================================', 'color: #7c2d12;');
    
    // 创建测试按钮
    if (!document.getElementById('documentsheet-test-button')) {
        const testButton = document.createElement('button');
        testButton.id = 'documentsheet-test-button';
        testButton.innerHTML = '🧪 测试DocumentSheet';
        testButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: #dc2626;
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
        `;
        
        testButton.onmouseover = () => {
            testButton.style.background = '#b91c1c';
            testButton.style.transform = 'translateY(-1px)';
        };
        
        testButton.onmouseout = () => {
            testButton.style.background = '#dc2626';
            testButton.style.transform = 'translateY(0)';
        };
        
        testButton.onclick = () => {
            // 高亮显示所有文档元素
            const docElements = document.querySelectorAll('.relative.group.border');
            docElements.forEach((element, index) => {
                element.style.outline = '3px solid #dc2626';
                element.style.outlineOffset = '2px';
                
                // 添加点击提示
                const tooltip = document.createElement('div');
                tooltip.textContent = `文档 #${index + 1}`;
                tooltip.style.cssText = `
                    position: absolute;
                    top: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #dc2626;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    pointer-events: none;
                    z-index: 1000;
                `;
                element.style.position = 'relative';
                element.appendChild(tooltip);
                
                // 3秒后清除高亮
                setTimeout(() => {
                    element.style.outline = '';
                    element.style.outlineOffset = '';
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 3000);
            });
            
            alert(`🧪 测试模式已激活！\n\n找到 ${docElements.length} 个文档元素\n已高亮显示，请尝试点击\n\n高亮将在3秒后消失`);
        };
        
        document.body.appendChild(testButton);
        console.log('✅ 测试按钮已添加到页面右上角');
    }
    
    // 返回诊断结果供进一步使用
    window.__DOCUMENTSHEET_DIAGNOSTIC_RESULT__ = {
        results,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        revalidate: () => DocumentSheetValidator()
    };
    
    console.log('\n%c💾 诊断结果已保存到 window.__DOCUMENTSHEET_DIAGNOSTIC_RESULT__', 'color: #0891b2;');
    console.log('%c🔄 要重新运行诊断，请调用: window.__DOCUMENTSHEET_DIAGNOSTIC_RESULT__.revalidate()', 'color: #0891b2;');
    
    return window.__DOCUMENTSHEET_DIAGNOSTIC_RESULT__;
})();