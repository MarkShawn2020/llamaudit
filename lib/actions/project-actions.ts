'use server';

import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { auditUnits, files, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export interface Project {
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
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
  documentCount: number;
  taskCount: number;
  status: 'active' | 'completed' | 'on-hold';
  files?: ProjectFile[];
}

export interface ProjectFile {
  id: string;
  filename: string;
  size: number;
  url: string;
  createdAt: string;
  type: string;
  isAnalyzed?: boolean;
  metadata?: string;
}

/**
 * 获取项目列表
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const user = await getUser();
    
    if (!user) {
      throw new Error('未授权访问');
    }

    // 获取所有项目（被审计单位）
    const projects = await db.query.auditUnits.findMany({
      orderBy: (auditUnits, { desc }) => [desc(auditUnits.createdAt)],
      columns: {
        id: true,
        code: true,
        name: true,
        type: true,
        address: true,
        contactPerson: true,
        phone: true,
        email: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true
      }
    });
    
    // 获取每个项目的文件数量
    const projectFiles = await db.query.files.findMany({
      columns: {
        auditUnitId: true
      }
    });

    // 计算每个项目的文件数量
    const projectDocumentCounts = projectFiles.reduce<Record<string, number>>((acc, file) => {
      if (file.auditUnitId) {
        acc[file.auditUnitId] = (acc[file.auditUnitId] || 0) + 1;
      }
      return acc;
    }, {});
    
    // 格式化响应
    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      code: project.code,
      type: project.type,
      address: project.address || '',
      contact: project.contactPerson || '',
      phone: project.phone || '',
      email: project.email || '',
      description: project.description || '',
      createdAt: project.createdAt?.toISOString().split('T')[0] || '',
      updatedAt: project.updatedAt?.toISOString().split('T')[0] || '',
      createdBy: project.createdBy || '',
      createdByName: '', // 后续可以增加分项查询创建者名称
      documentCount: projectDocumentCounts[project.id] || 0,
      taskCount: 0, // 后续可从任务表中计算
      status: 'active' as const
    }));

    return formattedProjects;
  } catch (error) {
    console.error('获取项目列表失败:', error);
    throw error;
  }
}

/**
 * 获取项目详情
 * @param id 项目ID
 */
export async function getProject(id: string): Promise<Project | null> {
  try {
    const user = await getUser();
    
    if (!user) {
      throw new Error('未授权访问');
    }

    // 获取项目详情
    const project = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, id),
      columns: {
        id: true,
        code: true,
        name: true,
        type: true,
        address: true,
        contactPerson: true,
        phone: true,
        email: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true
      },
      with: {
        files: true
      }
    });
    
    // 获取创建者信息 (如果需要)
    let creatorName = '';
    if (project?.createdBy) {
      const creator = await db.query.users.findFirst({
        where: eq(users.id, project.createdBy),
        columns: {
          name: true
        }
      });
      creatorName = creator?.name || '';
    }

    if (!project) {
      return null;
    }

    const files = project.files as any[];

    // 格式化响应，统一命名规范
    const formattedProject = {
      id: project.id,
      name: project.name,
      code: project.code,
      type: project.type,
      address: project.address || '',
      contact: project.contactPerson || '', // 使用 contact 字段名
      phone: project.phone || '',
      email: project.email || '',
      description: project.description || '',
      createdAt: project.createdAt?.toISOString().split('T')[0] || '',
      updatedAt: project.updatedAt?.toISOString().split('T')[0] || '',
      createdBy: project.createdBy || '',
      createdByName: creatorName,
      documentCount: files.length || 0,
      taskCount: 0, // 后续可从任务表中计算
      status: 'active' as const,
      files: files.map((file: any) => ({
        id: file.id,
        filename: file.originalName,
        size: Number(file.fileSize),
        url: file.filePath,
        createdAt: file.uploadDate?.toISOString() || new Date().toISOString(),
        type: file.fileType,
        isAnalyzed: !!file.isAnalyzed,
        metadata: file.metadata || ''
      }))
    };

    return formattedProject;
  } catch (error) {
    console.error(`获取项目[${id}]详情失败1:`, error);
    throw error;
  }
}

/**
 * 创建新项目
 * @param projectData 项目数据
 */
