import EditPollForm from '@/components/forms/EditPollForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

async function getPoll(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: poll, error } = await supabase
    .from('polls')
    .select('*, poll_options(*)')
    .eq('id', id)
    .single();

  if (error || !poll) {
    notFound();
  }

  return poll;
}

export default async function EditPollPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const poll = await getPoll(params.id);

  if (poll.user_id !== user.id) {
    // Or show an unauthorized page
    redirect('/polls');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <EditPollForm poll={poll} />
    </div>
  );
}
