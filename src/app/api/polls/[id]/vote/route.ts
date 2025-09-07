
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to vote' }, { status: 401 });
    }

    const pollId = params.id;
    const { optionId } = await req.json();

    if (!optionId) {
      return NextResponse.json({ error: 'Option ID is required' }, { status: 400 });
    }

    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .single();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      console.error('Error checking for existing vote:', voteCheckError);
      return NextResponse.json({ error: 'Could not verify your vote. Please try again.' }, { status: 500 });
    }

    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted on this poll' }, { status: 409 });
    }

    const { error: insertError } = await supabase
      .from('votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id,
      });

    if (insertError) {
      console.error('Error submitting vote:', insertError);
      return NextResponse.json({ error: 'Failed to submit your vote' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Vote submitted successfully' }, { status: 201 });

  } catch (error) {
    console.error('Error in submitVote:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
