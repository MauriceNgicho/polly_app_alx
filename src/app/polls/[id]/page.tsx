import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Poll, PollOption } from '@/lib/types/database';
import { notFound, redirect } from 'next/navigation';

interface PollDetailPageProps {
  params: {
    id: string;
  };
}

async function getPollWithOptions(id: string): Promise<{ poll: Poll; options: PollOption[] } | null> {
  const supabase = await createServerSupabaseClient();
  
  // Get poll
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (pollError || !poll) {
    return null;
  }

  // Get poll options
  const { data: options, error: optionsError } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', id)
    .order('created_at');

  if (optionsError) {
    console.error('Error fetching poll options:', optionsError);
    return { poll, options: [] };
  }

  return { poll, options: options || [] };
}

export default async function PollDetailPage({ params }: PollDetailPageProps) {
  // Check authentication on the server side
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const data = await getPollWithOptions(params.id);

  if (!data) {
    notFound();
  }

  const { poll, options } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {poll.title}
          </h1>
          
          {poll.description && (
            <p className="text-gray-600 mb-6">
              {poll.description}
            </p>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Options:</h2>
            {options.map((option) => (
              <div key={option.id} className="border border-gray-200 rounded-md p-4">
                <p className="text-gray-800">{option.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Created: {new Date(poll.created_at).toLocaleDateString()}</span>
              {poll.expires_at && (
                <span>Expires: {new Date(poll.expires_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-600">
              Share this poll with the link: <br />
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {`https://yourapp.com/polls/${poll.id}`}
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
