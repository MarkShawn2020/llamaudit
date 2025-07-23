# DocumentSheet 文档详情组件

一个功能强大的文档详情展示组件，支持文档元信息查看、分段内容展示、搜索、批量操作等功能。

## 功能特性

✨ **功能特性**
- 📄 文档元信息展示（基础信息、处理状态、统计数据）
- 📝 分段内容查看（支持展开/折叠、状态显示）
- 🔍 分段内容搜索（实时搜索、高亮显示）
- ✅ 批量操作（批量启用/禁用分段）
- 🔄 实时状态更新（处理中文档的轮询）
- 📱 响应式设计（移动端适配）

⚡ **性能优化**
- 虚拟滚动（处理大量分段数据）
- 智能缓存（React Query缓存策略）
- 预加载（hover预加载文档详情）
- 防抖搜索（搜索请求优化）
- 乐观更新（批量操作即时反馈）

🎨 **用户体验**
- 优雅的加载状态（Skeleton屏幕）
- 友好的错误处理（重试机制）
- 键盘导航支持（ESC关闭、Tab导航）
- 无障碍性支持（Screen Reader友好）

## 快速开始

### 1. 安装依赖

确保项目中已安装以下依赖：

```bash
npm install @tanstack/react-query date-fns lucide-react
```

### 2. 添加Provider

在应用根组件中添加 `DocumentSheetProvider`：

```tsx
// app/layout.tsx 或 _app.tsx
import { DocumentSheetProvider } from '@/components/document-sheet';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          <DocumentSheetProvider>
            {children}
            <DocumentSheet /> {/* 全局Sheet组件 */}
          </DocumentSheetProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 3. 使用触发器

在文档列表中使用 `DocumentSheetTrigger`：

```tsx
import { DocumentSheetTrigger } from '@/components/document-sheet';

function DocumentList({ documents, datasetId }) {
  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <DocumentSheetTrigger
          key={doc.id}
          datasetId={datasetId}
          documentId={doc.id}
          documentName={doc.name}
          onHover={true} // 启用hover预加载
        >
          <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <h3 className="font-medium">{doc.name}</h3>
            <p className="text-sm text-gray-500">{doc.created_at}</p>
          </div>
        </DocumentSheetTrigger>
      ))}
    </div>
  );
}
```

### 4. 程序化调用

也可以通过Hook程序化打开Sheet：

```tsx
import { useDocumentSheet } from '@/components/document-sheet';

function MyComponent() {
  const { openDocumentSheet } = useDocumentSheet();
  
  const handleViewDocument = (datasetId: string, documentId: string) => {
    openDocumentSheet(datasetId, documentId, '文档名称');
  };
  
  return (
    <button onClick={() => handleViewDocument('dataset1', 'doc1')}>
      查看文档详情
    </button>
  );
}
```

## 高级用法

### 搜索功能

组件内置搜索功能，可以实时搜索分段内容：

```tsx
import { useDocumentSheetSearch } from '@/components/document-sheet';

function CustomSearchComponent() {
  const { searchKeyword, setSearchKeyword, clearSearch } = useDocumentSheetSearch();
  
  return (
    <div>
      <input 
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        placeholder="搜索分段内容..."
      />
      {searchKeyword && (
        <button onClick={clearSearch}>清除搜索</button>
      )}
    </div>
  );
}
```

### 批量操作

支持批量选择和操作分段：

```tsx
import { useDocumentSheetBatchActions } from '@/components/document-sheet';

function BatchActionsComponent() {
  const { 
    selectedCount, 
    hasSelection, 
    isBatchMode,
    enterBatchMode,
    exitBatchMode 
  } = useDocumentSheetBatchActions();
  
  return (
    <div>
      {!isBatchMode ? (
        <button onClick={enterBatchMode}>批量操作</button>
      ) : (
        <div>
          <span>已选择 {selectedCount} 个分段</span>
          <button onClick={exitBatchMode}>退出批量模式</button>
        </div>
      )}
    </div>
  );
}
```

### 数据预加载

启用hover预加载以提升用户体验：

```tsx
<DocumentSheetTrigger
  datasetId="dataset1"
  documentId="doc1"
  onHover={true} // 鼠标悬停时预加载数据
>
  <DocumentCard />
