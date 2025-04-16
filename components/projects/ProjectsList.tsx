'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building, BarChart, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 模拟项目数据
const MOCK_PROJECTS = [
  {
    id: '1',
    name: '新能源科技有限公司',
    code: 'NE001',
    type: '国有企业',
    createdAt: '2023-01-15',
    documentCount: 12,
    taskCount: 3
  },
  {
    id: '2',
    name: '红星机械制造公司',
    code: 'RM002',
    type: '国有企业',
    createdAt: '2023-03-22',
    documentCount: 8,
    taskCount: 2
  },
  {
    id: '3',
    name: '蓝天环保设备有限公司',
    code: 'BT003',
    type: '民营企业',
    createdAt: '2023-05-10',
    documentCount: 15,
    taskCount: 4
  }
];

export default function ProjectsList() {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [open, setOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', code: '', type: '' });
  const router = useRouter();

  const handleAddProject = () => {
    // 这里应该是实际的API调用
    const id = Math.random().toString(36).substring(2, 9);
    const newProjectData = {
      ...newProject,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      documentCount: 0,
      taskCount: 0
    };
    
    setProjects([...projects, newProjectData]);
    setNewProject({ name: '', code: '', type: '' });
    setOpen(false);
    
    // 添加完成后跳转到新项目详情页
    router.push(`/projects/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">被审计单位列表</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              添加被审计单位
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加被审计单位</DialogTitle>
              <DialogDescription>
                请填写被审计单位的基本信息。添加后可以上传相关文件并进行分析。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">单位名称</Label>
                <Input 
                  id="name" 
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder="例如：新能源科技有限公司"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">单位代码</Label>
                <Input 
                  id="code" 
                  value={newProject.code}
                  onChange={(e) => setNewProject({...newProject, code: e.target.value})}
                  placeholder="例如：NE001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">单位类型</Label>
                <Input 
                  id="type" 
                  value={newProject.type}
                  onChange={(e) => setNewProject({...newProject, type: e.target.value})}
                  placeholder="例如：国有企业/民营企业"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button onClick={handleAddProject} disabled={!newProject.name || !newProject.code}>确认添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  {project.name}
                </CardTitle>
                <CardDescription>代码: {project.code}</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-sm">
                  <p>类型: {project.type}</p>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>创建于 {project.createdAt}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between text-sm border-t pt-4">
                <div>文档: {project.documentCount}</div>
                <div className="flex items-center gap-1">
                  <BarChart className="h-3.5 w-3.5" />
                  <span>任务: {project.taskCount}</span>
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 