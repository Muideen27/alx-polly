import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { generateVoteSignature } from '@/lib/vote-signature';
import { headers } from 'next/headers';
import PollVotingComponent from './PollVotingComponent';

/**
 * Server component for public poll voting and results display.
 * 
 * Handles public access to polls, vote signature generation for deduplication,
 * and real-time vote count aggregation. Implements security measures to prevent
 * vote manipulation and ensures accurate result computation.
 * 
 * @param params - Route parameters containing the poll ID
 * @returns JSX element containing the poll voting interface
 * 
 * @sideEffects
 * - Queries 'polls' table for public poll data
 * - Queries 'votes' table for vote count aggregation
 * - Sets httpOnly cookie with vote signature for deduplication
 * - No cache revalidation (public read-only data)
 * 
 * @failureModes
 * - Poll not found: Returns 404 via notFound()
 * - Invalid poll ID: Returns 404 via notFound()
 * - Database error: Returns 404 via notFound()
 * 
 * @securityConsiderations
 * - No authentication required (public access)
 * - Vote signature prevents duplicate voting
 * - Server-side result computation prevents client manipulation
 * - HttpOnly cookies prevent client-side signature tampering
 */
export default async function PublicPollPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = await createClient();
  
  // Get poll data (public access - no ownership filter)
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', params.id)
    .single();

  if (pollError || !poll) {
    notFound();
  }

  // Get request headers for vote signature generation (deduplication)
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;

  // Generate HMAC-based vote signature for deduplication
  const voteSignature = generateVoteSignature(params.id, userAgent, ip);

  // Set httpOnly cookie with vote signature (prevents client tampering)
  const cookieStore = await cookies();
  cookieStore.set(`vote_sig_${params.id}`, voteSignature, {
    httpOnly: true, // Critical: prevents client-side access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days persistence
    path: `/poll/${params.id}`, // Scoped to specific poll
  });

  // Fetch and aggregate vote counts server-side (prevents manipulation)
  const { data: votes } = await supabase
    .from('votes')
    .select('option_index')
    .eq('poll_id', params.id);

  // Compute vote counts per option (0-based index mapping)
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