</DocumentSheetTrigger>
```

## API参考

### DocumentSheetProvider

| Prop | Type | Description |
|------|------|-------------|
| children | ReactNode | 子组件 |

### DocumentSheetTrigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | 触发器内容 |
| datasetId | string | - | 数据集ID |
| documentId | string | - | 文档ID |
| documentName | string | - | 文档名称（可选） |
| onHover | boolean | false | 是否启用hover预加载 |
| className | string | - | 自定义CSS类名 |

### useDocumentSheet Hook

```tsx
const {
  // 状态
  isOpen,
  datasetId,
  documentId,
  documentName,
  activeTab,
  
  // 操作
  openDocumentSheet,
  closeDocumentSheet,
  setActiveTab,
  prefetchDocument,
} = useDocumentSheet();
```

### useDocumentSheetBatchActions Hook

```tsx
const {
  selectedSegmentIds,
  selectedCount,
  hasSelection,
  isBatchMode,
  selectAllSegments,
  clearSelectedSegments,
  enterBatchMode,
  exitBatchMode,
} = useDocumentSheetBatchActions();
```

### useDocumentSheetSearch Hook

```tsx
const {
  searchKeyword,
  hasSearchKeyword,
  setSearchKeyword,
  clearSearch,
} = useDocumentSheetSearch();
```

## 性能优化

### 虚拟滚动

对于包含大量分段的文档，组件自动启用虚拟滚动：

```tsx
// 自动处理，无需配置
// 当分段数量 > 100 时自动启用虚拟滚动
```

### 缓存策略

```tsx
// 文档详情缓存5分钟
// 分段数据缓存10分钟
// 搜索结果缓存2分钟

// 处理中的文档会自动启用轮询：
// - 文档详情：3秒轮询
// - 分段状态：5秒轮询
```

### 预加载策略

```tsx
// 启用hover预加载
<DocumentSheetTrigger onHover={true}>
  <DocumentCard />
</DocumentSheetTrigger>

// 程序化预加载
const { prefetchDocument } = useDocumentSheet();
prefetchDocument(datasetId, documentId);
```

## 自定义样式

### 主题定制

组件完全支持Tailwind CSS和shadcn/ui主题系统：

```css
/* 自定义变量 */
:root {
  --document-sheet-width: 800px;
  --document-segment-border: hsl(var(--border));
  --document-status-processing: hsl(var(--blue-500));
}

/* 自定义样式 */
.document-sheet-content {
  @apply bg-background text-foreground;
}

.document-segment-item {
  @apply border-border hover:bg-muted/50;
}
```

### 响应式设计

```tsx
// 组件内置响应式断点
// sm: 600px width
// lg: 800px width
// 移动端: 100% width
```

## 错误处理

### 网络错误

```tsx
// 自动重试机制
// - 404错误不重试
// - 其他错误最多重试3次
// - 指数退避算法
```

### 用户友好的错误提示

```tsx
// 文档加载失败
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    无法加载文档信息，请稍后重试
  </AlertDescription>
</Alert>

// 分段加载失败
<DocumentSegmentsError error={error} />
```

## 故障排除

### 常见问题

1. **Sheet不显示**
   - 确保已添加 `DocumentSheetProvider`
   - 检查 `DocumentSheet` 组件是否已渲染

2. **数据不加载**
   - 检查 `datasetId` 和 `documentId` 是否正确
   - 确认 API 配置是否正确
   - 查看浏览器控制台错误信息

3. **搜索不工作**
   - 确保 API 支持搜索功能
   - 检查搜索关键词是否符合要求

4. **批量操作失败**
   - 检查用户权限
   - 确认分段ID是否有效
   - 查看API响应错误信息

### 调试模式

```tsx
// 启用调试日志
localStorage.setItem('debug-document-sheet', 'true');

// 查看React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
```

## 最佳实践

### 性能优化

1. **使用预加载**：在用户可能查看的文档上启用hover预加载
2. **合理的缓存时间**：根据数据更新频率调整缓存时间
3. **分页加载**：对于大量分段，使用分页而不是一次性加载

### 用户体验

1. **清晰的状态提示**：确保用户了解当前操作状态
2. **合理的加载状态**：使用Skeleton而不是空白屏幕
3. **键盘导航**：支持ESC关闭、Tab导航等快捷键

### 数据管理

1. **智能缓存失效**：在数据更新后及时清理相关缓存
2. **乐观更新**：批量操作时使用乐观更新提升体验
3. **错误恢复**：在操作失败时自动回滚状态

## 更新日志

### v1.0.0 (2024-01-15)
- 🎉 初始版本发布
- ✨ 基础文档详情展示功能
- ✨ 分段内容查看和搜索
- ✨ 批量操作支持
- ⚡ 性能优化和缓存策略
- 🎨 响应式设计和主题支持

## 贡献指南

欢迎提交Issue和Pull Request来改进这个组件！

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 构建组件
npm run build
```

## 许可证

MIT License