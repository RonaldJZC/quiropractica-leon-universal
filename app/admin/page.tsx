import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { AdminDashboard } from '@/app/components/admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireChatGPTUser('/admin');
  return <AdminDashboard user={{ name: user.displayName, email: user.email }} />;
}
