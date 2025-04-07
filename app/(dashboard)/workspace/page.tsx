import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import Dashboard from '@/components/dashboard/Dashboard';

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return <Dashboard />;
}
