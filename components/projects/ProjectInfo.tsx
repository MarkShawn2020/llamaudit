'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ProjectData {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  description: string;
  createdAt: string;
  documentCount: number;
  taskCount: number;
}

interface ProjectInfoProps {
  project: ProjectData;
  onUpdate: (updated: Partial<ProjectData>) => void;
}

export default function ProjectInfo({ project, onUpdate }: ProjectInfoProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<ProjectData>(project);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 这里应该是实际的API调用
    setTimeout(() => {
      onUpdate(formData);
      setEditing(false);
      toast.success('项目信息已更新');
    }, 500);
  };

  const handleCancel = () => {
    setFormData(project);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>被审计单位信息</span>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>编辑信息</Button>
          ) : null}
        </CardTitle>
        <CardDescription>
          详细的单位基本信息
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">单位名称</div>
                <div className="mt-1">{project.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">单位代码</div>
                <div className="mt-1">{project.code}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">单位类型</div>
                <div className="mt-1">{project.type}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">地址</div>
                <div className="mt-1">{project.address || '未设置'}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">联系人</div>
                <div className="mt-1">{project.contact || '未设置'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">联系电话</div>
                <div className="mt-1">{project.phone || '未设置'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">电子邮箱</div>
                <div className="mt-1">{project.email || '未设置'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">单位简介</div>
                <div className="mt-1">{project.description || '未设置'}</div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">单位名称</Label>
                  <Input 
                    id="name" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="code">单位代码</Label>
                  <Input 
                    id="code" 
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="type">单位类型</Label>
                  <Input 
                    id="type" 
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="address">地址</Label>
                  <Input 
                    id="address" 
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contact">联系人</Label>
                  <Input 
                    id="contact" 
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">联系电话</Label>
                  <Input 
                    id="phone" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">电子邮箱</Label>
                  <Input 
                    id="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">单位简介</Label>
                  <Textarea 
                    id="description" 
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6 space-x-2">
              <Button type="button" variant="outline" onClick={handleCancel}>取消</Button>
              <Button type="submit">保存更改</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
} 