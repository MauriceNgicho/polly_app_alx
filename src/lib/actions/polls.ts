'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CreatePollData, CreatePollResponse } from '@/lib/types/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Creates a new poll in the database.
 *
 * @param {CreatePollData} formData - The data for the new poll.
 * @param {string} formData.title - The title of the poll.
 * @param {string} [formData.description] - An optional description for the poll.
 * @param {string[]} formData.options - An array of strings representing the poll options. Must contain at least two options.
 * @param {string} [formData.expires_at] - An optional ISO 8601 timestamp for when the poll expires.
 * @returns {Promise<CreatePollResponse>} A promise that resolves to an object containing the result of the operation.
 * If successful, the object will have `success: true` and the created `poll` object.
 * If unsuccessful, it will have `success: false` and an `error` message.
 */
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

/**
 * A server action that wraps `createPoll` and handles redirection.
 * It constructs the poll data from a FormData object and, on successful poll creation,
 * redirects the user to the main polls page with a success message.
 * If creation fails, it throws an error to be caught by the calling form.
 *
 * @param {FormData} formData - The form data submitted by the user.
 * Expected fields are title, description, option1, option2, etc., and an optional expires_at.
 */
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

/**
 * Deletes a specific poll from the database.
 * This server action ensures that the user is logged in and is the owner of the poll
 * before proceeding with the deletion. It also deletes associated poll options.
 *
 * @param {string} pollId - The UUID of the poll to be deleted.
 * @throws {Error} If the user is not authenticated, not the poll owner, or if the poll is not found.
 */
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

/**
 * Updates an existing poll with new data.
 * This server action validates that the user is the poll owner. It updates the poll's
 * title and description. After a successful update, it revalidates relevant paths
 * and redirects the user back to the main polls list.
 *
 * @param {string} pollId - The UUID of the poll to update.
 * @param {FormData} formData - The form data containing the new title and description.
 * @throws {Error} If the user is not authenticated, not the poll owner, or if the update fails.
 */
export async function updatePoll(pollId: string, formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('You must be logged in to update a poll');
    }

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      throw new Error('Poll not found');
    }

    if (poll.user_id !== user.id) {
      throw new Error('You can only update your own polls');
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!title.trim()) {
      throw new Error('Poll title is required');
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
      throw new Error('Failed to update poll');
    }

    revalidatePath('/polls');
    revalidatePath(`/polls/${pollId}`);
    revalidatePath(`/polls/${pollId}/edit`);
    
    redirect('/polls?success=true&message=Poll updated successfully!');

  } catch (error) {
    console.error('Error updating poll:', error);
    throw error;
  }
}

/**
 * Submits a vote for a specific poll option.
 * This server action ensures the user is logged in and has not already voted on this poll.
 * If the vote is valid, it inserts a new record into the 'votes' table and revalidates
 * the poll detail page to reflect the new vote.
 *
 * @param {string} pollId - The UUID of the poll being voted on.
 * @param {string} optionId - The UUID of the selected poll option.
 * @throws {Error} If the user is not logged in, has already voted, or if the database operation fails.
 */
export async function submitVote(pollId: string, optionId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('You must be logged in to vote.');
    }

    // Check if the user has already voted
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .single();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking for existing vote:', voteCheckError);
      throw new Error('Could not verify your vote. Please try again.');
    }

    if (existingVote) {
      throw new Error('You have already voted on this poll.');
    }

    // Record the new vote
    const { error: insertError } = await supabase
      .from('votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id,
      });

    if (insertError) {
      console.error('Error submitting vote:', insertError);
      throw new Error('Failed to submit your vote.');
    }

    revalidatePath(`/polls/${pollId}`);
    // Optional: revalidate a results-specific page if you have one
    // revalidatePath(`/polls/${pollId}/results`);

  } catch (error) {
    console.error('Error in submitVote:', error);
    // Re-throw the original error to be caught by the form handler
    throw error;
  }
}
