import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import ProjectDetail from '@/components/projects/ProjectDetail';

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `项目详情 - Llamaudit`,
    description: '查看和管理被审计单位项目详情'
  };
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const {id: projectId} = await params;


  return <ProjectDetail projectId={projectId} />;
} 

 




