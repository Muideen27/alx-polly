import { createHmac } from 'crypto';

const VOTE_SIGNING_SECRET = process.env.VOTE_SIGNING_SECRET;

if (!VOTE_SIGNING_SECRET) {
  throw new Error('VOTE_SIGNING_SECRET environment variable is required');
}

export function generateVoteSignature(pollId: string, userAgent: string, ip?: string): string {
  const data = `${pollId}:${userAgent}${ip ? `:${ip}` : ''}`;
  return createHmac('sha256', VOTE_SIGNING_SECRET as string)
    .update(data)
    .digest('hex');
}

export function verifyVoteSignature(
  pollId: string, 
  userAgent: string, 
  signature: string, 
  ip?: string
): boolean {
  const expectedSignature = generateVoteSignature(pollId, userAgent, ip);
  return expectedSignature === signature;
}
