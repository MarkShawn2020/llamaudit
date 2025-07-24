import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { getProject } from '@/lib/actions/project-actions';
import ProjectDetail from '@/components/projects/detail';
import { ProjectAwareKnowledgeAssistant } from '@/components/ProjectAwareKnowledgeAssistant';

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

  return (
    <>
      <ProjectDetail project={project} />
      <ProjectAwareKnowledgeAssistant project={project} />
    </>
  );
} 

 




