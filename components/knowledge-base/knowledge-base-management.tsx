'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Brain, Settings, Trash2, FileText, MessageSquare, Upload, Search, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { KnowledgeBase } from '@/lib/db/schema';
import { createKnowledgeBase, getKnowledgeBasesByAuditUnit, deleteKnowledgeBase, getKnowledgeBaseStats, getDifyDocuments } from '@/lib/actions/knowledge-base-actions';
import { useChatBot } from './chat-bot-provider';

interface KnowledgeBaseManagementProps {
  auditUnitId: string;
  auditUnitName: string;
}

interface CreateKnowledgeBaseForm {
  name: string;
  description: string;
  indexingTechnique: 'high_quality' | 'economy';
  permission: 'only_me' | 'all_team_members' | 'partial_members';
}

export function KnowledgeBaseManagement({ auditUnitId, auditUnitName }: KnowledgeBaseManagementProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<Record<string, { documentCount: number; wordCount: number; appCount: number }>>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [syncingFiles, setSyncingFiles] = useState<Set<string>>(new Set()); // 跟踪正在同步的文档
  const { showChatBot, hideChatBot } = useChatBot();
  
  const [createForm, setCreateForm] = useState<CreateKnowledgeBaseForm>({
    name: '',
    description: '',
    indexingTechnique: 'high_quality',
    permission: 'only_me'
  });

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

  // 静默加载文档列表（不触发loading UI）
  const silentLoadDocuments = async (difyDatasetId: string) => {
    try {
      const result = await getDifyDocuments(difyDatasetId, 1, 50);
      if (result.success) {
        setDocuments(result.documents || []);
      } else {
        console.error('Failed to load documents:', result.error);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
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
        
        // 如果有知识库且没有选中的，自动选中第一个（通常是默认知识库）
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

  // 轻量级更新统计信息和文档列表
  const lightweightUpdate = async () => {
    if (knowledgeBases.length > 0) {
      // 只更新统计信息，不触发loading状态
      await loadKnowledgeBaseStats(knowledgeBases);
      
      // 如果有选中的知识库，静默重新加载文档列表
      if (selectedKnowledgeBase) {
        await silentLoadDocuments(selectedKnowledgeBase.difyDatasetId);
      }
    }
  };

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
      
      // 只有当事件来自当前项目时才更新
      if (eventProjectId === auditUnitId) {
        console.log(`Knowledge base updated: ${action} - ${fileName}`);
        
        // 移除同步loading状态
        setSyncingFiles(prev => {
          const updated = new Set(prev);
          updated.delete(fileName);
          return updated;
        });
        
        // 立即更新UI统计数字
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
        
        // 静默重新加载文档列表以获取最新状态（不触发loading UI）
        if (selectedKnowledgeBase) {
          silentLoadDocuments(selectedKnowledgeBase.difyDatasetId);
        }
      }
    };

    // 添加事件监听器
    window.addEventListener('knowledgeBaseSyncStart', handleSyncStart as EventListener);
    window.addEventListener('knowledgeBaseSyncError', handleSyncError as EventListener);
    window.addEventListener('knowledgeBaseUpdated', handleKnowledgeBaseUpdate as EventListener);

    // 清理函数
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
    // 移除hideChatBot调用，避免无限循环
  }, [knowledgeBases.length, auditUnitName]); // 移除函数依赖

  // 创建知识库
  const handleCreateKnowledgeBase = async () => {
    if (!createForm.name.trim()) {
      toast.error('请输入知识库名称');
      return;
    }

    try {
      setCreating(true);
      
      const formData = new FormData();
      formData.append('auditUnitId', auditUnitId);
      formData.append('name', createForm.name);
      formData.append('description', createForm.description || '');
      formData.append('indexingTechnique', createForm.indexingTechnique);
      formData.append('permission', createForm.permission);
      
      const result = await createKnowledgeBase({}, formData);

      if (result.success) {
        toast.success('知识库创建成功');
        setCreateDialogOpen(false);
        setCreateForm({
          name: '',
          description: '',
          indexingTechnique: 'high_quality',
          permission: 'only_me'
        });
        await loadKnowledgeBases();
      } else {
        toast.error(result.error || '创建知识库失败');
      }
    } catch (error) {
      toast.error('创建知识库失败');
      console.error('Error creating knowledge base:', error);
    } finally {
      setCreating(false);
    }
  };

  // 删除知识库
  const handleDeleteKnowledgeBase = async (id: string, name: string) => {
    try {
      const result = await deleteKnowledgeBase(id);
      if (result.success) {
        toast.success(`知识库 "${name}" 删除成功`);
        await loadKnowledgeBases();
      } else {
        toast.error(result.error || '删除知识库失败');
      }
    } catch (error) {
      toast.error('删除知识库失败');
      console.error('Error deleting knowledge base:', error);
    }
  };

  const getIndexingTechniqueBadge = (technique: string) => {
    return technique === 'high_quality' ? (
      <Badge variant="default">高质量</Badge>
    ) : (
      <Badge variant="secondary">经济型</Badge>
    );
  };

  const getPermissionBadge = (permission: string) => {
    const variants = {
      'only_me': { variant: 'outline' as const, text: '仅自己' },
      'all_team_members': { variant: 'default' as const, text: '团队成员' },
      'partial_members': { variant: 'secondary' as const, text: '部分成员' }
    };
    
    const config = variants[permission as keyof typeof variants] || variants.only_me;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            知识库管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              项目知识库
            </CardTitle>
            <CardDescription>
              "{auditUnitName}" 的文档知识库，所有上传的项目文档都会自动添加到知识库中
            </CardDescription>
          </div>
          {knowledgeBases.length > 0 && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  知识库设置
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>知识库设置</DialogTitle>
                <DialogDescription>
                  配置项目知识库的索引方法和权限设置。
                </DialogDescription>
              </DialogHeader>
              {selectedKnowledgeBase && (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">知识库名称</Label>
                    <Input
                      id="name"
                      value={selectedKnowledgeBase.name}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">描述</Label>
                    <Textarea
                      id="description"
                      value={selectedKnowledgeBase.description || ''}
                      disabled
                      className="bg-gray-50"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="indexing">索引方法</Label>
                    <Select value={selectedKnowledgeBase.indexingTechnique || 'high_quality'} disabled>
                      <SelectTrigger className="bg-gray-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high_quality">高质量（推荐）</SelectItem>
                        <SelectItem value="economy">经济型</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="permission">权限设置</Label>
                    <Select value={selectedKnowledgeBase.permission || 'only_me'} disabled>
                      <SelectTrigger className="bg-gray-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="only_me">仅自己</SelectItem>
                        <SelectItem value="all_team_members">所有团队成员</SelectItem>
                        <SelectItem value="partial_members">部分成员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      📊 <strong>统计信息</strong><br/>
                      创建时间：{new Date(selectedKnowledgeBase.createdAt!).toLocaleString()}<br/>
                      Dify数据集ID：{selectedKnowledgeBase.difyDatasetId}
                    </p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            知识库文档数量：{
              knowledgeBases.length > 0 
                ? Object.values(knowledgeBaseStats).reduce((total, stats) => total + stats.documentCount, 0) 
                : '0'
            }
            <span className="ml-2 text-xs text-green-600">●</span>
            <span className="ml-1 text-xs text-muted-foreground">自动同步</span>
          </p>
        </div>

        {knowledgeBases.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">项目知识库</h3>
            <p className="text-muted-foreground mb-4">
              上传项目文档后将自动创建知识库，支持AI智能问答
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <div className="text-green-600 mt-0.5">✅</div>
                  <div className="text-sm">
                    <p className="font-medium text-green-800 mb-1">数据集API密钥已配置</p>
                    <p className="text-green-700">
                      上传文档后将自动创建知识库并启用完整的问答功能
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              💡 提示：前往项目文档页面上传文档即可开始使用
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="documents">文档列表</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                {knowledgeBases.map((kb) => (
                  <Card key={kb.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{kb.name}</CardTitle>
                          {kb.description && (
                            <CardDescription className="mt-1">
                              {kb.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getIndexingTechniqueBadge(kb.indexingTechnique || 'high_quality')}
                          {getPermissionBadge(kb.permission || 'only_me')}
                          {knowledgeBases.length > 1 && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除知识库</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除知识库 "{kb.name}" 吗？此操作不可撤销，知识库中的所有文档和问答记录都将被删除。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteKnowledgeBase(kb.id, kb.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>文档: {knowledgeBaseStats[kb.difyDatasetId]?.documentCount || 0} 个</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>支持智能问答</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>创建时间: {new Date(kb.createdAt!).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-800 mb-1">智能问答助手已启用</p>
                            <p className="text-blue-700">
                              点击右下角的聊天机器人图标即可开始与知识库对话，随时获取项目文档相关的解答。
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium">知识库文档</h4>
                  <div className="text-sm text-muted-foreground">
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      自动同步
                    </span>
                  </div>
                </div>
                
                {documentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">加载文档列表...</p>
                    </div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">暂无文档</h3>
                    <p className="text-muted-foreground">
                      知识库中还没有文档，上传项目文档后即可在此查看。
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {documents.map((doc, index) => {
                      const isSyncing = syncingFiles.has(doc.name);
                      return (
                        <Card 
                          key={doc.id || index} 
                          className={`hover:shadow-sm transition-all duration-300 ${
                            isSyncing 
                              ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                              : ''
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
                                  <span className="font-medium">{doc.name}</span>
                                  {isSyncing && (
                                    <Badge variant="default" className="bg-blue-600">
                                      同步中...
                                    </Badge>
                                  )}
                                  <Badge variant={doc.enabled ? "default" : "secondary"}>
                                    {doc.enabled ? "已启用" : "已禁用"}
                                  </Badge>
                                  <Badge variant="outline">
                                    {doc.indexing_status === "completed" ? "已完成" : 
                                     doc.indexing_status === "indexing" ? "索引中" : 
                                     doc.indexing_status === "waiting" ? "等待中" : "未知"}
                                  </Badge>
                                </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">创建时间:</span> {new Date(doc.created_at * 1000).toLocaleString()}
                                </div>
                                <div>
                                  <span className="font-medium">字数:</span> {doc.word_count?.toLocaleString() || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Token数:</span> {doc.tokens?.toLocaleString() || 0}
                                </div>
                                <div>
                                  <span className="font-medium">访问次数:</span> {doc.hit_count || 0}
                                </div>
                              </div>
                              
                                  {doc.error && (
                                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
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
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}