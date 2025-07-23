/**
 * 文档详情Sheet主组件
 */

'use client';

import React, {useEffect, useMemo} from 'react';
import {AlertCircle, ExternalLink, FileText, Hash, Loader2, Trash2} from 'lucide-react';

import {Sheet, SheetContent, SheetHeader, SheetTitle,} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Alert, AlertDescription} from '@/components/ui/alert';

import {
    useDocumentSheet,
    useDocumentSheetBatchActions,
    useDocumentSheetSearch
} from '@/contexts/document-sheet-context';
import {
    useDocumentDetails,
    useDocumentSegments,
    useDocumentUploadFile,
    useSearchDocumentSegments,
    useUpdateSegmentsStatus
} from '@/hooks/use-document-details';
import {useDifyConfig} from '@/contexts/dify-config-context';

import DocumentMeta from './document-meta';
import DocumentSegments from './document-segments';

/**
 * Sheet头部组件 - 增强版，显示关键文档信息
 */
function DocumentSheetHeaderContent() {
    const {documentName} = useDocumentSheet();

    return (
        <SheetHeader className="space-y-3">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-8">
                    <SheetTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 flex-shrink-0"/>
                        <span className="truncate">
              {documentName || '文档详情'}
            </span>
                    </SheetTitle>
                </div>
            </div>
        </SheetHeader>
    );
}


/**
 * 底部操作区域 - 固定在侧边栏底部的单列满占布局
 */
function DocumentBottomActions() {
    const {datasetId, documentId} = useDocumentSheet();
    const {
        data: uploadFile,
        isLoading: isLoadingUploadFile
    } = useDocumentUploadFile(datasetId || undefined, documentId || undefined);
    const {config} = useDifyConfig();

    // 查看原文
    const handleViewOriginal = () => {
        if (uploadFile?.url) {
            let previewUrl = uploadFile.url;
            if (previewUrl.startsWith('/')) {
                const fileBaseUrl = config.baseUrl.replace('/v1', '');
                previewUrl = `${fileBaseUrl}${previewUrl}`;
            }
            window.open(previewUrl, '_blank');
        } else {
            alert('原文链接不可用');
        }
    };

    // 下载文档
    const handleDownload = () => {
        if (uploadFile?.download_url) {
            let downloadUrl = uploadFile.download_url;
            if (downloadUrl.startsWith('/')) {
                const fileBaseUrl = config.baseUrl.replace('/v1', '');
                downloadUrl = `${fileBaseUrl}${downloadUrl}`;
            }

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
        <div className="border-t bg-background/95 backdrop-blur-sm p-4 space-y-2" id="bottom-actions">
            {/* 查看原文 - 第一行 */}
            <Button
                variant="outline"
                size="lg"
                className="w-full h-11 text-base font-medium"
                onClick={handleViewOriginal}
                disabled={isLoadingUploadFile || !uploadFile?.url}
            >
                <ExternalLink className="h-4 w-4 mr-2"/>
                查看原文
            </Button>

            {/* 删除文档 - 第二行 */}
            <Button
                variant="outline"
                size="lg"
                className="w-full h-11 text-base font-medium text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            >
                <Trash2 className="h-4 w-4 mr-2"/>
                删除文档
            </Button>
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
    const {searchKeyword} = useDocumentSheetSearch();
    const {selectedSegmentIds} = useDocumentSheetBatchActions();
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
                    <FileText className="h-4 w-4"/>
                    概览
                </TabsTrigger>
                <TabsTrigger value="segments" className="flex items-center gap-2">
                    <Hash className="h-4 w-4"/>
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
function DocumentSheetErrorBoundary({children}: { children: React.ReactNode }) {
    return (
        <React.Suspense
            fallback={
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin"/>
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
    const {isOpen, closeDocumentSheet, datasetId, documentId} = useDocumentSheet();

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
                        <DocumentSheetHeaderContent/>

                        <div className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-6 pb-0">
                                    <DocumentTabsContent/>
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Bottom Actions Area - Fixed Position */}
                        <DocumentBottomActions/>
                    </DocumentSheetErrorBoundary>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Alert className="max-w-md">
                            <AlertCircle className="h-4 w-4"/>
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
    const {openDocumentSheet, prefetchDocument} = useDocumentSheet();

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