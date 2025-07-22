'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Project, updateProject } from '@/lib/api/project-api';
import { toast } from 'sonner';
import { Building2, Hash, MapPin, User, Phone, Mail, FileText, Calendar, Badge as BadgeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      <CardContent className="space-y-6">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息组 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">基本信息</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <BadgeIcon className="h-3 w-3" />
                    单位名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    required 
                    className="font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code" className="flex items-center gap-2">
                    <Hash className="h-3 w-3" />
                    单位代码 <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="code" 
                    name="code" 
                    value={formData.code} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type" className="flex items-center gap-2">
                    <Building2 className="h-3 w-3" />
                    单位类型 <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="type" 
                    name="type" 
                    value={formData.type} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    地址
                  </Label>
                  <Input 
                    id="address" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>
            </div>

            {/* 联系信息组 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">联系信息</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact" className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    联系人
                  </Label>
                  <Input 
                    id="contact" 
                    name="contact" 
                    value={formData.contact} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    电话
                  </Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    邮箱
                  </Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>
            </div>

            {/* 描述信息组 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">详细描述</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">项目描述</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  rows={4} 
                  placeholder="请输入项目的详细描述..."
                />
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* 基本信息组 - 查看模式 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">基本信息</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BadgeIcon className="h-3 w-3" />
                    单位名称
                  </div>
                  <div className="text-lg font-semibold">{project.name}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    单位代码
                  </div>
                  <div className="text-base font-mono">{project.code}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    单位类型
                  </div>
                  <Badge variant="secondary" className="w-fit">{project.type}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    地址
                  </div>
                  <div className="text-sm text-muted-foreground">{project.address || <span className="italic text-muted-foreground/60">未填写</span>}</div>
                </div>
              </div>
            </div>

            {/* 联系信息组 - 查看模式 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">联系信息</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-3 w-3" />
                    联系人
                  </div>
                  <div className="text-sm">{project.contact || <span className="italic text-muted-foreground/60">未填写</span>}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    电话
                  </div>
                  <div className="text-sm font-mono">{project.phone || <span className="italic text-muted-foreground/60">未填写</span>}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    邮箱
                  </div>
                  <div className="text-sm font-mono">{project.email || <span className="italic text-muted-foreground/60">未填写</span>}</div>
                </div>
              </div>
            </div>

            {/* 描述信息组 - 查看模式 */}
            {project.description && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground">项目描述</h3>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground bg-muted/20 rounded-lg p-4">
                  {project.description}
                </div>
              </div>
            )}

            {/* 创建信息 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">创建信息</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">创建时间</div>
                  <div className="text-sm text-muted-foreground">{project.createdAt}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">最后更新</div>
                  <div className="text-sm text-muted-foreground">{project.updatedAt}</div>
                </div>
              </div>
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