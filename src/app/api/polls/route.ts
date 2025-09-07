
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CreatePollData } from '@/lib/types/database';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to create a poll' }, { status: 401 });
    }

    const formData: CreatePollData = await req.json();

    if (!formData.title.trim()) {
      return NextResponse.json({ error: 'Poll title is required' }, { status: 400 });
    }

    if (!formData.options || formData.options.length < 2) {
      return NextResponse.json({ error: 'At least 2 options are required' }, { status: 400 });
    }

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        user_id: user.id,
        is_active: true,
        expires_at: formData.expires_at || null
      })
      .select()
      .single();

    if (pollError) {
      console.error('Error creating poll:', pollError);
      return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
    }

    const optionsData = formData.options
      .filter(option => option.trim())
      .map(option => ({
        poll_id: poll.id,
        text: option.trim()
      }));

    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsData);

    if (optionsError) {
      console.error('Error creating poll options:', optionsError);
      await supabase.from('polls').delete().eq('id', poll.id);
      return NextResponse.json({ error: 'Failed to create poll options' }, { status: 500 });
    }

    return NextResponse.json({ poll }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error creating poll:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
