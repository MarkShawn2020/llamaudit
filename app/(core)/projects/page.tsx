import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import ProjectsList from '@/components/projects/list/ProjectsList';

export const metadata = {
  title: '项目管理 - Llamaudit',
  description: '管理被审计单位项目',
};

export default async function ProjectsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">项目管理</h1>
      </div>
      <ProjectsList />
    </div>
  );
} 