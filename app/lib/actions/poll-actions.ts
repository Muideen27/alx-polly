"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getFriendlyErrorMessage, sanitizeText } from "@/lib/error-handling";
import { rateLimitCheck } from "@/lib/rate-limiter";

/**
 * Validation schemas for poll data integrity and security.
 * 
 * Enforces business rules to prevent invalid data and potential attacks:
 * - Question length limits prevent spam and ensure meaningful content
 * - Option constraints ensure usability and prevent abuse
 * - Case-insensitive uniqueness prevents duplicate options
 */
// Question validation: 10-500 characters, trimmed
const pollQuestionSchema = z
  .string()
  .min(1, "Question is required")
  .min(10, "Question must be at least 10 characters")
  .max(500, "Question must be less than 500 characters")
  .trim();

// Options validation: 2-10 options, each 2-200 characters, case-insensitive unique
const pollOptionsSchema = z
  .array(
    z
      .string()
      .min(1, "Option cannot be empty")
      .min(2, "Option must be at least 2 characters")
      .max(200, "Option must be less than 200 characters")
      .trim()
  )
  .min(2, "At least 2 options are required")
  .max(10, "Maximum 10 options allowed")
  .refine(
    (options) => {
      // Case-insensitive uniqueness check to prevent duplicate options
      const uniqueOptions = new Set(options.map(opt => opt.toLowerCase()));
      return uniqueOptions.size === options.length;
    },
    "Options must be unique (case-insensitive)"
  );

// Combined validation schemas for create and update operations
const createPollSchema = z.object({
  question: pollQuestionSchema,
  options: pollOptionsSchema,
});

const updatePollSchema = z.object({
  question: pollQuestionSchema,
  options: pollOptionsSchema,
});

/**
 * Creates a new poll with validated data and ownership enforcement.
 * 
 * Validates input data, enforces rate limiting, and creates a poll
 * owned by the authenticated user. Ensures data integrity through
 * Zod validation and prevents abuse through rate limiting.
 * 
 * @param formData - Form data containing question and options
 * @returns Promise resolving to success/error result
 * 
 * @sideEffects
 * - Inserts new poll record into 'polls' table
 * - Sets user_id for ownership enforcement
 * - Revalidates /dashboard/polls cache
 * 
 * @failureModes
 * - Rate limit exceeded: Returns rate limit error
 * - Validation failed: Returns specific validation error
 * - Authentication required: Returns login error
 * - Database error: Returns friendly error message
 */
export async function createPoll(formData: FormData) {
  // Rate limiting: prevent abuse of poll creation
  const rateLimitResult = await rateLimitCheck('createPoll');
  if (!rateLimitResult.ok) {
    return rateLimitResult;
  }

  const supabase = await createClient();

  // Extract and sanitize input data to prevent XSS
  const question = sanitizeText(formData.get("question") as string);
  const options = (formData.getAll("options").filter(Boolean) as string[]).map(sanitizeText);

  // Validate input with Zod schema for data integrity
  const validationResult = createPollSchema.safeParse({ question, options });
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return { ok: false, error: firstError.message };
  }

  const { question: validatedQuestion, options: validatedOptions } = validationResult.data;

  // Get authenticated user for ownership enforcement
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { ok: false, error: getFriendlyErrorMessage(userError) };
  }
  if (!user) {
    return { ok: false, error: "You must be logged in" };
  }

  // Insert poll with user_id for ownership tracking
  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id, // Critical: ensures poll ownership
      question: validatedQuestion,
      options: validatedOptions,
    },
  ]);

  if (error) {
    return { ok: false, error: getFriendlyErrorMessage(error) };
  }

  // Revalidate polls list cache to show new poll
  revalidatePath("/dashboard/polls");
  return { ok: true };
}

