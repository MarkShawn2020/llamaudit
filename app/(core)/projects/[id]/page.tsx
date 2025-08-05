import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { getProject, ensureProjectDataset } from '@/lib/actions/project-actions';
import ProjectDetail from '@/components/projects/detail';
import { ProjectAwareKnowledgeAssistant } from '@/components/ProjectAwareKnowledgeAssistant';
import { cookies } from 'next/headers';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `项目详情 - Llamaudit`,
    description: '查看和管理被审计单位项目详情'
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const {id: projectId} = await params;

  // 在服务端获取项目数据
  const project = await getProject(projectId);

  if (!project) {
    redirect('/projects');
  }

  // 🚀 中间件模式：获取用户浏览器的dify偏好
  const cookieStore = await cookies();
  const difyPreferencesCookie = cookieStore.get('llamaudit_global_settings');
  
  let userDifyPreferences: { difyBaseUrl?: string; difyDatasetApiKey?: string; difyAppApiKey?: string; } | undefined = undefined;
  if (difyPreferencesCookie) {
    try {
      const globalSettings = JSON.parse(difyPreferencesCookie.value);
      if (globalSettings.dify) {
        userDifyPreferences = {
          difyBaseUrl: globalSettings.dify.baseUrl,
          difyDatasetApiKey: globalSettings.dify.datasetApiKey,
          difyAppApiKey: globalSettings.dify.apiKey
        };
      }
    } catch (error) {
      console.warn('解析用户dify偏好失败:', error);
    }
  }

  // 🔧 服务端预处理：确保项目dataset就绪
  let projectWithDataset = project;
  try {
    projectWithDataset = await ensureProjectDataset(project, userDifyPreferences);
    console.log(`✅ 项目[${project.id}]dataset预处理完成`);
  } catch (error) {
    console.error(`⚠️ 项目[${project.id}]dataset预处理失败:`, error);
    // 预处理失败时，使用原始项目数据，让客户端处理
  }

  return (
    <>
      <ProjectDetail project={projectWithDataset} />
      <ProjectAwareKnowledgeAssistant project={projectWithDataset} />
    </>
  );
} 

 




