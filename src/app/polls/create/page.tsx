import CreatePollForm from '@/components/forms/CreatePollForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CreatePollPage() {
  // Check authentication on the server side
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <CreatePollForm />
    </div>
  );
}