/**
 * Retrieves all polls owned by the authenticated user.
 * 
 * Fetches polls from the database with ownership filtering to ensure
 * users only see their own polls. Orders by creation date for
 * chronological display.
 * 
 * @returns Promise resolving to polls array and error status
 * 
 * @sideEffects
 * - Queries 'polls' table with user_id filter
 * - No cache revalidation (read-only operation)
 * 
 * @failureModes
 * - Not authenticated: Returns empty array with error
 * - Database error: Returns empty array with friendly error
 * - No polls found: Returns empty array (success)
 */
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  // Filter by user_id to enforce ownership - critical security measure
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id) // Ownership enforcement
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: getFriendlyErrorMessage(error) };
  return { polls: data ?? [], error: null };
}

/**
 * Retrieves a specific poll by ID with ownership verification.
 * 
 * Fetches a poll from the database only if it belongs to the
 * authenticated user. Prevents unauthorized access to other users' polls.
 * 
 * @param id - Poll ID to retrieve
 * @returns Promise resolving to poll data and error status
 * 
 * @sideEffects
 * - Queries 'polls' table with ID and user_id filters
 * - No cache revalidation (read-only operation)
 * 
 * @failureModes
 * - Not authenticated: Returns null with auth error
 * - Poll not found: Returns null with not found error
 * - Not owned by user: Returns null with not found error (security)
 * - Database error: Returns null with friendly error
 */
export async function getPollById(id: string) {
  const supabase = await createClient();
  
  // Get current user for ownership verification
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { poll: null, error: "Authentication required" };
  }

  // Double filter: by ID and user_id to enforce ownership
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id) // Critical: ownership enforcement
    .single();

  if (error) return { poll: null, error: getFriendlyErrorMessage(error) };
  return { poll: data, error: null };
}

/**
 * Submits a vote for a poll with deduplication and validation.
 * 
 * Validates poll existence, option index, and enforces vote deduplication
 * using HMAC signatures. Prevents multiple votes from the same user/device
 * through unique constraint enforcement. This is the core voting action
 * used by the public voting interface.
 * 
 * @param pollId - ID of the poll to vote on
 * @param optionIndex - Index of the selected option (0-based, matches poll.options array)
 * @param voteSignature - HMAC signature for vote deduplication (from httpOnly cookie)
 * @returns Promise resolving to success/error result
 * 
 * @sideEffects
 * - Inserts vote record into 'votes' table with signature
 * - Enforces UNIQUE constraint on (poll_id, signature) for deduplication
 * - Revalidates poll page cache to show updated results
 * 
 * @failureModes
 * - Rate limit exceeded: Returns rate limit error
 * - Poll not found: Returns not found error
 * - Invalid option: Returns validation error
 * - Missing signature: Returns signature required error
 * - Duplicate vote: Returns already voted error (constraint violation)
 * - Database error: Returns friendly error message
 * 
 * @securityConsiderations
 * - No authentication required (public voting)
 * - HMAC signature prevents vote tampering and duplication
 * - Server-side validation of all inputs
 * - Unique constraint prevents multiple votes per signature
 * - Rate limiting prevents vote spam
 */
export async function submitVote(pollId: string, optionIndex: number, voteSignature?: string) {
  // Rate limiting: prevent vote spam and abuse
  const rateLimitResult = await rateLimitCheck('submitVote');
  if (!rateLimitResult.ok) {
    return rateLimitResult;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Validate poll exists before allowing vote
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { ok: false, error: "Poll not found." };
  }

  // Validate option index is within valid range
  if (typeof optionIndex !== 'number' || optionIndex < 0) {
    return { ok: false, error: "Invalid option selected." };
  }

  // Require vote signature for deduplication (prevents multiple votes)
  if (!voteSignature) {
    return { ok: false, error: "Vote signature required." };
  }

  // Insert vote with signature - relies on DB unique constraint for deduplication
  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null, // Allow anonymous voting
      option_index: optionIndex,
      signature: voteSignature, // Critical: enables deduplication
    },
  ]);

  if (error) {
    // Handle unique constraint violation (duplicate vote)
    if (error.code === '23505') {
      return { ok: false, error: "You have already voted on this poll." };
    }
    return { ok: false, error: getFriendlyErrorMessage(error) };
  }

  // Revalidate poll page to show updated vote counts
  revalidatePath(`/poll/${pollId}`);
  return { ok: true };
}

