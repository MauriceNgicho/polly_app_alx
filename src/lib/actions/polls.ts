'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CreatePollData, CreatePollResponse } from '@/lib/types/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPoll(formData: CreatePollData): Promise<CreatePollResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to create a poll'
      };
    }

    // Validate input
    if (!formData.title.trim()) {
      return {
        success: false,
        error: 'Poll title is required'
      };
    }

    if (!formData.options || formData.options.length < 2) {
      return {
        success: false,
        error: 'At least 2 options are required'
      };
    }

    // Create the poll
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
      return {
        success: false,
        error: 'Failed to create poll'
      };
    }

    // Create poll options
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
      // Clean up the poll if options creation failed
      await supabase.from('polls').delete().eq('id', poll.id);
      return {
        success: false,
        error: 'Failed to create poll options'
      };
    }

    // Revalidate the polls page
    revalidatePath('/polls');
    revalidatePath('/');
    
    return {
      success: true,
      poll
    };

  } catch (error) {
    console.error('Unexpected error creating poll:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

export async function createPollAndRedirect(formData: FormData) {
  const pollData: CreatePollData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    options: [
      formData.get('option1') as string,
      formData.get('option2') as string,
      formData.get('option3') as string,
      formData.get('option4') as string,
    ].filter(Boolean),
    expires_at: formData.get('expires_at') as string || undefined
  };

  const result = await createPoll(pollData);
  
  if (result.success && result.poll) {
    // Redirect to polls list with success message
    redirect('/polls?success=true&message=Poll created successfully!');
  } else {
    // Handle error - you might want to use a different approach
    // For now, we'll throw an error that can be caught by the form
    throw new Error(result.error || 'Failed to create poll');
  }
}

export async function deletePoll(pollId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('You must be logged in to delete a poll');
    }

    // Check if the poll belongs to the current user
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      throw new Error('Poll not found');
    }

    if (poll.user_id !== user.id) {
      throw new Error('You can only delete your own polls');
    }

    // Delete poll options first (due to foreign key constraint)
    const { error: optionsDeleteError } = await supabase
      .from('poll_options')
      .delete()
      .eq('poll_id', pollId);

    if (optionsDeleteError) {
      console.error('Error deleting poll options:', optionsDeleteError);
      throw new Error('Failed to delete poll options');
    }

    // Delete the poll
    const { error: pollDeleteError } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);

    if (pollDeleteError) {
      console.error('Error deleting poll:', pollDeleteError);
      throw new Error('Failed to delete poll');
    }

    // Revalidate pages
    revalidatePath('/polls');
    revalidatePath('/');

  } catch (error) {
    console.error('Error deleting poll:', error);
    throw error;
  }
}
