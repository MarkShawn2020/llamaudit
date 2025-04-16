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

// 模拟项目数据
const MOCK_PROJECTS = {
  '1': {
    id: '1',
    name: '新能源科技有限公司',
    code: 'NE001',
    type: '国有企业',
    address: '北京市海淀区中关村大街1号',
    contact: '张三',
    phone: '010-12345678',
    email: 'contact@newenergy.com',
    description: '主要从事新能源技术研发和应用',
    createdAt: '2023-01-15',
    documentCount: 12,
    taskCount: 3
  },
  '2': {
    id: '2',
    name: '红星机械制造公司',
    code: 'RM002',
    type: '国有企业',
    address: '上海市浦东新区张江高科技园区',
    contact: '李四',
    phone: '021-87654321',
    email: 'contact@redstar.com',
    description: '专业从事机械设备制造和销售',
    createdAt: '2023-03-22',
    documentCount: 8,
    taskCount: 2
  },
  '3': {
    id: '3',
    name: '蓝天环保设备有限公司',
    code: 'BT003',
    type: '民营企业',
    address: '广州市天河区科技园',
    contact: '王五',
    phone: '020-55555555',
    email: 'contact@bluetech.com',
    description: '致力于环保设备的研发和生产',
    createdAt: '2023-05-10',
    documentCount: 15,
    taskCount: 4
  }
};

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    // 模拟从API获取项目数据
    setTimeout(() => {
      setProject(MOCK_PROJECTS[projectId as keyof typeof MOCK_PROJECTS] || {
        id: projectId,
        name: '未知项目',
        code: 'UNKNOWN',
        type: '未分类',
        address: '',
        contact: '',
        phone: '',
        email: '',
        description: '',
        createdAt: new Date().toISOString().split('T')[0],
        documentCount: 0,
        taskCount: 0
      });
      setLoading(false);
    }, 300);
  }, [projectId]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-lg">加载项目信息...</div>
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
          <ProjectInfo project={project} onUpdate={(updated) => setProject({...project, ...updated})} />
        </TabsContent>
        
        <TabsContent value="files" className="space-y-4">
          <ProjectFiles projectId={projectId} />
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
          <ProjectAnalysis projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 