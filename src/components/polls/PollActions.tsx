'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PollActionsProps {
  pollId: string;
}

export function PollActions({ pollId }: PollActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to delete poll');
      }
      
      router.refresh();
    } catch (error) {
      console.error('Error deleting poll:', error);
      alert('Failed to delete poll. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const pollUrl = `${window.location.origin}/polls/${pollId}`;
      await navigator.clipboard.writeText(pollUrl);
      
      // Show a brief success message
      const originalText = 'Share Poll';
      const button = document.querySelector(`[data-share-button="${pollId}"]`) as HTMLButtonElement;
      if (button) {
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy link to clipboard. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleShare}
        disabled={isSharing}
        data-share-button={pollId}
        className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
      >
        {isSharing ? 'Sharing...' : 'Share Poll'}
      </button>
      <Link
        href={`/polls/${pollId}/edit`}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
