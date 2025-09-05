"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deletePoll } from "@/app/lib/actions/poll-actions";

/**
 * Poll data interface for the actions component.
 * 
 * Defines the structure of poll data passed from the server component.
 */
interface Poll {
  id: string;
  question: string;
  options: string[];
  user_id: string;
}

/**
 * Props interface for the poll actions component.
 * 
 * Contains the poll data needed to render the card and perform actions.
 */
interface PollActionsProps {
  poll: Poll;
}

/**
 * Client component for poll card display and actions.
 * 
 * Renders a poll card with question, options count, and action buttons.
 * Handles poll deletion with confirmation and error feedback. Uses server
 * actions for data mutations and relies on server-side authorization.
 * 
 * @param poll - Poll data from server component
 * @returns JSX element containing the poll card with actions
 * 
 * @sideEffects
 * - Calls deletePoll server action
 * - Reloads page after successful deletion
 * - Updates local UI state for loading/error feedback
 * 
 * @uiStateReasoning
 * - Disabled states: Delete button disabled during deletion operation
 * - Loading states: Shows "Deleting..." text during operation
 * - Error states: Displays error message below actions
 * - Aria-live: Not applicable (errors are static, not dynamic updates)
 * 
 * @securityConsiderations
 * - Relies on server action for authorization (no client-side checks)
 * - Server action enforces ownership before deletion
 * - Confirmation dialog prevents accidental deletions
 */
export default function PollActions({ poll }: PollActionsProps) {
  // Client-side state for UI feedback
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles poll deletion with confirmation and error handling.
   * 
   * Shows confirmation dialog, calls server action, and provides
   * user feedback through UI state updates. Relies on server
   * action for authorization enforcement.
   */
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this poll?")) {
      setIsDeleting(true);
      setError(null);
      
      // Call server action (enforces ownership on server)
      const result = await deletePoll(poll.id);
      
      if (result.ok) {
        // Reload page to show updated polls list
        window.location.reload();
      } else {
        setError(result.error || "Failed to delete poll");
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="border rounded-md shadow-md hover:shadow-lg transition-shadow bg-white">
      {/* Poll content with navigation to detail view */}
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
      {/* Action buttons for edit and delete */}
      <div className="flex gap-2 p-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/polls/${poll.id}/edit`}>Edit</Link>
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleDelete}
          disabled={isDeleting} // Disabled during deletion operation
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
      {/* Error message display */}
      {error && (
        <div className="px-2 pb-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
