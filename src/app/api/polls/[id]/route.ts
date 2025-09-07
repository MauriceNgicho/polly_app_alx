
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to update a poll' }, { status: 401 });
    }

    const pollId = params.id;
    const { title, description } = await req.json();

    if (!title.trim()) {
      return NextResponse.json({ error: 'Poll title is required' }, { status: 400 });
    }

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (poll.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only update your own polls' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('polls')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pollId);

    if (updateError) {
      console.error('Error updating poll:', updateError);
      return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Poll updated successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error updating poll:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to delete a poll' }, { status: 401 });
    }

    const pollId = params.id;

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (poll.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own polls' }, { status: 403 });
    }

    const { error: optionsDeleteError } = await supabase
      .from('poll_options')
      .delete()
      .eq('poll_id', pollId);

    if (optionsDeleteError) {
      console.error('Error deleting poll options:', optionsDeleteError);
      return NextResponse.json({ error: 'Failed to delete poll options' }, { status: 500 });
    }

    const { error: pollDeleteError } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);

    if (pollDeleteError) {
      console.error('Error deleting poll:', pollDeleteError);
      return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Poll deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting poll:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