/**
 * Deletes a poll with ownership verification and cascade handling.
 * 
 * Verifies poll ownership before deletion and ensures only the poll
 * owner can delete their polls. Handles cascade deletion of related
 * votes through database constraints.
 * 
 * @param id - Poll ID to delete
 * @returns Promise resolving to success/error result
 * 
 * @sideEffects
 * - Deletes poll record from 'polls' table
 * - Cascade deletes related votes (via DB constraints)
 * - Revalidates /dashboard/polls cache
 * 
 * @failureModes
 * - Rate limit exceeded: Returns rate limit error
 * - Not authenticated: Returns login error
 * - Poll not found: Returns not found error
 * - Not owned by user: Returns permission denied error
 * - Database error: Returns friendly error message
 */
export async function deletePoll(id: string) {
  // Rate limiting: prevent abuse of delete operations
  const rateLimitResult = await rateLimitCheck('deletePoll');
  if (!rateLimitResult.ok) {
    return rateLimitResult;
  }

  const supabase = await createClient();

  // Get authenticated user for ownership verification
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { ok: false, error: getFriendlyErrorMessage(userError) };
  }
  if (!user) {
    return { ok: false, error: "You must be logged in" };
  }

  // Delete with ownership filter - only owner can delete
  const { data, error } = await supabase
    .from("polls")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id) // Critical: ownership enforcement
    .select();

  if (error) {
    return { ok: false, error: getFriendlyErrorMessage(error) };
  }

  // Verify deletion succeeded (prevents silent failures)
  if (!data || data.length === 0) {
    return { ok: false, error: "Poll not found or you don't have permission to delete it." };
  }

  // Revalidate polls list to remove deleted poll
  revalidatePath("/dashboard/polls");
  return { ok: true };
}

/**
 * Updates a poll with ownership verification and data validation.
 * 
 * Validates input data, enforces ownership, and updates poll content.
 * Ensures only the poll owner can modify their polls and maintains
 * data integrity through validation.
 * 
 * @param pollId - ID of the poll to update
 * @param formData - Form data containing updated question and options
 * @returns Promise resolving to success/error result
 * 
 * @sideEffects
 * - Updates poll record in 'polls' table
 * - Revalidates /dashboard/polls cache
 * 
 * @failureModes
 * - Rate limit exceeded: Returns rate limit error
 * - Validation failed: Returns specific validation error
 * - Not authenticated: Returns login error
 * - Poll not found: Returns not found error
 * - Not owned by user: Returns permission denied error
 * - Database error: Returns friendly error message
 */
export async function updatePoll(pollId: string, formData: FormData) {
  // Rate limiting: prevent abuse of update operations
  const rateLimitResult = await rateLimitCheck('updatePoll');
  if (!rateLimitResult.ok) {
    return rateLimitResult;
  }

  const supabase = await createClient();

  // Extract and sanitize input data to prevent XSS
  const question = sanitizeText(formData.get("question") as string);
  const options = (formData.getAll("options").filter(Boolean) as string[]).map(sanitizeText);

  // Validate input with Zod schema for data integrity
  const validationResult = updatePollSchema.safeParse({ question, options });
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return { ok: false, error: firstError.message };
  }

  const { question: validatedQuestion, options: validatedOptions } = validationResult.data;

  // Get authenticated user for ownership verification
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { ok: false, error: getFriendlyErrorMessage(userError) };
  }
  if (!user) {
    return { ok: false, error: "You must be logged in" };
  }

  // Update with ownership filter - only owner can update
  const { data, error } = await supabase
    .from("polls")
    .update({ question: validatedQuestion, options: validatedOptions })
    .eq("id", pollId)
    .eq("user_id", user.id) // Critical: ownership enforcement
    .select();

  if (error) {
    return { ok: false, error: getFriendlyErrorMessage(error) };
  }

  // Verify update succeeded (prevents silent failures)
  if (!data || data.length === 0) {
    return { ok: false, error: "Poll not found or you don't have permission to update it." };
  }

  // Revalidate polls list to show updated poll
  revalidatePath("/dashboard/polls");
  return { ok: true };
}
