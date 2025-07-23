/**
 * 文档元信息展示组件
 */

'use client';

import React from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  FileText, 
  Clock, 
  Hash, 
  HardDrive, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Calendar,
  BarChart3,
  Zap,
  ExternalLink,
  Download,
  Copy,
  Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ExtendedDocumentDetails } from '@/lib/api/dify-dataset-api-extended';
import { useDocumentUploadFile } from '@/hooks/use-document-details';
import { useDocumentSheet } from '@/contexts/document-sheet-context';
import { useDifyConfig } from '@/contexts/dify-config-context';

interface DocumentMetaProps {
  document: ExtendedDocumentDetails | undefined;
  isLoading: boolean;
  error: Error | null;
}

// 状态配置类型
interface StatusConfig {
  label: string;
  icon: React.ComponentType<any>;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
  animate?: boolean;
}

// 状态配置
const STATUS_CONFIG: Record<string, StatusConfig> = {
  waiting: {
    label: '等待处理',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
  },
  queuing: {
    label: '队列中',
    icon: Clock,
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
  splitting: {
    label: '分段中',
    icon: Loader2,
    variant: 'default' as const,
    color: 'text-blue-600',
    animate: true,
  },
  processing: {
    label: '处理中',
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
    label: '处理失败',
    icon: AlertCircle,
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

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 计算处理时长
function calculateProcessingDuration(startTime?: number, endTime?: number): string | null {
  if (!startTime) return null;
  
  const end = endTime || Date.now() / 1000;
  const duration = end - startTime;
  
  if (duration < 60) {
    return `${Math.round(duration)}秒`;
  }
  if (duration < 3600) {
    return `${Math.round(duration / 60)}分钟`;
  }
  return `${Math.round(duration / 3600)}小时`;
}

/**
 * 基础信息卡片
 */
function BasicInfoCard({ document }: { document: ExtendedDocumentDetails }) {
  const { datasetId, documentId } = useDocumentSheet();
  const { data: uploadFile, isLoading: isLoadingUploadFile } = useDocumentUploadFile(datasetId || undefined, documentId || undefined);
  const { config } = useDifyConfig();
  
  // 查看原文
  const handleViewOriginal = () => {
    if (uploadFile?.url) {
      let previewUrl = uploadFile.url;
      if (previewUrl.startsWith('/')) {
        const fileBaseUrl = config.baseUrl.replace('/v1', '');
        previewUrl = `${fileBaseUrl}${previewUrl}`;
      }
      window.open(previewUrl, '_blank');
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
    }
  };
  
  // 复制文档ID
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(document.id);
      // TODO: Add toast notification
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            基础信息
          </div>
          {/* Quick actions for file operations */}
          {uploadFile && (
            <div className="flex items-center gap-1" >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleViewOriginal}
                disabled={isLoadingUploadFile || !uploadFile?.url}
                title="查看原文"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleDownload}
                disabled={isLoadingUploadFile || !uploadFile?.download_url}
                title="下载文档"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleCopyId}
                title="复制文档ID"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 文档名称 */}
        <div className="flex items-start justify-between">
          <span className="text-sm text-muted-foreground">文档名称</span>
          <span className="text-sm font-medium text-right max-w-[200px] break-words">
            {document.name}
          </span>
        </div>
        
        {/* 文档ID */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">文档ID</span>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {document.id.slice(0, 8)}...{document.id.slice(-4)}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleCopyId}
              title="复制完整ID"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* 文件信息 - 增强版 */}
        {document.upload_file && (
          <>
            <Separator className="my-3" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">文件信息</span>
                {uploadFile && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleViewOriginal}
                      disabled={isLoadingUploadFile || !uploadFile?.url}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      查看原文
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">文件类型</span>
                  <Badge variant="outline" className="text-xs">
                    {document.upload_file.extension?.toUpperCase() || document.doc_form}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">文件大小</span>
                  <span className="text-sm font-medium">
                    {formatFileSize(document.upload_file.size)}
                  </span>
                </div>
                
                {uploadFile && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">MIME类型</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {uploadFile.mime_type}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        <Separator className="my-3" />
        
        {/* 创建时间 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">创建时间</span>
          <span className="text-sm font-medium">
            {format(new Date(document.created_at * 1000), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
          </span>
        </div>
        
        {/* 创建者 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">创建者</span>
          <span className="text-sm font-medium">{document.created_by}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 处理状态卡片
 */
function ProcessingStatusCard({ document }: { document: ExtendedDocumentDetails }) {
  const status = STATUS_CONFIG[document.indexing_status as keyof typeof STATUS_CONFIG];
  const StatusIcon = status?.icon || Activity;
  const processingDuration = calculateProcessingDuration(
    document.processing_started_at,
    document.processing_completed_at
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          处理状态
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前状态 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">当前状态</span>
          <div className="flex items-center gap-2">
            <StatusIcon 
              className={`h-4 w-4 ${status?.color || 'text-muted-foreground'} ${
                status?.animate ? 'animate-spin' : ''
              }`} 
            />
            <Badge variant={status?.variant || 'secondary'}>
              {status?.label || document.indexing_status}
            </Badge>
          </div>
        </div>
        
        {/* 处理开始时间 */}
        {document.processing_started_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">开始时间</span>
            <span className="text-sm font-medium">
              {format(new Date(document.processing_started_at * 1000), 'MM-dd HH:mm')}
            </span>
          </div>
        )}
        
        {/* 处理完成时间 */}
        {document.processing_completed_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">完成时间</span>
            <span className="text-sm font-medium">
              {format(new Date(document.processing_completed_at * 1000), 'MM-dd HH:mm')}
            </span>
          </div>
        )}
        
        {/* 处理时长 */}
        {processingDuration && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">处理时长</span>
            <span className="text-sm font-medium">{processingDuration}</span>
          </div>
        )}
        
        {/* 错误信息 */}
        {document.error && (
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">错误信息</span>
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {document.error}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 统计信息卡片
 */
function StatisticsCard({ document }: { document: ExtendedDocumentDetails }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          统计信息
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 字符数 */}
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(document.character_count || 0)}
            </div>
            <div className="text-xs text-blue-600/80">字符数</div>
          </div>
          
          {/* 分段数 */}
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(document.segment_count || 0)}
            </div>
            <div className="text-xs text-green-600/80">分段数</div>
          </div>
          
          {/* Token数 */}
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(document.tokens || 0)}
            </div>
            <div className="text-xs text-purple-600/80">Token数</div>
          </div>
          
          {/* 命中次数 */}
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(document.hit_count || 0)}
            </div>
            <div className="text-xs text-orange-600/80">命中次数</div>
          </div>
        </div>
        
        {/* 词数统计 */}
        {document.word_count && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">词数统计</span>
              <span className="text-sm font-medium">{formatNumber(document.word_count)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 加载状态组件
 */
function DocumentMetaLoading() {
  return (
    <div className="space-y-6">
      {/* 基础信息加载状态 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* 处理状态加载状态 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* 统计信息加载状态 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border">
                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 错误状态组件
 */
function DocumentMetaError({ error }: { error: Error }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-red-700">加载失败</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || '无法加载文档信息，请稍后重试'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 文档元信息主组件
 */
export default function DocumentMeta({ document, isLoading, error }: DocumentMetaProps) {
  if (isLoading) {
    return <DocumentMetaLoading />;
  }
  
  if (error) {
    return <DocumentMetaError error={error} />;
  }
  
  if (!document) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      <BasicInfoCard document={document} />
      <ProcessingStatusCard document={document} />
      <StatisticsCard document={document} />
    </div>
  );
}