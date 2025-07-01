'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, FileText, MessageSquare, Loader2, Settings, Database } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('overview');
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

  // Skeleton 组件
  const KnowledgeBaseSkeleton = () => (
    <div className="space-y-4">
      {/* 顶部状态栏骨架 */}
      <div className="flex items-center justify-between py-2 px-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-muted rounded-full animate-pulse"></span>
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      
      {/* Tab 骨架 */}
      <div className="space-y-4">
        <div className="flex space-x-1 bg-muted p-1 rounded-md">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
        
        {/* 内容骨架 */}
        <div className="space-y-4">
          <Card className="border border-muted">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="text-center space-y-2">
                    <Skeleton className="h-8 w-12 mx-auto" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                ))}
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
  
  // 文档列表骨架
  const DocumentsSkeleton = () => (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* 文件名和状态 */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
                
                {/* 统计信息 */}
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
        ))}
      </div>
    </ScrollArea>
  );

  if (knowledgeBasesLoading) {
    return <KnowledgeBaseSkeleton />;
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

  const totalDocuments = Object.values(knowledgeBaseStats).reduce((total, stats) => total + stats.documentCount, 0);

  return (
    <div className="space-y-4">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between py-2 px-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">智能知识库</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {statsLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <span>{totalDocuments} 个文档</span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              自动同步
            </span>
          </div>
        </div>
        
        {knowledgeBases.length > 0 && (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            知识库设置
          </Button>
        )}
      </div>

      {knowledgeBases.length === 0 ? (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">项目知识库</h3>
          <p className="text-muted-foreground mb-4">
            上传项目文档后将自动创建知识库，支持AI智能问答
          </p>
          <p className="text-sm text-muted-foreground">
            💡 提示：前往"文档分析"页面上传文档即可开始使用
          </p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="text-sm">概览统计</TabsTrigger>
            <TabsTrigger value="documents" className="text-sm">文档列表</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              {knowledgeBases.map((kb) => (
                <Card key={kb.id} className="border border-muted">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{kb.name}</CardTitle>
                        {kb.description && (
                          <CardDescription className="text-sm mt-1">
                            {kb.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {kb.indexingTechnique === 'high_quality' ? '高质量' : '经济型'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-12 mx-auto mb-2" />
                        ) : (
                          <div className="text-2xl font-bold text-blue-600">
                            {knowledgeBaseStats[kb.difyDatasetId]?.documentCount || 0}
                          </div>
                        )}
                        <div className="text-muted-foreground">文档数量</div>
                      </div>
                      <div className="text-center">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-12 mx-auto mb-2" />
                        ) : (
                          <div className="text-2xl font-bold text-green-600">
                            {knowledgeBaseStats[kb.difyDatasetId]?.wordCount || 0}
                          </div>
                        )}
                        <div className="text-muted-foreground">字数统计</div>
                      </div>
                      <div className="text-center">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-12 mx-auto mb-2" />
                        ) : (
                          <div className="text-2xl font-bold text-purple-600">
                            {knowledgeBaseStats[kb.difyDatasetId]?.appCount || 0}
                          </div>
                        )}
                        <div className="text-muted-foreground">应用数量</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
            </div>
          </TabsContent>
          
          <TabsContent value="documents" className="mt-4">
            {documentsLoading ? (
              <DocumentsSkeleton />
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">暂无文档</h3>
                <p className="text-muted-foreground">
                  知识库中还没有文档，上传项目文档后即可在此查看
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {documents.map((doc, index) => {
                    const isSyncing = syncingFiles.has(doc.name);
                    return (
                      <Card 
                        key={doc.id || index} 
                        className={`transition-all duration-300 ${
                          isSyncing 
                            ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                            : 'hover:shadow-sm'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {isSyncing ? (
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                    <span className="font-medium text-sm">{doc.name}</span>
                                    <Badge variant="default" className="bg-blue-600 text-xs animate-pulse">
                                      同步中...
                                    </Badge>
                                  </div>
                                ) : (
                                  <>
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">{doc.name}</span>
                                    <Badge variant={doc.enabled ? "default" : "secondary"} className="text-xs">
                                      {doc.enabled ? "已启用" : "已禁用"}
                                    </Badge>
                                  </>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">创建:</span> 
                                  <span>{new Date(doc.created_at * 1000).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">字数:</span> 
                                  <span>{doc.word_count?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Token:</span> 
                                  <span>{doc.tokens?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">访问:</span> 
                                  <span>{doc.hit_count || 0} 次</span>
                                </div>
                              </div>
                              
                              {doc.error && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                                  <span className="font-medium">错误:</span> {doc.error}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}