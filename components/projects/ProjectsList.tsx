'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building, BarChart, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getProjects, createProject, type Project } from '@/lib/actions/project-actions';

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', code: '', type: '' });
  const router = useRouter();

  useEffect(() => {
    // 初始加载项目列表
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('加载项目列表失败:', error);
      toast.error('加载项目列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async () => {
    try {
      // 创建新项目
      const projectData = {
        name: newProject.name,
        code: newProject.code,
        type: newProject.type,
        address: '',
        contact: '',
        phone: '',
        email: '',
        description: ''
      };
      
      const createdProject = await createProject(projectData);
      
      // 更新项目列表
      setProjects(prev => [...prev, createdProject]);
      
      // 重置表单
      setNewProject({ name: '', code: '', type: '' });
      setOpen(false);
      
      // 提示成功
      toast.success('创建项目成功');
      
      // 跳转到新项目详情页
      router.push(`/projects/${createdProject.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目失败，请重试';
      console.error('创建项目失败:', error);
      toast.error(errorMessage);
    }
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
              <Button 
                onClick={handleAddProject} 
                disabled={!newProject.name || !newProject.code || !newProject.type || loading}
              >
                确认添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        // 加载中状态
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-lg">加载项目列表...</div>
        </div>
      ) : projects.length === 0 ? (
        // 空状态
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700">暂无被审计单位</h3>
          <p className="text-sm text-gray-500 mt-1">点击"添加被审计单位"按钮创建</p>
        </div>
      ) : (
        // 项目列表
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
      )}
    </div>
  );
} 