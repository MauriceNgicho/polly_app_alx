import { PollActions } from '@/components/polls/PollActions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Poll } from '@/lib/types/database';
import Link from 'next/link';
import { redirect } from 'next/navigation';

async function getPolls(): Promise<Poll[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching polls:', error);
    return [];
  }

  return polls || [];
}

export default async function PollsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; message?: string }>;
}) {
  // Check authentication on the server side
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const polls = await getPolls();
  const resolvedSearchParams = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Message */}
        {resolvedSearchParams.success === 'true' && resolvedSearchParams.message && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {resolvedSearchParams.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Polls</h1>
          <Link
            href="/polls/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create New Poll
          </Link>
        </div>
        
        {polls.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No polls found.</p>
            <Link
              href="/polls/create"
              className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
            >
              Create the first poll
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll) => (
              <div key={poll.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {poll.title}
                  </h3>
                  {poll.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {poll.description}
                    </p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-gray-500">
                    {new Date(poll.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/polls/${poll.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Poll →
                  </Link>
                </div>
                {poll.user_id === user.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <PollActions pollId={poll.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
