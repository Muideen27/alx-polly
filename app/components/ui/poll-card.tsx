import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface PollCardProps {
  poll: {
    id: string;
    title: string;
    description?: string;
    options: string[];
    votes?: number;
    createdAt: string | Date;
  };
}

export function PollCard({ poll }: PollCardProps) {
  const totalVotes = poll.votes || 0;
  const formattedDate = typeof poll.createdAt === 'string' 
    ? new Date(poll.createdAt).toLocaleDateString() 
    : poll.createdAt.toLocaleDateString();

  return (
    <Link href={`/polls/${poll.id}`} className="group block h-full">
      <Card className="h-full transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="group-hover:text-blue-600 transition-colors">{poll.title}</CardTitle>
          {poll.description && <CardDescription>{poll.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">
            <p>{poll.options.length} options</p>
            <p>{totalVotes} total votes</p>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-slate-400">
          Created on {formattedDate}
        </CardFooter>
      </Card>
    </Link>
  );
}