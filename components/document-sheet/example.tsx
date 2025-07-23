/**
 * DocumentSheet 使用示例
 * 展示如何在实际项目中集成和使用文档详情组件
 */

'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileText, Calendar, Hash, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// DocumentSheet相关导入
import {
  DocumentSheet,
  DocumentSheetTrigger,
  DocumentSheetProvider,
  useDocumentSheet,
  useDocumentSheetBatchActions,
} from '@/components/document-sheet';

// 创建QueryClient实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      refetchOnWindowFocus: false,
    },
  },
});

// 模拟文档数据类型
interface MockDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  created_at: number;
  indexing_status: string;
  segment_count: number;
  hit_count: number;
}

// 模拟文档数据
const mockDocuments: MockDocument[] = [
  {
    id: 'doc_001',
    name: '产品需求文档_v2.1.pdf',
    type: 'pdf',
    size: 2048576,
    created_at: 1703001600,
    indexing_status: 'completed',
    segment_count: 45,
    hit_count: 128,
  },
  {
    id: 'doc_002',
    name: '技术架构设计.docx',
    type: 'docx',
    size: 1536000,
    created_at: 1702915200,
    indexing_status: 'processing',
    segment_count: 23,
    hit_count: 67,
  },
  {
    id: 'doc_003',
    name: 'API接口文档.md',
    type: 'markdown',
    size: 512000,
    created_at: 1702828800,
    indexing_status: 'completed',
    segment_count: 89,
    hit_count: 234,
  },
  {
    id: 'doc_004',
    name: '用户手册_draft.txt',
    type: 'txt',
    size: 256000,
    created_at: 1702742400,
    indexing_status: 'waiting',
    segment_count: 12,
    hit_count: 5,
  },
];

// 状态配置
const STATUS_CONFIG = {
  waiting: {
    label: '等待处理',
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
  },
  processing: {
    label: '处理中',
    variant: 'default' as const,
    color: 'text-blue-600',
  },
  completed: {
    label: '已完成',
    variant: 'success' as const,
    color: 'text-green-600',
  },
  error: {
    label: '处理失败',
    variant: 'destructive' as const,
    color: 'text-red-600',
  },
};

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 文档卡片组件
 */
function DocumentCard({ document, datasetId }: { document: MockDocument; datasetId: string }) {
  const status = STATUS_CONFIG[document.indexing_status as keyof typeof STATUS_CONFIG];

  return (
    <DocumentSheetTrigger
      datasetId={datasetId}
      documentId={document.id}
      documentName={document.name}
      onHover={true} // 启用hover预加载
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <CardTitle className="text-sm font-medium truncate">
                {document.name}
              </CardTitle>
            </div>
            <Badge variant={status.variant} className="ml-2 flex-shrink-0">
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* 文件信息 */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{document.type.toUpperCase()}</span>
              <span>{formatFileSize(document.size)}</span>
            </div>
            
            {/* 统计信息 */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {document.segment_count} 分段
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {document.hit_count} 次命中
              </div>
            </div>
            
            {/* 创建时间 */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(document.created_at * 1000), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </div>
          </div>
        </CardContent>
      </Card>
    </DocumentSheetTrigger>
  );
}

/**
 * 批量操作工具栏
 */
function BatchActionToolbar() {
  const { 
    selectedCount, 
    hasSelection, 
    isBatchMode,
    enterBatchMode,
    exitBatchMode 
  } = useDocumentSheetBatchActions();

  if (!isBatchMode) {
    return (
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={enterBatchMode}>
          批量操作
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm text-blue-700">
          {hasSelection ? `已选择 ${selectedCount} 个分段` : '选择要操作的分段'}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {hasSelection && (
          <>
            <Button variant="outline" size="sm">
              启用选中
            </Button>
            <Button variant="outline" size="sm">
              禁用选中
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={exitBatchMode}>
          退出批量模式
        </Button>
      </div>
    </div>
  );
}

/**
 * 文档列表组件
 */
function DocumentList({ documents, datasetId }: { documents: MockDocument[]; datasetId: string }) {
  return (
    <div className="space-y-4">
      <BatchActionToolbar />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            datasetId={datasetId}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 程序化调用示例
 */
function ProgrammaticExample() {
  const { openDocumentSheet } = useDocumentSheet();
  
  const handleViewDocument = (documentId: string) => {
    const document = mockDocuments.find(doc => doc.id === documentId);
    if (document) {
      openDocumentSheet('dataset_example', documentId, document.name);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">程序化调用示例</h3>
      <div className="flex flex-wrap gap-2">
        {mockDocuments.slice(0, 2).map((doc) => (
          <Button
            key={doc.id}
            variant="outline"
            onClick={() => handleViewDocument(doc.id)}
          >
            查看 {doc.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * 主要应用组件
 */
function App() {
  const datasetId = 'dataset_example';

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">DocumentSheet 使用示例</h1>
        <p className="text-muted-foreground">
          点击文档卡片查看详情，支持文档信息查看、分段内容展示、搜索和批量操作
        </p>
      </div>

      {/* 文档列表 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">文档列表</h2>
        <DocumentList documents={mockDocuments} datasetId={datasetId} />
      </section>

      {/* 程序化调用示例 */}
      <section className="space-y-4">
        <ProgrammaticExample />
      </section>

      {/* 功能说明 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">功能说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基础功能</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• 文档基础信息展示</p>
              <p>• 处理状态实时更新</p>
              <p>• 统计数据可视化</p>
              <p>• 响应式设计适配</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">高级功能</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• 分段内容查看和搜索</p>
              <p>• 批量操作分段状态</p>
              <p>• 智能缓存和预加载</p>
              <p>• 键盘快捷键支持</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

/**
 * 根组件 - 包含必要的Provider
 */
export default function DocumentSheetExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <DocumentSheetProvider>
        <App />
        {/* 全局DocumentSheet组件 */}
        <DocumentSheet />
      </DocumentSheetProvider>
    </QueryClientProvider>
  );
}

/**
 * 使用方法示例代码片段
 */

// 1. 基础用法
/*
<DocumentSheetTrigger
  datasetId="your-dataset-id"
  documentId="your-document-id"
  documentName="文档名称"
>
  <YourDocumentCard />
</DocumentSheetTrigger>
*/

// 2. 启用hover预加载
/*
<DocumentSheetTrigger
  datasetId="your-dataset-id"
  documentId="your-document-id"
  onHover={true}
>
  <YourDocumentCard />
</DocumentSheetTrigger>
*/

// 3. 程序化调用
/*
const { openDocumentSheet } = useDocumentSheet();

const handleClick = () => {
  openDocumentSheet('dataset-id', 'document-id', '文档名称');
};
*/

// 4. 批量操作状态
/*
const { 
  selectedCount, 
  isBatchMode,
  enterBatchMode,
  exitBatchMode 
} = useDocumentSheetBatchActions();
*/

// 5. 搜索功能
/*
const { 
  searchKeyword, 
  setSearchKeyword, 
  clearSearch 
} = useDocumentSheetSearch();
*/