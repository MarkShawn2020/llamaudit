'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, FileText, MessageSquare, Loader2, Settings, Database, RefreshCw, BarChart3 } from 'lucide-react';
import { useChatBot } from '@/components/knowledge-base/chat-bot-provider';
import {
  useKnowledgeBases,
  useKnowledgeBaseStats,
  useKnowledgeBaseDocuments,
  useInvalidateKnowledgeBase,
} from '@/hooks/use-knowledge-base';

interface KnowledgeBaseTabProps {
  auditUnitId: string;
  auditUnitName: string;
}

export function KnowledgeBaseTab({ auditUnitId, auditUnitName }: KnowledgeBaseTabProps) {
  const [syncingFiles, setSyncingFiles] = useState<Set<string>>(new Set());
  const { showChatBot } = useChatBot();
  const { invalidateStats, invalidateDocuments } = useInvalidateKnowledgeBase();

  // React Query hooks
  const {
    data: knowledgeBases = [],
    isLoading: knowledgeBasesLoading,
    error: knowledgeBasesError,
  } = useKnowledgeBases(auditUnitId);

  const {
    data: knowledgeBaseStats = {},
    isLoading: statsLoading,
  } = useKnowledgeBaseStats(auditUnitId, knowledgeBases);

  const primaryKnowledgeBase = knowledgeBases[0];
  const primaryDatasetId = primaryKnowledgeBase?.difyDatasetId;
  const {
    data: documents = [],
    isLoading: documentsLoading,
  } = useKnowledgeBaseDocuments(auditUnitId, primaryDatasetId);

  // 监听知识库同步事件
  useEffect(() => {
    const handleSyncStart = (event: CustomEvent) => {
      const { projectId: eventProjectId, fileName } = event.detail;
      if (eventProjectId === auditUnitId) {
        setSyncingFiles(prev => new Set([...prev, fileName]));
      }
    };

    const handleSyncError = (event: CustomEvent) => {
      const { projectId: eventProjectId, fileName } = event.detail;
      if (eventProjectId === auditUnitId) {
        setSyncingFiles(prev => {
          const updated = new Set(prev);
          updated.delete(fileName);
          return updated;
        });
      }
    };

    const handleKnowledgeBaseUpdate = (event: CustomEvent) => {
      const { projectId: eventProjectId, fileName } = event.detail;
      
      if (eventProjectId === auditUnitId) {
        console.log(`Knowledge base updated - ${fileName}`);
        
        setSyncingFiles(prev => {
          const updated = new Set(prev);
          updated.delete(fileName);
          return updated;
        });
        
        // 使用 React Query 的 invalidate 来重新获取数据
        invalidateStats(auditUnitId);
        if (primaryDatasetId) {
          invalidateDocuments(auditUnitId, primaryDatasetId);
        }
      }
    };

    window.addEventListener('knowledgeBaseSyncStart', handleSyncStart as EventListener);
    window.addEventListener('knowledgeBaseSyncError', handleSyncError as EventListener);
    window.addEventListener('knowledgeBaseUpdated', handleKnowledgeBaseUpdate as EventListener);

    return () => {
      window.removeEventListener('knowledgeBaseSyncStart', handleSyncStart as EventListener);
      window.removeEventListener('knowledgeBaseSyncError', handleSyncError as EventListener);
      window.removeEventListener('knowledgeBaseUpdated', handleKnowledgeBaseUpdate as EventListener);
    };
  }, [auditUnitId, primaryDatasetId, invalidateStats, invalidateDocuments]);

  // 自动显示聊天机器人 - 使用稳定的依赖
  useEffect(() => {
    if (knowledgeBases.length > 0 && knowledgeBases[0]) {
      const primaryKnowledgeBase = knowledgeBases[0];
      showChatBot(
        primaryKnowledgeBase.id, 
        primaryKnowledgeBase.name, 
        auditUnitName
      );
    }
  }, [knowledgeBases.length, auditUnitName, showChatBot]);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    invalidateStats(auditUnitId);
    if (primaryDatasetId) {
      invalidateDocuments(auditUnitId, primaryDatasetId);
    }
  }, [auditUnitId, primaryDatasetId, invalidateStats, invalidateDocuments]);

  // 统计数据
  const totalDocuments = Object.values(knowledgeBaseStats).reduce((total, stats) => total + stats.documentCount, 0);
  const totalWords = Object.values(knowledgeBaseStats).reduce((total, stats) => total + stats.wordCount, 0);

  // 头部 Skeleton
  const HeaderSkeleton = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );

  // 文档卡片 Skeleton
  const DocumentCardSkeleton = () => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (knowledgeBasesLoading) {
    return (
      <div className="space-y-4">
        <HeaderSkeleton />
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <DocumentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (knowledgeBasesError) {
    return (
      <div className="text-center py-8">
        <Brain className="h-12 w-12 mx-auto text-red-500 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2 text-red-600">加载失败</h3>
        <p className="text-muted-foreground">
          {knowledgeBasesError.message || '无法加载知识库信息'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部标题和操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">智能知识库</h3>
          <div className="text-sm text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
            {statsLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <span>{totalDocuments} 个文档</span>
            )}
          </div>
        </div>
        
        {/* 操作区域 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 状态指示器 */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-background border text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-xs font-medium">自动同步</span>
          </div>
          
          {/* 功能按钮组 */}
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1"/>
              刷新
            </Button>
            
            {knowledgeBases.length > 0 && (
              <>
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-1"/>
                  统计
                </Button>
                
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1"/>
                  设置
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {knowledgeBases.length === 0 ? (
        <div className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Brain className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">尚未创建知识库</p>
            <p className="text-xs mt-1 opacity-75">上传项目文档后将自动创建知识库</p>
          </div>
        </div>
      ) : (
        <>
          {/* 知识库概览卡片 */}
          {knowledgeBases.map((kb) => (
            <Card key={kb.id} className="border border-muted mb-4">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-base font-medium">{kb.name}</h4>
                    {kb.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {kb.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {kb.indexingTechnique === 'high_quality' ? '高质量' : '经济型'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div className="text-center">
                    {statsLoading ? (
                      <Skeleton className="h-6 w-12 mx-auto mb-1" />
                    ) : (
                      <div className="text-xl font-bold text-blue-600">
                        {knowledgeBaseStats[kb.difyDatasetId]?.documentCount || 0}
                      </div>
                    )}
                    <div className="text-muted-foreground text-xs">文档数量</div>
                  </div>
                  <div className="text-center">
                    {statsLoading ? (
                      <Skeleton className="h-6 w-12 mx-auto mb-1" />
                    ) : (
                      <div className="text-xl font-bold text-green-600">
                        {knowledgeBaseStats[kb.difyDatasetId]?.wordCount || 0}
                      </div>
                    )}
                    <div className="text-muted-foreground text-xs">字数统计</div>
                  </div>
                  <div className="text-center">
                    {statsLoading ? (
                      <Skeleton className="h-6 w-12 mx-auto mb-1" />
                    ) : (
                      <div className="text-xl font-bold text-purple-600">
                        {knowledgeBaseStats[kb.difyDatasetId]?.appCount || 0}
                      </div>
                    )}
                    <div className="text-muted-foreground text-xs">应用数量</div>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">智能问答助手已启用</p>
                      <p className="text-blue-700 text-xs mt-1">
                        点击右下角聊天图标即可开始与知识库对话
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 文档列表 */}
          {documentsLoading ? (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <DocumentCardSkeleton key={i} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">暂无文档</h3>
              <p className="text-muted-foreground">
                知识库中还没有文档，上传项目文档后即可在此查看
              </p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {documents.map((doc, index) => {
                const isSyncing = syncingFiles.has(doc.name);
                return (
                  <Card 
                    key={doc.id || index} 
                    className={`overflow-hidden hover:shadow-md transition-shadow duration-200 ${
                      isSyncing 
                        ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                        : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* 文件名和状态 */}
                        <div className="flex items-center gap-2">
                          {isSyncing ? (
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm truncate flex-1" title={doc.name}>
                            {doc.name}
                          </span>
                          {isSyncing && (
                            <Badge variant="default" className="bg-blue-600 text-xs animate-pulse">
                              同步中
                            </Badge>
                          )}
                          {!isSyncing && (
                            <Badge variant={doc.enabled ? "default" : "secondary"} className="text-xs">
                              {doc.enabled ? "已启用" : "已禁用"}
                            </Badge>
                          )}
                        </div>
                        
                        {/* 统计信息 */}
                        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">创建:</span><br/>
                            <span>{new Date(doc.created_at * 1000).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="font-medium">字数:</span><br/>
                            <span>{doc.word_count?.toLocaleString() || 0}</span>
                          </div>
                          <div>
                            <span className="font-medium">Token:</span><br/>
                            <span>{doc.tokens?.toLocaleString() || 0}</span>
                          </div>
                          <div>
                            <span className="font-medium">访问:</span><br/>
                            <span>{doc.hit_count || 0} 次</span>
                          </div>
                        </div>
                        
                        {doc.error && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                            <span className="font-medium">错误:</span> {doc.error}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}