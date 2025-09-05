"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deletePoll } from "@/app/lib/actions/poll-actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Poll data interface for admin view.
 * 
 * Defines the structure of poll data for administrative display.
 * Includes additional metadata like user_id and created_at for admin purposes.
 */
interface Poll {
  id: string;
  question: string;
  user_id: string;
  created_at: string;
  options: string[];
}

/**
 * Admin page component for managing all polls in the system.
 * 
 * Provides administrative interface for viewing and deleting all polls
 * regardless of ownership. Uses client-side data fetching with Supabase
 * client and server actions for mutations. Implements loading states
 * and error handling for administrative operations.
 * 
 * @returns JSX element containing the admin interface
 * 
 * @sideEffects
 * - Fetches all polls from database on component mount
 * - Calls deletePoll server action for poll deletion
 * - Updates local state after successful operations
 * 
 * @uiStateReasoning
 * - Loading states: Shows loading message while fetching data
 * - Disabled states: Delete button disabled during deletion operation
 * - Error states: Handles fetch and deletion errors gracefully
 * - Aria-live: Not applicable (no dynamic content updates)
 * 
 * @securityConsiderations
 * - Client-side data fetching (admin functionality)
 * - Server action enforces authorization for deletions
 * - No client-side authorization checks (admin interface)
 */
export default function AdminPage() {
  // Client-side state for data and UI management
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Fetch all polls on component mount
  useEffect(() => {
    fetchAllPolls();
  }, []);

  /**
   * Fetches all polls from the database for admin view.
   * 
   * Uses Supabase client to fetch all polls regardless of ownership.
   * Orders by creation date for chronological display.
   */
  const fetchAllPolls = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPolls(data);
    }
    setLoading(false);
  };

  /**
   * Handles poll deletion with loading state management.
   * 
   * Sets loading state for specific poll, calls server action,
   * and updates local state on success. Provides user feedback
   * through loading indicators.
   * 
   * @param pollId - ID of the poll to delete
   */
  const handleDelete = async (pollId: string) => {
    setDeleteLoading(pollId);
    const result = await deletePoll(pollId);

    if (!result.error) {
      // Remove deleted poll from local state
      setPolls(polls.filter((poll) => poll.id !== pollId));
    }

    setDeleteLoading(null);
  };

  // Show loading state while fetching data
  if (loading) {
    return <div className="p-6">Loading all polls...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Admin panel header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-gray-600 mt-2">
          View and manage all polls in the system.
        </p>
      </div>

      {/* Polls grid with admin information */}
      <div className="grid gap-4">
        {polls.map((poll) => (
          <Card key={poll.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{poll.question}</CardTitle>
                  <CardDescription>
                    <div className="space-y-1 mt-2">
                      {/* Poll metadata for admin reference */}
                      <div>
                        Poll ID:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {poll.id}
                        </code>
                      </div>
                      <div>
                        Owner ID:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {poll.user_id}
                        </code>
                      </div>
                      <div>
                        Created:{" "}
                        {new Date(poll.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardDescription>
                </div>
                {/* Delete button with loading state */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(poll.id)}
                  disabled={deleteLoading === poll.id} // Disabled during deletion
                >
                  {deleteLoading === poll.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">Options:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {poll.options.map((option, index) => (
                    <li key={index} className="text-gray-700">
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state when no polls exist */}
      {polls.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No polls found in the system.
        </div>
      )}
    </div>
  );
}
