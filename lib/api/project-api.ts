import { toast } from 'sonner';
import { 
  getProjects as getProjectsAction, 
  getProject as getProjectAction, 
  createProject as createProjectAction, 
  updateProject as updateProjectAction, 
  deleteProject as deleteProjectAction,
  uploadProjectFile as uploadProjectFileAction,
  deleteProjectFile as deleteProjectFileAction,
  getProjectFiles as getProjectFilesAction,
  type Project,
  type ProjectFile
} from '@/lib/actions/project-actions';

export type { Project, ProjectFile };

/**
 * 获取项目列表
 */
export async function getProjects(): Promise<Project[]> {
  try {
    return await getProjectsAction();
  } catch (error) {
    console.error('获取项目列表失败:', error);
    toast.error('获取项目列表失败');
    throw error;
  }
}

/**
 * 获取项目详情
 * @param id 项目ID
 */
export async function getProject(id: string): Promise<Project | null> {
  try {
    return await getProjectAction(id);
  } catch (error) {
    console.error(`获取项目[${id}]详情失败2:`, error);
    toast.error('获取项目详情失败');
    throw error;
  }
}

/**
 * 创建新项目
 * @param projectData 项目数据
 */
export async function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'documentCount' | 'taskCount' | 'status' | 'updatedAt'>): Promise<Project> {
  try {
    return await createProjectAction(projectData);
  } catch (error) {
    console.error('创建项目失败:', error);
    toast.error('创建项目失败');
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
    return await updateProjectAction(id, projectData);
  } catch (error) {
    console.error(`更新项目[${id}]失败:`, error);
    toast.error('更新项目信息失败');
    throw error;
  }
}

/**
 * 删除项目
 * @param id 项目ID
 */
export async function deleteProject(id: string): Promise<boolean> {
  try {
    return await deleteProjectAction(id);
  } catch (error) {
    console.error(`删除项目[${id}]失败:`, error);
    toast.error('删除项目失败');
    throw error;
  }
}

/**
 * 上传项目文件
 */
export const uploadProjectFile = async (formData: FormData): Promise<{files: ProjectFile[]}> => {
  try {
    return await uploadProjectFileAction(formData);
  } catch (error) {
    console.error('文件上传失败:', error);
    toast.error('文件上传失败');
    throw error;
  }
};

/**
 * 删除项目文件
 */
export const deleteProjectFile = async (projectId: string, fileId: string): Promise<void> => {
  try {
    await deleteProjectFileAction(projectId, fileId);
  } catch (error) {
    console.error('删除文件失败:', error);
    toast.error('删除文件失败');
    throw error;
  }
};

/**
 * 获取项目文件列表
 */
export const getProjectFiles = async (projectId: string): Promise<ProjectFile[]> => {
  try {
    return await getProjectFilesAction(projectId);
  } catch (error) {
    console.error('获取文件列表失败:', error);
    toast.error('获取文件列表失败');
    throw error;
  }
}; 