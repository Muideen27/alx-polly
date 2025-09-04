import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    notFound();
  }

  // Fetch poll with ownership check
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', params.id)
    .eq('owner', user.id)
    .single();

  if (pollError || !poll) {
    notFound();
  }

  // Fetch vote counts for each option
  const { data: votes } = await supabase
    .from('votes')
    .select('option_index')
    .eq('poll_id', params.id);

  // Count votes per option
  const voteCounts = (poll.options as string[]).map((_, index) => 
    votes?.filter(vote => vote.option_index === index).length || 0
  );

  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/polls" className="text-blue-600 hover:underline">
          &larr; Back to Polls
        </Link>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/polls/${params.id}/edit`}>Edit Poll</Link>
          </Button>
          <Button variant="outline" className="text-red-500 hover:text-red-700">
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.question}</CardTitle>
          <CardDescription>Poll created on {new Date(poll.created_at).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <h3 className="font-medium">Results:</h3>
            {(poll.options as string[]).map((option, index) => (
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
        </CardContent>
        <CardFooter className="text-sm text-slate-500 flex justify-between">
          <span>Created by you</span>
          <span>Created on {new Date(poll.created_at).toLocaleDateString()}</span>
        </CardFooter>
      </Card>

      <div className="pt-4">
        <h2 className="text-xl font-semibold mb-4">Share this poll</h2>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1">
            Copy Link
          </Button>
          <Button variant="outline" className="flex-1">
            Share on Twitter
          </Button>
        </div>
      </div>
    </div>
  );
}