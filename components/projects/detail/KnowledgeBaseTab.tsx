'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, FileText, MessageSquare, RefreshCw, Loader2, Settings, Database } from 'lucide-react';
import { toast } from 'sonner';
import { KnowledgeBase } from '@/lib/db/schema';
import { getKnowledgeBasesByAuditUnit, getKnowledgeBaseStats, getDifyDocuments } from '@/lib/actions/knowledge-base-actions';
import { useChatBot } from '@/components/knowledge-base/chat-bot-provider';

interface KnowledgeBaseTabProps {
  auditUnitId: string;
  auditUnitName: string;
}

export function KnowledgeBaseTab({ auditUnitId, auditUnitName }: KnowledgeBaseTabProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<Record<string, { documentCount: number; wordCount: number; appCount: number }>>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [syncingFiles, setSyncingFiles] = useState<Set<string>>(new Set());
  const { showChatBot } = useChatBot();

  // 加载知识库统计信息
  const loadKnowledgeBaseStats = async (knowledgeBases: KnowledgeBase[]) => {
    const statsPromises = knowledgeBases.map(async (kb) => {
      try {
        const result = await getKnowledgeBaseStats(kb.difyDatasetId);
        return { 
          id: kb.difyDatasetId, 
          stats: result.success ? result.data : { documentCount: 0, wordCount: 0, appCount: 0 }
        };
      } catch (error) {
        console.error(`Error loading stats for knowledge base ${kb.id}:`, error);
        return { 
          id: kb.difyDatasetId, 
          stats: { documentCount: 0, wordCount: 0, appCount: 0 }
        };
      }
    });

    const statsResults = await Promise.all(statsPromises);
    const statsMap = statsResults.reduce((acc, { id, stats }) => {
      acc[id] = stats;
      return acc;
    }, {} as Record<string, { documentCount: number; wordCount: number; appCount: number }>);
    
    setKnowledgeBaseStats(statsMap);
  };

  // 加载文档列表
  const loadDocuments = async (difyDatasetId: string) => {
    try {
      setDocumentsLoading(true);
      const result = await getDifyDocuments(difyDatasetId, 1, 50);
      if (result.success) {
        setDocuments(result.documents || []);
      } else {
        console.error('Failed to load documents:', result.error);
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const result = await getKnowledgeBasesByAuditUnit(auditUnitId);
      if (result.success) {
        const kbList = result.data || [];
        setKnowledgeBases(kbList);
        
        // 加载统计信息
        await loadKnowledgeBaseStats(kbList);
        
        // 如果有知识库且没有选中的，自动选中第一个
        if (kbList.length > 0 && !selectedKnowledgeBase) {
          setSelectedKnowledgeBase(kbList[0]);
          // 自动加载第一个知识库的文档
          await loadDocuments(kbList[0].difyDatasetId);
        }
      } else {
        toast.error(result.error || '加载知识库列表失败');
      }
    } catch (error) {
      toast.error('加载知识库列表失败');
      console.error('Error loading knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeBases();
  }, [auditUnitId]);

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
      const { projectId: eventProjectId, action, fileName } = event.detail;
      
      if (eventProjectId === auditUnitId) {
        console.log(`Knowledge base updated: ${action} - ${fileName}`);
        
        setSyncingFiles(prev => {
          const updated = new Set(prev);
          updated.delete(fileName);
          return updated;
        });
        
        // 更新统计数字
        if (action === 'fileAdded') {
          setKnowledgeBaseStats(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(datasetId => {
              updated[datasetId] = {
                ...updated[datasetId],
                documentCount: (updated[datasetId]?.documentCount || 0) + 1
              };
            });
            return updated;
          });
        } else if (action === 'fileRemoved') {
          setKnowledgeBaseStats(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(datasetId => {
              updated[datasetId] = {
                ...updated[datasetId],
                documentCount: Math.max((updated[datasetId]?.documentCount || 0) - 1, 0)
              };
            });
            return updated;
          });
        }
        
        // 静默重新加载文档列表
        if (selectedKnowledgeBase) {
          loadDocuments(selectedKnowledgeBase.difyDatasetId);
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
  }, [auditUnitId, selectedKnowledgeBase]);

  // 自动显示聊天机器人
  useEffect(() => {
    if (knowledgeBases.length > 0 && knowledgeBases[0]) {
      const primaryKnowledgeBase = knowledgeBases[0];
      showChatBot(
        primaryKnowledgeBase.id, 
        primaryKnowledgeBase.name, 
        auditUnitName
      );
    }
  }, [knowledgeBases.length, auditUnitName]);

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground"/>
          <p className="text-sm text-muted-foreground">加载知识库...</p>
        </div>
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
            <span>{totalDocuments} 个文档</span>
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
                        <div className="text-2xl font-bold text-blue-600">
                          {knowledgeBaseStats[kb.difyDatasetId]?.documentCount || 0}
                        </div>
                        <div className="text-muted-foreground">文档数量</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {knowledgeBaseStats[kb.difyDatasetId]?.wordCount || 0}
                        </div>
                        <div className="text-muted-foreground">字数统计</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {knowledgeBaseStats[kb.difyDatasetId]?.appCount || 0}
                        </div>
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
              <div className="h-32 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">加载文档列表...</p>
                </div>
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
                                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">{doc.name}</span>
                                {isSyncing && (
                                  <Badge variant="default" className="bg-blue-600 text-xs">
                                    同步中...
                                  </Badge>
                                )}
                                <Badge variant={doc.enabled ? "default" : "secondary"} className="text-xs">
                                  {doc.enabled ? "已启用" : "已禁用"}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                <div>
                                  <span className="font-medium">创建:</span> {new Date(doc.created_at * 1000).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="font-medium">字数:</span> {doc.word_count?.toLocaleString() || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Token:</span> {doc.tokens?.toLocaleString() || 0}
                                </div>
                                <div>
                                  <span className="font-medium">访问:</span> {doc.hit_count || 0} 次
                                </div>
                              </div>
                              
                              {doc.error && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                                  错误: {doc.error}
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