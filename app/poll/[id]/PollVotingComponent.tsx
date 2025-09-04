'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { submitVote } from '@/app/lib/actions/poll-actions';

interface PollVotingComponentProps {
  poll: {
    id: string;
    question: string;
    options: string[];
    created_at: string;
  };
  voteCounts: number[];
  pollId: string;
}

export default function PollVotingComponent({ 
  poll, 
  voteCounts, 
  pollId 
}: PollVotingComponentProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const handleVote = async () => {
    if (selectedOption === null) return;
    
    setIsSubmitting(true);
    setError(null);
    
    // Get the vote signature from the cookie
    const voteSignature = document.cookie
      .split('; ')
      .find(row => row.startsWith(`vote_sig_${pollId}=`))
      ?.split('=')[1];

    if (!voteSignature) {
      setError('Vote signature not found. Please refresh the page and try again.');
      setIsSubmitting(false);
      return;
    }

    const result = await submitVote(pollId, selectedOption, voteSignature);
    
    if (result.ok) {
      setHasVoted(true);
      // Refresh the page to show updated results
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
