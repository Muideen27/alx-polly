import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { generateVoteSignature } from '@/lib/vote-signature';
import { headers } from 'next/headers';
import PollVotingComponent from './PollVotingComponent';

export default async function PublicPollPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = await createClient();
  
  // Get poll data (public access)
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', params.id)
    .single();

  if (pollError || !poll) {
    notFound();
  }

  // Get request headers for signature generation
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;

  // Generate vote signature
  const voteSignature = generateVoteSignature(params.id, userAgent, ip);

  // Set httpOnly cookie for vote signature
  const cookieStore = await cookies();
  cookieStore.set(`vote_sig_${params.id}`, voteSignature, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: `/poll/${params.id}`,
  });

  // Fetch vote counts
  const { data: votes } = await supabase
    .from('votes')
    .select('option_index')
    .eq('poll_id', params.id);

  const voteCounts = (poll.options as string[]).map((_, index) => 
    votes?.filter(vote => vote.option_index === index).length || 0
  );

  return (
    <PollVotingComponent 
      poll={poll} 
      voteCounts={voteCounts}
      pollId={params.id}
    />
  );
}
