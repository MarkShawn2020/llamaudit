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
import { createKnowledgeBase, getKnowledgeBasesByAuditUnit, deleteKnowledgeBase } from '@/lib/actions/knowledge-base-actions';
import { KnowledgeBaseQA } from './knowledge-base-qa';

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
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  
  const [createForm, setCreateForm] = useState<CreateKnowledgeBaseForm>({
    name: '',
    description: '',
    indexingTechnique: 'high_quality',
    permission: 'only_me'
  });

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const result = await getKnowledgeBasesByAuditUnit(auditUnitId);
      if (result.success) {
        setKnowledgeBases(result.data || []);
        // 如果有知识库且没有选中的，自动选中第一个（通常是默认知识库）
        if (result.data && result.data.length > 0 && !selectedKnowledgeBase) {
          setSelectedKnowledgeBase(result.data[0]);
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

  // 创建知识库
  const handleCreateKnowledgeBase = async () => {
    if (!createForm.name.trim()) {
      toast.error('请输入知识库名称');
      return;
    }

    try {
      setCreating(true);
      const result = await createKnowledgeBase({
        auditUnitId,
        ...createForm
      });

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
            知识库文档数量：{knowledgeBases.length > 0 ? '查看概览获取详情' : '0'}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadKnowledgeBases}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
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
              <TabsTrigger value="overview">知识库概览</TabsTrigger>
              <TabsTrigger value="qa">智能问答</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {knowledgeBases.map((kb) => (
                <Card key={kb.id} className={`hover:shadow-md transition-shadow ${selectedKnowledgeBase?.id === kb.id ? 'ring-2 ring-primary' : ''}`}>
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>项目文档: 自动同步</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>支持智能问答</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>创建时间: {new Date(kb.createdAt!).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant={selectedKnowledgeBase?.id === kb.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedKnowledgeBase(kb);
                          setActiveTab('qa');
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        开始问答
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        设置
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="qa">
              {selectedKnowledgeBase ? (
                <KnowledgeBaseQA 
                  knowledgeBaseId={selectedKnowledgeBase.id}
                  knowledgeBaseName={selectedKnowledgeBase.name}
                />
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">请选择知识库</h3>
                  <p className="text-muted-foreground">
                    请先在"知识库概览"中选择一个知识库开始问答
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}