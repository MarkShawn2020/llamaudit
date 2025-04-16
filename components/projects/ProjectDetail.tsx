'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, FileText, BarChart3, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import ProjectInfo from './ProjectInfo';
import ProjectAnalysis from './ProjectAnalysis';
import { Project, getProject, deleteProject } from '@/lib/api/project-api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 加载项目详情
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProject(projectId);
      
      if (!data) {
        setError('项目不存在');
        toast.error('无法找到该项目');
        return;
      }
      
      setProject(data);
    } catch (error) {
      console.error('加载项目详情失败:', error);
      setError('加载项目详情失败');
      toast.error('加载项目详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdate = (updated: Partial<Project>) => {
    if (!project) return;
    setProject({ ...project, ...updated });
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    
    try {
      setDeleteLoading(true);
      const success = await deleteProject(project.id);
      
      if (success) {
        toast.success('项目已成功删除');
        router.push('/projects');
      } else {
        toast.error('删除项目失败');
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      toast.error('删除项目失败，请重试');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-lg">加载项目信息...</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium text-red-600">{error || '项目不存在'}</h3>
          <p className="text-sm text-gray-500 mt-1">请返回项目列表查看其他项目</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/projects">返回项目列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            {project.name}
          </h1>
        </div>
        <Button 
          variant="destructive" 
          size="sm" 
          className="gap-1"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <TrashIcon className="h-4 w-4" />
          删除项目
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">项目概览</CardTitle>
          <CardDescription>单位代码: {project.code}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">单位类型</div>
            <div>{project.type}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">文档数量</div>
            <div>{project.documentCount}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">分析任务</div>
            <div>{project.taskCount}</div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <Building className="h-4 w-4" />
            <span>基本信息</span>
          </TabsTrigger>

          <TabsTrigger value="analysis" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span>分析任务</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="space-y-4">
          <ProjectInfo project={project} onUpdate={handleProjectUpdate} />
        </TabsContent>
        
        
        <TabsContent value="analysis" className="space-y-4">
          <ProjectAnalysis projectId={projectId} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除项目"{project.name}"吗？此操作将删除所有相关数据，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject} 
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 