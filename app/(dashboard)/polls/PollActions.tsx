"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deletePoll } from "@/app/lib/actions/poll-actions";

interface Poll {
  id: string;
  question: string;
  options: any[];
  user_id: string;
}

interface PollActionsProps {
  poll: Poll;
}

export default function PollActions({ poll }: PollActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this poll?")) {
      setIsDeleting(true);
      setError(null);
      
      const result = await deletePoll(poll.id);
      
      if (result.ok) {
        window.location.reload();
      } else {
        setError(result.error || "Failed to delete poll");
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="border rounded-md shadow-md hover:shadow-lg transition-shadow bg-white">
      <Link href={`/polls/${poll.id}`}>
        <div className="group p-4">
          <div className="h-full">
            <div>
              <h2 className="group-hover:text-blue-600 transition-colors font-bold text-lg">
                {poll.question}
              </h2>
              <p className="text-slate-500">{poll.options.length} options</p>
            </div>
          </div>
        </div>
      </Link>
      <div className="flex gap-2 p-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/polls/${poll.id}/edit`}>Edit</Link>
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
      {error && (
        <div className="px-2 pb-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
