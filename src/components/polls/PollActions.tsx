'use client';

import { useState } from 'react';
import { deletePoll } from '@/lib/actions/polls';
import Link from 'next/link';

interface PollActionsProps {
  pollId: string;
}

export function PollActions({ pollId }: PollActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePoll(pollId);
      // The page will revalidate automatically
    } catch (error) {
      console.error('Error deleting poll:', error);
      alert('Failed to delete poll. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
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
