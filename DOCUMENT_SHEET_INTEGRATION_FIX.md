# 🔧 DocumentSheet 集成修复指南

## 问题分析
✅ DocumentSheet组件已完整实现  
❌ **Provider未配置** - 导致Context不可用  
❌ **文档列表未集成点击事件** - 无法触发Sheet  
❌ **DocumentSheet组件未渲染** - Sheet无法显示  

---

## 🚀 立即修复方案（3步完成）

### 步骤1：配置Provider
**文件**: `app/layout.tsx`

```tsx
// 添加导入
import { DocumentSheetProvider } from '@/components/document-sheet';

// 修改现有layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head />
      <body className={cn("font-sans antialiased", fontSans.variable)}>
        <QueryClientProvider client={queryClient}>
          <DifyConfigProvider>
            {/* 🔥 添加这里 */}
            <DocumentSheetProvider>
              <div className="relative flex min-h-screen flex-col">
                <SiteHeader />
                <div className="flex-1">{children}</div>
                <SiteFooter />
              </div>
            </DocumentSheetProvider>
            {/* 🔥 添加结束 */}
          </DifyConfigProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 步骤2：集成文档列表点击事件
**文件**: `components/projects/detail/ProjectAnalysis.tsx`

在文件顶部添加导入：
```tsx
// 在现有导入中添加
import { DocumentSheetTrigger, DocumentSheet } from '@/components/document-sheet';
```

找到第406-450行的文档列表渲染部分，修改为：
```tsx
{/* 原来的代码 */}
{allDocuments.map((doc) => (
  <div key={doc.id} className="relative group border rounded-lg p-3 hover:bg-muted/20 transition-colors min-w-0">
  
{/* 🔥 修改为这样 */}
{allDocuments.map((doc) => (
  <DocumentSheetTrigger
    key={doc.id}
    datasetId={project.datasetId || 'default'}
    documentId={doc.id}
    documentName={doc.name}
    onHover={true} // 启用hover预加载
  >
    <div className="relative group border rounded-lg p-3 hover:bg-muted/20 transition-colors min-w-0 cursor-pointer">
      {/* 保持现有的文档卡片内容不变 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{doc.name}</span>
        </div>
        {/* 现有状态badge等保持不变 */}
      </div>
      {/* 其他现有内容保持不变 */}
    </div>
  </DocumentSheetTrigger>
))}
```

### 步骤3：渲染DocumentSheet组件
在 `ProjectAnalysis.tsx` 文件的**最底部return语句前**添加：

```tsx
export default function ProjectAnalysis({ projectId }: ProjectAnalysisProps) {
  // ... 现有逻辑保持不变

  return (
    <div className="space-y-6">
      {/* ... 现有JSX内容保持不变 */}
      
      {/* 🔥 在最后添加这一行 */}
      <DocumentSheet />
    </div>
  );
}
```

---

## 🔍 验证修复是否成功

修改完成后，按F12打开开发者工具，执行以下检查：

### 1. Provider检查
```javascript
// 在控制台执行
console.log('DocumentSheet Elements:', document.querySelectorAll('[data-document-sheet-provider]'));
```
应该显示找到元素。

### 2. 点击事件检查
点击任意文档卡片，控制台应该显示：
```
DocumentSheet Context: { isOpen: true, datasetId: "...", documentId: "..." }
```

### 3. Sheet渲染检查
```javascript
// 点击文档后执行
console.log('Sheet Content:', document.querySelector('[data-radix-dialog-content]'));
```
应该找到Sheet内容元素。

---

## 🚨 如果仍然不工作

### 临时调试代码
在 `ProjectAnalysis.tsx` 添加调试按钮：

```tsx
// 添加到组件内部
import { useDocumentSheet } from '@/components/document-sheet';

function DebugButton() {
  const { openDocumentSheet } = useDocumentSheet();
  
  return (
    <button 
      onClick={() => {
        console.log('Debug: Opening test sheet');
        openDocumentSheet('test-dataset', 'test-doc', 'Test Document');
      }}
      className="px-4 py-2 bg-red-500 text-white rounded"
    >
      🔥 调试：强制打开Sheet
    </button>
  );
}

// 在render中添加
<DebugButton />
```

### 检查数据完整性
确保文档数据包含必要字段：
```tsx
// 在文档列表渲染前添加
console.log('Document data check:', {
  projectDatasetId: project.datasetId,
  firstDocument: allDocuments[0],
  documentCount: allDocuments.length
});
```

---

## 💡 常见问题解决

### 问题：Provider Context 错误
**现象**: `useDocumentSheet must be used within a DocumentSheetProvider`
**解决**: 确保步骤1中的Provider正确包装了整个应用

### 问题：点击无反应
**现象**: 点击文档卡片没有任何反应
**解决**: 
1. 检查 `datasetId` 是否为空
2. 确认点击区域是否被其他元素遮挡
3. 添加 `console.log` 确认点击事件触发

### 问题：Sheet显示空白
**现象**: Sheet打开但内容为空
**解决**: 
1. 检查文档ID是否有效
2. 确认API配置是否正确
3. 查看网络请求是否成功

---

## ✅ 预期结果

修复完成后，您应该能够：
1. ✅ 点击任意文档卡片
2. ✅ 看到从右侧滑出的Sheet
3. ✅ 查看文档的基础信息和统计数据
4. ✅ 切换到分段标签查看文档分段
5. ✅ 搜索分段内容
6. ✅ 批量操作分段状态

如果按照以上步骤修改后仍有问题，请提供控制台错误信息，我将进一步协助排查。