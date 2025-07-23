/**
 * 文档详情Sheet主组件
 */

'use client';

import React, { useEffect, useMemo } from 'react';
import { 
  FileText, 
  Hash, 
  X, 
  ExternalLink, 
  Download, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useDocumentSheet } from '@/contexts/document-sheet-context';
import { 
  useDocumentDetails, 
  useDocumentSegments, 
  useSearchDocumentSegments,
  useRefreshDocumentData,
  useUpdateSegmentsStatus,
  useDocumentUploadFile
} from '@/hooks/use-document-details';
import { useDocumentSheetSearch, useDocumentSheetBatchActions } from '@/contexts/document-sheet-context';
import { useDifyConfig } from '@/contexts/dify-config-context';

import DocumentMeta from './document-meta';
import DocumentSegments from './document-segments';

/**
 * Sheet头部组件
 */
function DocumentSheetHeaderContent() {
  const { documentName, documentId, datasetId, closeDocumentSheet } = useDocumentSheet();
  const refreshDocumentData = useRefreshDocumentData();
  
  const handleRefresh = () => {
    if (datasetId && documentId) {
      refreshDocumentData(datasetId, documentId);
    }
  };

  return (
    <SheetHeader className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">
              {documentName || '文档详情'}
            </span>
          </SheetTitle>
          {documentId && (
            <SheetDescription className="mt-1">
              文档ID: {documentId}
            </SheetDescription>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <SheetClose asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
      </div>
    </SheetHeader>
  );
}

/**
 * 文档操作工具栏
 */
function DocumentActions() {
  const { datasetId, documentId } = useDocumentSheet();
  const { data: document } = useDocumentDetails(datasetId || undefined, documentId || undefined);
  const { data: uploadFile, isLoading: isLoadingUploadFile } = useDocumentUploadFile(datasetId || undefined, documentId || undefined);
  const { config } = useDifyConfig();
  
  // 查看原文
  const handleViewOriginal = () => {
    console.log('Upload file data:', uploadFile);
    console.log('Config baseUrl:', config.baseUrl);
    
    if (uploadFile?.url) {
      let previewUrl = uploadFile.url;
      
      // 调试日志
      console.log('Original URL:', previewUrl);
      
      // 如果URL是相对路径，需要拼接文件服务的base URL
      if (previewUrl.startsWith('/')) {
        // 从API baseUrl提取文件服务的baseUrl
        // 例如: https://api.dify.ai/v1 -> https://api.dify.ai
        // 或者: http://dify.cs-magic.cn/v1 -> http://dify.cs-magic.cn
        const fileBaseUrl = config.baseUrl.replace('/v1', '');
        previewUrl = `${fileBaseUrl}${previewUrl}`;
        console.log('File service URL:', previewUrl);
      }
      
      // 尝试打开URL
      console.log('Opening URL:', previewUrl);
      window.open(previewUrl, '_blank');
    } else {
      console.error('Upload file URL not available:', uploadFile);
      alert('原文链接不可用');
    }
  };
  
  // 下载文档
  const handleDownload = () => {
    if (uploadFile?.download_url) {
      // 确保下载URL是完整的
      let downloadUrl = uploadFile.download_url;
      if (downloadUrl.startsWith('/')) {
        // 从API baseUrl提取文件服务的baseUrl
        const fileBaseUrl = config.baseUrl.replace('/v1', '');
        downloadUrl = `${fileBaseUrl}${downloadUrl}`;
      }
      
      // 创建隐藏的下载链接
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = uploadFile.name || '文档';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } else {
      alert('下载链接不可用');
    }
  };
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b bg-muted/50 gap-3 sm:gap-0" id={"doc-actions"}>
      {/* Document title/status indicator */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {document && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="truncate">{document.doc_form || 'Document'}</span>
            </div>
          )}
          {uploadFile && (
            <div className="text-xs text-muted-foreground">
              {uploadFile.extension.toUpperCase()} • {(uploadFile.size / 1024).toFixed(1)}KB
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons - responsive layout */}
      <div className="flex items-center justify-between sm:justify-end gap-3">
        {/* Primary action - always visible */}
        <Button 
          variant="default" 
          size="sm" 
          className="h-9 px-4 flex-1 sm:flex-none"
          onClick={handleViewOriginal}
          disabled={isLoadingUploadFile || !uploadFile?.url}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">查看原文</span>
          <span className="xs:hidden">查看</span>
        </Button>
        
        {/* Secondary actions - adaptive layout */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 px-3 text-muted-foreground hover:text-foreground"
            onClick={handleDownload}
            disabled={isLoadingUploadFile || !uploadFile?.download_url}
            title="导出文档"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:ml-2 sm:inline">导出</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 px-3 text-muted-foreground hover:text-red-600"
            title="删除文档"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:ml-2 sm:inline">删除</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab内容组件
 */
function DocumentTabsContent() {
  const {
    activeTab, 
    setActiveTab, 
    datasetId, 
    documentId 
  } = useDocumentSheet();
  const { searchKeyword } = useDocumentSheetSearch();
  const { selectedSegmentIds } = useDocumentSheetBatchActions();
  const updateSegmentsStatus = useUpdateSegmentsStatus();

  // 获取文档详情
  const {
    data: document,
    isLoading: isDocumentLoading,
    error: documentError,
  } = useDocumentDetails(datasetId || undefined, documentId || undefined);

  // 获取分段数据（普通模式）
  const {
    data: segmentsData,
    isLoading: isSegmentsLoading,
    error: segmentsError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useDocumentSegments(
    datasetId || undefined, 
    documentId || undefined, 
    !searchKeyword // 只在没有搜索时启用
  );

  // 获取搜索结果（搜索模式）
  const {
    data: searchResultsData,
    isLoading: isSearchLoading,
    error: searchError,
    hasNextPage: searchHasNextPage,
    isFetchingNextPage: searchIsFetchingNextPage,
    fetchNextPage: searchFetchNextPage,
  } = useSearchDocumentSegments(
    datasetId || undefined,
    documentId || undefined,
    searchKeyword,
    !!searchKeyword // 只在有搜索词时启用
  );

  // 合并分段数据
  const segments = useMemo(() => {
    const data = searchKeyword ? searchResultsData : segmentsData;
    return data?.pages?.flatMap(page => page.data) || [];
  }, [searchKeyword, searchResultsData, segmentsData]);

  const segmentsState = useMemo(() => ({
    segments,
    isLoading: searchKeyword ? isSearchLoading : isSegmentsLoading,
    error: searchKeyword ? searchError : segmentsError,
    hasNextPage: searchKeyword ? searchHasNextPage : hasNextPage,
    isFetchingNextPage: searchKeyword ? searchIsFetchingNextPage : isFetchingNextPage,
    fetchNextPage: searchKeyword ? searchFetchNextPage : fetchNextPage,
    totalCount: searchKeyword 
      ? searchResultsData?.pages?.[0]?.total 
      : segmentsData?.pages?.[0]?.total,
  }), [
    segments,
    searchKeyword,
    isSearchLoading,
    isSegmentsLoading,
    searchError,
    segmentsError,
    searchHasNextPage,
    hasNextPage,
    searchIsFetchingNextPage,
    isFetchingNextPage,
    searchFetchNextPage,
    fetchNextPage,
    searchResultsData,
    segmentsData,
  ]);

  // 批量操作分段状态
  const handleBatchAction = async (action: 'enable' | 'disable') => {
    if (!datasetId || !documentId || selectedSegmentIds.length === 0) return;
    
    try {
      await updateSegmentsStatus.mutateAsync({
        datasetId,
        documentId,
        segmentIds: selectedSegmentIds,
        enabled: action === 'enable',
      });
    } catch (error) {
      console.error('批量操作失败:', error);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'segments')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          概览
        </TabsTrigger>
        <TabsTrigger value="segments" className="flex items-center gap-2">
          <Hash className="h-4 w-4" />
          分段 {segments.length > 0 && `(${segments.length})`}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <DocumentMeta
          document={document}
          isLoading={isDocumentLoading}
          error={documentError}
        />
      </TabsContent>

      <TabsContent value="segments" className="mt-6">
        <DocumentSegments
          segments={segmentsState.segments}
          isLoading={segmentsState.isLoading}
          error={segmentsState.error}
          hasNextPage={segmentsState.hasNextPage}
          isFetchingNextPage={segmentsState.isFetchingNextPage}
          fetchNextPage={segmentsState.fetchNextPage}
          totalCount={segmentsState.totalCount}
        />
      </TabsContent>
    </Tabs>
  );
}

/**
 * 错误边界组件
 */
function DocumentSheetErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense 
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      {children}
    </React.Suspense>
  );
}

/**
 * 文档详情Sheet主组件
 */
export default function DocumentSheet() {
  const { isOpen, closeDocumentSheet, datasetId, documentId } = useDocumentSheet();

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeDocumentSheet();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, closeDocumentSheet]);

  // 数据验证
  const hasValidData = datasetId && documentId;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeDocumentSheet()}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[600px] lg:w-[800px] p-0 flex flex-col"
      >
        {hasValidData ? (
          <DocumentSheetErrorBoundary>
            <DocumentSheetHeaderContent />
            <DocumentActions />
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <DocumentTabsContent />
                </div>
              </ScrollArea>
            </div>
          </DocumentSheetErrorBoundary>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Alert className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                无效的文档信息，请重新选择文档
              </AlertDescription>
            </Alert>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * 触发器组件 - 用于在文档列表中点击触发
 */
export function DocumentSheetTrigger({ 
  children, 
  datasetId, 
  documentId, 
  documentName,
  onHover = false 
}: { 
  children: React.ReactNode; 
  datasetId: string; 
  documentId: string; 
  documentName?: string;
  onHover?: boolean;
}) {
  const { openDocumentSheet, prefetchDocument } = useDocumentSheet();

  const handleClick = () => {
    openDocumentSheet(datasetId, documentId, documentName);
  };

  const handleMouseEnter = () => {
    if (onHover) {
      prefetchDocument(datasetId, documentId);
    }
  };

  return (
    <div 
      onClick={handleClick} 
      onMouseEnter={handleMouseEnter}
      className="cursor-pointer"
    >
      {children}
    </div>
  );
}