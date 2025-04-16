'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Project, updateProject } from '@/lib/api/project-api';
import { toast } from 'sonner';

interface ProjectInfoProps {
  project: Project;
  onUpdate: (updatedProject: Partial<Project>) => void;
}

export default function ProjectInfo({ project, onUpdate }: ProjectInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Project>>({
    name: project.name,
    code: project.code,
    type: project.type,
    address: project.address,
    contact: project.contact,
    phone: project.phone,
    email: project.email,
    description: project.description,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await updateProject(project.id, formData);
      onUpdate(formData);
      setIsEditing(false);
      toast.success('项目信息已更新');
    } catch (error) {
      console.error('更新项目失败:', error);
      toast.error('更新项目信息失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>基本信息</CardTitle>
        <CardDescription>查看和编辑被审计单位的详细信息</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">单位名称</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">单位代码</Label>
                <Input 
                  id="code" 
                  name="code" 
                  value={formData.code} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">单位类型</Label>
                <Input 
                  id="type" 
                  name="type" 
                  value={formData.type} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Input 
                  id="address" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">联系人</Label>
                <Input 
                  id="contact" 
                  name="contact" 
                  value={formData.contact} 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">电话</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                rows={4} 
              />
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">单位名称</h4>
              <p>{project.name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">单位代码</h4>
              <p>{project.code}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">单位类型</h4>
              <p>{project.type}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">地址</h4>
              <p>{project.address || '未提供'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">联系人</h4>
              <p>{project.contact || '未提供'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">电话</h4>
              <p>{project.phone || '未提供'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">邮箱</h4>
              <p>{project.email || '未提供'}</p>
            </div>
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground">描述</h4>
              <p className="whitespace-pre-line">{project.description || '未提供'}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isEditing ? (
          <div className="flex gap-2">
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
              取消
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            编辑信息
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 