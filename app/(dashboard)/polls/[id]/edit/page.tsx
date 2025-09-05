import { getPollById } from '@/app/lib/actions/poll-actions';
import { notFound } from 'next/navigation';
// Import the client component for form handling
import EditPollForm from './EditPollForm';

/**
 * Server component for editing a specific poll.
 * 
 * Fetches the poll data server-side with ownership verification,
 * then renders the edit form. Ensures only poll owners can access
 * the edit page by checking ownership in getPollById().
 * 
 * @param params - Route parameters containing the poll ID
 * @returns JSX element containing the edit poll form
 * 
 * @sideEffects
 * - Calls getPollById() which queries 'polls' table with ownership filter
 * - No cache revalidation (read-only operation)
 * 
 * @failureModes
 * - Poll not found: Returns 404 via notFound()
 * - Not owned by user: Returns 404 via notFound() (security)
 * - Authentication required: Redirected by middleware
 * - Database error: Returns 404 via notFound()
 */
export default async function EditPollPage({ params }: { params: { id: string } }) {
  // Server-side data fetching with ownership enforcement
  const { poll, error } = await getPollById(params.id);

  // Return 404 for any error (not found, not owned, or DB error)
  if (error || !poll) {
    notFound();
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      {/* Client component handles form submission and validation */}
      <EditPollForm poll={poll} />
    </div>
  );
}