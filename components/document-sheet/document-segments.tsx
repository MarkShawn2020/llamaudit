/**
 * 文档分段信息展示组件
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Hash,
  Type,
  Zap,
  Eye,
  EyeOff,
  X,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { DocumentSegment } from '@/lib/api/dify-dataset-api-extended';
import { useDocumentSheetSearch, useDocumentSheetBatchActions } from '@/contexts/document-sheet-context';

// 分段状态配置类型
interface SegmentStatusConfig {
  label: string;
  icon: React.ComponentType<any>;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
  animate?: boolean;
}

interface DocumentSegmentsProps {
  segments: DocumentSegment[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  totalCount?: number;
}

// 分段状态配置
const SEGMENT_STATUS_CONFIG: Record<string, SegmentStatusConfig> = {
  waiting: {
    label: '等待中',
    icon: Loader2,
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
  },
  indexing: {
    label: '索引中',
    icon: Loader2,
    variant: 'default' as const,
    color: 'text-blue-600',
    animate: true,
  },
  completed: {
    label: '已完成',
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-green-600',
  },
  error: {
    label: '失败',
    icon: AlertCircle,
    variant: 'destructive' as const,
    color: 'text-red-600',
  },
};

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 搜索和筛选头部
 */
function SegmentsHeader({ 
  totalCount, 
  onBatchAction 
}: { 
  totalCount?: number; 
  onBatchAction: (action: 'enable' | 'disable') => void;
}) {
  const { searchKeyword, setSearchKeyword, clearSearch } = useDocumentSheetSearch();
  const { 
    selectedCount, 
    hasSelection, 
    isBatchMode, 
    enterBatchMode, 
    exitBatchMode 
  } = useDocumentSheetBatchActions();

  return (
    <div className="space-y-4">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            文档分段 {totalCount && `(${formatNumber(totalCount)})`}
          </span>
        </div>
        
        {!isBatchMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={enterBatchMode}
            className="h-8"
          >
            批量操作
          </Button>
        )}
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索分段内容..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchKeyword && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 批量操作工具栏 */}
      {isBatchMode && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-700">
              {hasSelection ? `已选择 ${selectedCount} 个分段` : '选择要操作的分段'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {hasSelection && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBatchAction('enable')}
                  className="h-8"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  启用
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBatchAction('disable')}
                  className="h-8"
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  禁用
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={exitBatchMode}
              className="h-8"
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 单个分段项组件
 */
function SegmentItem({ 
  segment, 
  index, 
  isSelected, 
  onSelect, 
  isBatchMode 
}: { 
  segment: DocumentSegment; 
  index: number;
  isSelected: boolean;
  onSelect: (segmentId: string, selected: boolean) => void;
  isBatchMode: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = SEGMENT_STATUS_CONFIG[segment.status as keyof typeof SEGMENT_STATUS_CONFIG];
  const StatusIcon = status?.icon || CheckCircle2;
  const isContentLong = segment.content.length > 200;
  const displayContent = isExpanded || !isContentLong 
    ? segment.content 
    : segment.content.slice(0, 200) + '...';

  const handleSelect = useCallback(() => {
    onSelect(segment.id, !isSelected);
  }, [segment.id, isSelected, onSelect]);

  return (
    <Card className={`transition-colors overflow-hidden ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}>
      <CardContent className="p-4 min-w-0">
        {/* 头部信息 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {isBatchMode && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleSelect}
                className="mt-0.5"
              />
            )}
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                #{segment.position}
              </Badge>
              
              {/*<div className="flex items-center gap-1">*/}
              {/*  <StatusIcon*/}
              {/*    className={`h-3 w-3 ${status?.color || 'text-muted-foreground'} ${*/}
              {/*      status?.animate ? 'animate-spin' : ''*/}
              {/*    }`}*/}
              {/*  />*/}
              {/*  <Badge variant={status?.variant || 'secondary'} className="text-xs">*/}
              {/*    {status?.label || segment.status}*/}
              {/*  </Badge>*/}
              {/*</div>*/}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Hash className="h-4 w-4 mr-2" />
                复制ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                {segment.enabled ? (
                  <><EyeOff className="h-4 w-4 mr-2" />禁用</>
                ) : (
                  <><Eye className="h-4 w-4 mr-2" />启用</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 分段内容 */}
        <div className="space-y-3 min-w-0">
          <div className="text-sm leading-relaxed min-w-0">
            <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere min-w-0 max-w-full">
              {displayContent}
            </div>
            
            {isContentLong && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-auto p-0 mt-2 text-xs"
              >
                {isExpanded ? (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3 w-3 mr-1" />
                    展开全部
                  </>
                )}
              </Button>
            )}
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap min-w-0">
            <div className="flex items-center gap-1">
              <Type className="h-3 w-3" />
              {formatNumber(segment.word_count)} 词
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {formatNumber(segment.tokens)} tokens
            </div>
            <div className="text-xs">
              {format(new Date(segment.created_at * 1000), 'MM-dd HH:mm', { locale: zhCN })}
            </div>
            {segment.hit_count > 0 && (
              <div className="text-xs text-blue-600">
                命中 {segment.hit_count} 次
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 分段列表组件
 */
function SegmentsList({ 
  segments, 
  hasNextPage, 
  isFetchingNextPage, 
  fetchNextPage,
  onBatchAction 
}: {
  segments: DocumentSegment[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onBatchAction: (action: 'enable' | 'disable') => void;
}) {
  const { 
    selectedSegmentIds, 
    isBatchMode, 
    selectSegment, 
    deselectSegment,
    selectAllSegments,
    clearSelectedSegments
  } = useDocumentSheetBatchActions();

  // 处理分段选择
  const handleSegmentSelect = useCallback((segmentId: string, selected: boolean) => {
    if (selected) {
      selectSegment(segmentId);
    } else {
      deselectSegment(segmentId);
    }
  }, [selectSegment, deselectSegment]);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedSegmentIds.length === segments.length) {
      clearSelectedSegments();
    } else {
      selectAllSegments(segments.map(s => s.id));
    }
  }, [selectedSegmentIds.length, segments.length, segments, clearSelectedSegments, selectAllSegments]);

  // 滚动到底部时加载更多
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (segments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">暂无分段数据</h3>
          <p className="text-sm text-muted-foreground mt-2">
            文档正在处理中，分段信息将稍后显示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 批量选择头部 */}
      {isBatchMode && (
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedSegmentIds.length === segments.length && segments.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              全选 ({segments.length} 个分段)
            </span>
          </div>
        </div>
      )}

      {/* 分段列表 */}
      <ScrollArea className="flex-1 w-full min-h-0" onScrollCapture={handleScroll}>
        <div className="space-y-3 pr-4 min-w-0 max-w-full">
          {segments.map((segment, index) => (
            <SegmentItem
              key={segment.id}
              segment={segment}
              index={index}
              isSelected={selectedSegmentIds.includes(segment.id)}
              onSelect={handleSegmentSelect}
              isBatchMode={isBatchMode}
            />
          ))}
          
          {/* 加载更多指示器 */}
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">加载更多分段...</p>
            </div>
          )}
          
          {/* 没有更多数据提示 */}
          {!hasNextPage && segments.length > 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">已加载全部分段</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * 加载状态组件
 */
function DocumentSegmentsLoading() {
  return (
    <div className="h-full flex flex-col space-y-6">
      {/* 头部加载状态 */}
      <div className="space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
      
      {/* 分段列表加载状态 */}
      <div className="flex-1 min-h-0">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 错误状态组件
 */
function DocumentSegmentsError({ error }: { error: Error }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-700">加载失败</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {error.message || '无法加载分段信息，请稍后重试'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 文档分段主组件
 */
export default function DocumentSegments({ 
  segments, 
  isLoading, 
  error, 
  hasNextPage, 
  isFetchingNextPage, 
  fetchNextPage,
  totalCount 
}: DocumentSegmentsProps) {
  
  // 批量操作处理
  const handleBatchAction = useCallback((action: 'enable' | 'disable') => {
    // 这里会调用批量更新API
    console.log('Batch action:', action);
  }, []);

  if (isLoading) {
    return <DocumentSegmentsLoading />;
  }
  
  if (error) {
    return <DocumentSegmentsError error={error} />;
  }
  
  return (
    <div className="h-full flex flex-col space-y-6">
      <SegmentsHeader 
        totalCount={totalCount} 
        onBatchAction={handleBatchAction}
      />
      <div className="flex-1 min-h-0">
        <SegmentsList
          segments={segments}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          onBatchAction={handleBatchAction}
        />
      </div>
    </div>
  );
}