'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, FileText, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import ProjectInfo from './ProjectInfo';
import ProjectFiles from './ProjectFiles';
import ProjectAnalysis from './ProjectAnalysis';
import { Project, getProject } from '@/lib/api/project-api';
import { toast } from 'sonner';

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');

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
      <div className="flex items-center gap-2">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building className="h-6 w-6 text-primary" />
          {project.name}
        </h1>
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
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <Building className="h-4 w-4" />
            <span>基本信息</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span>文件列表</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span>分析任务</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="space-y-4">
          <ProjectInfo project={project} onUpdate={handleProjectUpdate} />
        </TabsContent>
        
        <TabsContent value="files" className="space-y-4">
          <ProjectFiles project={project} onUpdate={loadProject} />
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
          <ProjectAnalysis projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 