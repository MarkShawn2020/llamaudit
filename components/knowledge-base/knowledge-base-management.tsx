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
import { Plus, Brain, Settings, Trash2, FileText, MessageSquare, Upload, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { KnowledgeBase } from '@/lib/db/schema';
import { createKnowledgeBase, getKnowledgeBasesByAuditUnit, deleteKnowledgeBase, getKnowledgeBaseStats } from '@/lib/actions/knowledge-base-actions';
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
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
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

  // 监听知识库更新事件
  useEffect(() => {
    const handleKnowledgeBaseUpdate = (event: CustomEvent) => {
      const { projectId: eventProjectId, action, fileName } = event.detail;
      
      // 只有当事件来自当前项目时才更新
      if (eventProjectId === auditUnitId) {
        console.log(`Knowledge base updated: ${action} - ${fileName}`);
        
        // 自动重新加载知识库数据
        loadKnowledgeBases();
        
        // 显示提示信息
        if (action === 'fileAdded') {
          toast.success(`文档 "${fileName}" 已添加到知识库`);
        } else if (action === 'fileRemoved') {
          toast.success(`文档 "${fileName}" 已从知识库中移除`);
        }
      }
    };

    // 添加事件监听器
    window.addEventListener('knowledgeBaseUpdated', handleKnowledgeBaseUpdate as EventListener);

    // 清理函数
    return () => {
      window.removeEventListener('knowledgeBaseUpdated', handleKnowledgeBaseUpdate as EventListener);
    };
  }, [auditUnitId, loadKnowledgeBases]);

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
        )}
      </CardContent>
    </Card>
  );
}