export async function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'documentCount' | 'taskCount' | 'status' | 'updatedAt'>): Promise<Project> {
  try {
    const user = await getUser();
    
    if (!user) {
      throw new Error('未授权访问');
    }
    
    // 检查必填字段
    if (!projectData.name) {
      throw new Error('单位名称为必填项');
    }

    // 检查项目代码是否已存在（如果提供了代码）
    if (projectData.code) {
      const existingProject = await db.query.auditUnits.findFirst({
        where: eq(auditUnits.code, projectData.code)
      });

      if (existingProject) {
        throw new Error('项目代码已存在');
      }
    }

    // 生成唯一的单位代码（如果未提供）
    const unitCode = projectData.code || `AU-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    
    // 创建新项目，处理字段名称差异
    const newProject = await db.insert(auditUnits).values({
      name: projectData.name,
      code: unitCode, // 使用用户提供的代码或生成的唯一代码
      type: projectData.type || '', // 单位类型可选
      address: projectData.address || '',
      contactPerson: projectData.contact || '', // 接收前端的 contact 字段
      phone: projectData.phone || '',
      email: projectData.email || '',
      description: projectData.description || '',
      createdBy: user.id
    }).returning();

    if (!newProject[0]) {
      throw new Error('创建项目失败');
    }

    // 格式化响应，保持与前端一致的命名
    const createdProject = {
      id: newProject[0].id,
      name: newProject[0].name,
      code: newProject[0].code,
      type: newProject[0].type,
      address: newProject[0].address || '',
      contact: newProject[0].contactPerson || '', // 返回给前端时使用 contact
      phone: newProject[0].phone || '',
      email: newProject[0].email || '',
      description: newProject[0].description || '',
      createdAt: newProject[0].createdAt?.toISOString().split('T')[0] || '',
      updatedAt: newProject[0].updatedAt?.toISOString().split('T')[0] || '',
      documentCount: 0,
      taskCount: 0,
      status: 'active' as const
    };

    // 重新验证项目列表页和详情页
    revalidatePath('/projects');
    revalidatePath(`/projects/${createdProject.id}`);

    return createdProject;
  } catch (error) {
    console.error('创建项目失败:', error);
    throw error;
  }
}

/**
 * 更新项目信息
 * @param id 项目ID
 * @param projectData 项目更新数据
 */
export async function updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
  try {
    const user = await getUser();
    
    if (!user) {
      throw new Error('未授权访问');
    }
    
    // 检查项目是否存在
    const existingProject = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, id)
    });

    if (!existingProject) {
      throw new Error('项目不存在');
    }

    // 如果更新了code，检查是否有重复
    if (projectData.code && projectData.code !== existingProject.code) {
      const codeExists = await db.query.auditUnits.findFirst({
        where: eq(auditUnits.code, projectData.code)
      });

      if (codeExists) {
        throw new Error('项目代码已存在');
      }
    }

    // 更新项目信息，处理字段名差异
    const updateData: any = {};
    if (projectData.name) updateData.name = projectData.name;
    if (projectData.code) updateData.code = projectData.code;
    if (projectData.type) updateData.type = projectData.type;
    if (projectData.address !== undefined) updateData.address = projectData.address;
    if (projectData.contact !== undefined) updateData.contactPerson = projectData.contact; // 接收前端的 contact 字段
    if (projectData.phone !== undefined) updateData.phone = projectData.phone;
    if (projectData.email !== undefined) updateData.email = projectData.email;
    if (projectData.description !== undefined) updateData.description = projectData.description;
    updateData.updatedAt = new Date();

    const updatedProject = await db.update(auditUnits)
      .set(updateData)
      .where(eq(auditUnits.id, id))
      .returning();

    if (!updatedProject[0]) {
      throw new Error('更新项目失败');
    }

    // 获取项目文件
    const projectFiles = await db.query.files.findMany({
      where: eq(files.auditUnitId, id)
    });

    // 格式化响应，保持与前端一致的命名
    const formattedProject = {
      id: updatedProject[0].id,
      name: updatedProject[0].name,
      code: updatedProject[0].code,
      type: updatedProject[0].type,
      address: updatedProject[0].address || '',
      contact: updatedProject[0].contactPerson || '', // 返回 contact 字段
      phone: updatedProject[0].phone || '',
      email: updatedProject[0].email || '',
      description: updatedProject[0].description || '',
      createdAt: updatedProject[0].createdAt?.toISOString().split('T')[0] || '',
      updatedAt: updatedProject[0].updatedAt?.toISOString().split('T')[0] || '',
      documentCount: projectFiles.length,
      taskCount: 0,
      status: 'active' as const
    };

    // 重新验证项目列表页和详情页
    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);

    return formattedProject;
  } catch (error) {
    console.error(`更新项目[${id}]失败:`, error);
    throw error;
  }
}

/**
 * 删除项目
 * @param id 项目ID
 */
export async function deleteProject(id: string): Promise<boolean> {
  try {
    const user = await getUser();
    
    if (!user) {
      throw new Error('未授权访问');
    }
    
    // 检查项目是否存在
    const existingProject = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, id)
    });

    if (!existingProject) {
      throw new Error('项目不存在');
    }

    // 删除项目
    await db.delete(auditUnits).where(eq(auditUnits.id, id));

    // 重新验证项目列表页
    revalidatePath('/projects');

    return true;
  } catch (error) {
    console.error(`删除项目[${id}]失败:`, error);
    throw error;
  }
}

/**
 * 上传项目文件
 */
export async function uploadProjectFile(formData: FormData): Promise<{files: ProjectFile[]}> {
  try {
    const user = await getUser();
    
    if (!user) {
      throw new Error('未授权访问');
    }

    const projectId = formData.get('projectId') as string;

    if (!projectId) {
      throw new Error('项目ID不能为空');
    }

    // 检查项目是否存在
    const project = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId)
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    const response = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '上传文件失败');
    }

    const result = await response.json();

    // 重新验证项目详情页
    revalidatePath(`/projects/${projectId}`);

    return result;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
}

/**
 * 删除项目文件
 */
export async function deleteProjectFile(projectId: string, fileId: string): Promise<void> {
  try {
    const user = await getUser();
    
    if (!user) {
      throw new Error('未授权访问');
    }

    // 检查项目是否存在
    const project = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId)
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '删除文件失败');
    }

    // 重新验证项目详情页
    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    console.error('删除文件失败:', error);
    throw error;
  }
}

/**
 * 获取项目文件列表
 */
export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  try {
    const user = await getUser();
    
    if (!user) {
      throw new Error('未授权访问');
    }

    // 检查项目是否存在
    const project = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId)
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    // 获取项目文件
    const projectFiles = await db.query.files.findMany({
      where: eq(files.auditUnitId, projectId)
    });

    // 格式化响应
    const formattedFiles = projectFiles.map(file => ({
      id: file.id,
      filename: file.originalName,
      size: Number(file.fileSize),
      url: file.filePath,
      createdAt: file.uploadDate?.toISOString() || new Date().toISOString(),
      type: file.fileType
    }));

    return formattedFiles;
  } catch (error) {
    console.error('获取文件列表失败:', error);
    throw error;
  }
} 