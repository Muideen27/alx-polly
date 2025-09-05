'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { submitVote } from '@/app/lib/actions/poll-actions';

/**
 * Props interface for the poll voting component.
 * 
 * Defines the structure of poll data and vote counts passed from
 * the server component. Vote counts are pre-computed server-side
 * to prevent client manipulation.
 */
interface PollVotingComponentProps {
  poll: {
    id: string;
    question: string;
    options: string[];
    created_at: string;
  };
  voteCounts: number[]; // Pre-computed server-side vote counts per option
  pollId: string;
}

/**
 * Client component for poll voting interface and results display.
 * 
 * Handles user interaction for voting, displays real-time results with
 * percentage calculations, and manages vote submission with signature
 * verification. Implements client-side state management for UI feedback.
 * 
 * @param poll - Poll data from server component
 * @param voteCounts - Pre-computed vote counts per option (server-side)
 * @param pollId - Poll ID for vote submission
 * @returns JSX element containing the voting interface
 * 
 * @sideEffects
 * - Calls submitVote server action with vote signature
 * - Reloads page after successful vote to show updated results
 * - Reads vote signature from httpOnly cookie
 * 
 * @securityConsiderations
 * - Vote signature required for submission (prevents duplicate votes)
 * - Server-side vote count computation (prevents client manipulation)
 * - No client-side vote storage or calculation
 * - Signature validation on server action
 */
export default function PollVotingComponent({ 
  poll, 
  voteCounts, 
  pollId 
}: PollVotingComponentProps) {
  // Client-side state for UI interaction
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total votes from pre-computed counts (server-side data)
  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);

  /**
   * Calculates percentage for a given vote count.
   * 
   * Uses server-computed vote counts to prevent client manipulation.
   * Returns 0% if no votes exist to avoid division by zero.
   * 
   * @param votes - Number of votes for a specific option
   * @returns Rounded percentage (0-100)
   */
  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  /**
   * Handles vote submission with signature verification.
   * 
   * Retrieves vote signature from httpOnly cookie, validates it exists,
   * and submits vote to server action. Implements client-side error
   * handling and UI state management.
   * 
   * @sideEffects
   * - Calls submitVote server action
   * - Reloads page on successful vote to show updated results
   * - Updates UI state for loading/error feedback
   * 
   * @securityConsiderations
   * - Requires vote signature from httpOnly cookie
   * - Server action validates signature and enforces deduplication
   * - No client-side vote storage or validation
   */
  const handleVote = async () => {
    if (selectedOption === null) return;
    
    setIsSubmitting(true);
    setError(null);
    
    // Extract vote signature from httpOnly cookie (set by server)
    const voteSignature = document.cookie
      .split('; ')
      .find(row => row.startsWith(`vote_sig_${pollId}=`))
      ?.split('=')[1];

    if (!voteSignature) {
      setError('Vote signature not found. Please refresh the page and try again.');
      setIsSubmitting(false);
      return;
    }

    // Submit vote with signature for deduplication
    const result = await submitVote(pollId, selectedOption, voteSignature);
    
    if (result.ok) {
      setHasVoted(true);
      // Refresh page to show updated results (server-side computation)
      window.location.reload();
    } else {
      setError(result.error || 'Failed to submit vote');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.question}</CardTitle>
          <CardDescription>
            Poll created on {new Date(poll.created_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasVoted ? (
            <div className="space-y-3">
              {poll.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedOption === index 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedOption(index)}
                >
                  {option}
                </div>
              ))}
              <Button 
                onClick={handleVote} 
                disabled={selectedOption === null || isSubmitting} 
                className="mt-4"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Vote'}
              </Button>
              {error && (
                <div className="text-red-600 text-sm mt-2">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium">Results:</h3>
              {poll.options.map((option, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{option}</span>
                    <span>{getPercentage(voteCounts[index])}% ({voteCounts[index]} votes)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${getPercentage(voteCounts[index])}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              <div className="text-sm text-slate-500 pt-2">
                Total votes: {totalVotes}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
