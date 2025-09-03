import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Poll, PollOption } from '@/lib/types/database';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PollActions } from '@/components/polls/PollActions';
import { logout } from '@/lib/actions/auth';

async function getPollsWithOptions(): Promise<{ poll: Poll; options: PollOption[] }[]> {
  const supabase = await createServerSupabaseClient();
  
  // Get all active polls with their options
  const { data: polls, error: pollsError } = await supabase
    .from('polls')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (pollsError) {
    console.error('Error fetching polls:', pollsError);
    return [];
  }

  if (!polls || polls.length === 0) {
    return [];
  }

  // Get options for all polls
  const pollIds = polls.map(poll => poll.id);
  const { data: options, error: optionsError } = await supabase
    .from('poll_options')
    .select('*')
    .in('poll_id', pollIds)
    .order('created_at');

  if (optionsError) {
    console.error('Error fetching poll options:', optionsError);
    return [];
  }

  // Combine polls with their options
  const pollsWithOptions = polls.map(poll => ({
    poll,
    options: options?.filter(option => option.poll_id === poll.id) || []
  }));

  return pollsWithOptions;
}

export default async function HomePage() {
  // Check authentication on the server side
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const pollsWithOptions = await getPollsWithOptions();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome, {user.email}
          </h1>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/polls"
              className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <h2 className="text-xl font-semibold text-blue-900 mb-2">View All Polls</h2>
              <p className="text-blue-700">Browse and participate in existing polls</p>
            </Link>
            
            <Link
              href="/polls/create"
              className="block p-6 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
            >
              <h2 className="text-xl font-semibold text-green-900 mb-2">Create Poll</h2>
              <p className="text-green-700">Create a new poll and share it with others</p>
            </Link>
          </div>

          <div className="flex justify-end mt-6">
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        {/* Polls Dashboard */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Polls</h2>
            <Link
              href="/polls"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </Link>
          </div>

          {pollsWithOptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No polls found.</p>
              <Link
                href="/polls/create"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create the first poll
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 lg:grid-cols-3">
              {pollsWithOptions.slice(0, 6).map(({ poll, options }) => (
                <div key={poll.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {poll.title}
                    </h3>
                    {poll.user_id === user.id && (
                      <PollActions pollId={poll.id} />
                    )}
                  </div>
                  
                  {poll.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                      {poll.description}
                    </p>
                  )}

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">
                      {options.length} option{options.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1">
                      {options.slice(0, 3).map((option) => (
                        <div key={option.id} className="text-sm text-gray-700 bg-white px-2 py-1 rounded border">
                          {option.text}
                        </div>
                      ))}
                      {options.length > 3 && (
                        <p className="text-xs text-gray-500">+{options.length - 3} more</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(poll.created_at).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/polls/${poll.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Poll →
                    </Link>
                  </div>

                  {poll.user_id === user.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        Your Poll
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {pollsWithOptions.length > 6 && (
            <div className="text-center mt-8">
              <Link
                href="/polls"
                className="inline-block bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                View All {pollsWithOptions.length} Polls
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
