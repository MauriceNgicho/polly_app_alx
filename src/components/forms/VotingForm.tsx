'use client';

import { useState } from 'react';
import { Poll, PollOption } from '@/lib/types/database';

interface VotingFormProps {
  poll: Poll;
  options: PollOption[];
}

export default function VotingForm({ poll, options }: VotingFormProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOption) {
      setError('Please select an option to vote.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId: selectedOption }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to submit vote');
      }
      
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-8 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-2xl font-semibold text-green-800">Thank you for voting!</h2>
        <p className="text-gray-600 mt-2">Your vote has been recorded.</p>
        {/* You can add a link to the results page here */}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              selectedOption === option.id
                ? 'border-blue-600 bg-blue-50 shadow-md'
                : 'border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="poll-option"
              value={option.id}
              checked={selectedOption === option.id}
              onChange={() => setSelectedOption(option.id)}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-4 text-lg font-medium text-gray-800">{option.text}</span>
          </label>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isSubmitting || !selectedOption}
          className="w-full px-6 py-3 text-lg font-semibold text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Your Vote'}
        </button>
      </div>
    </form>
  );
}
