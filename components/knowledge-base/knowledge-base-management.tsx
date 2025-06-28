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
import { Plus, Brain, Settings, Trash2, FileText, MessageSquare, Upload, Search } from 'lucide-react';
import { toast } from 'sonner';
import { KnowledgeBase } from '@/lib/db/schema';
import { createKnowledgeBase, getKnowledgeBasesByAuditUnit, deleteKnowledgeBase } from '@/lib/actions/knowledge-base-actions';

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
              知识库管理
            </CardTitle>
            <CardDescription>
              为 "{auditUnitName}" 管理知识库，支持智能问答和文档检索
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建知识库
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>创建新知识库</DialogTitle>
                <DialogDescription>
                  创建一个新的知识库来组织和管理文档，支持智能问答功能。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">知识库名称</Label>
                  <Input
                    id="name"
                    placeholder="输入知识库名称"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    placeholder="描述知识库的用途和内容（可选）"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="indexing">索引方法</Label>
                  <Select 
                    value={createForm.indexingTechnique} 
                    onValueChange={(value: 'high_quality' | 'economy') => 
                      setCreateForm(prev => ({ ...prev, indexingTechnique: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择索引方法" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_quality">高质量（推荐）</SelectItem>
                      <SelectItem value="economy">经济型</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="permission">权限设置</Label>
                  <Select 
                    value={createForm.permission} 
                    onValueChange={(value: 'only_me' | 'all_team_members' | 'partial_members') => 
                      setCreateForm(prev => ({ ...prev, permission: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择权限范围" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="only_me">仅自己</SelectItem>
                      <SelectItem value="all_team_members">所有团队成员</SelectItem>
                      <SelectItem value="partial_members">部分成员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateKnowledgeBase} disabled={creating}>
                  {creating ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {knowledgeBases.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">还没有知识库</h3>
            <p className="text-muted-foreground mb-4">
              创建第一个知识库来开始组织您的文档并启用智能问答功能
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建知识库
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
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
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>文档数: 待实现</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>问答次数: 待实现</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>创建时间: {new Date(kb.createdAt!).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      上传文档
                    </Button>
                    <Button size="sm" variant="outline">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}