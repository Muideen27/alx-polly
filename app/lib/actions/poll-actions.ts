"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getFriendlyErrorMessage, sanitizeText } from "@/lib/error-handling";
import { rateLimitCheck } from "@/lib/rate-limiter";

// Validation schemas
const pollQuestionSchema = z
  .string()
  .min(1, "Question is required")
  .min(10, "Question must be at least 10 characters")
  .max(500, "Question must be less than 500 characters")
  .trim();

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
      const uniqueOptions = new Set(options.map(opt => opt.toLowerCase()));
      return uniqueOptions.size === options.length;
    },
    "Options must be unique (case-insensitive)"
  );

const createPollSchema = z.object({
  question: pollQuestionSchema,
  options: pollOptionsSchema,
});

const updatePollSchema = z.object({
  question: pollQuestionSchema,
  options: pollOptionsSchema,
});

// CREATE POLL
export async function createPoll(formData: FormData) {
  // Rate limiting
  const rateLimitResult = await rateLimitCheck('createPoll');
  if (!rateLimitResult.ok) {
    return rateLimitResult;
  }

  const supabase = await createClient();

  // Extract and validate input data
  const question = sanitizeText(formData.get("question") as string);
  const options = (formData.getAll("options").filter(Boolean) as string[]).map(sanitizeText);

  // Validate input with Zod
  const validationResult = createPollSchema.safeParse({ question, options });
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return { ok: false, error: firstError.message };
  }

  const { question: validatedQuestion, options: validatedOptions } = validationResult.data;

  // Get user from session
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

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question: validatedQuestion,
      options: validatedOptions,
    },
  ]);

  if (error) {
    return { ok: false, error: getFriendlyErrorMessage(error) };
  }

  revalidatePath("/dashboard/polls");
  return { ok: true };
}

// GET USER POLLS
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: getFriendlyErrorMessage(error) };
  return { polls: data ?? [], error: null };
}

// GET POLL BY ID
export async function getPollById(id: string) {
  const supabase = await createClient();
  
  // Get current user for ownership check
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { poll: null, error: "Authentication required" };
  }

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { poll: null, error: getFriendlyErrorMessage(error) };
  return { poll: data, error: null };
}

// SUBMIT VOTE
export async function submitVote(pollId: string, optionIndex: number, voteSignature?: string) {
  // Rate limiting
  const rateLimitResult = await rateLimitCheck('submitVote');
  if (!rateLimitResult.ok) {
    return rateLimitResult;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Validate poll exists
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { ok: false, error: "Poll not found." };
  }

  // Validate option index
  if (typeof optionIndex !== 'number' || optionIndex < 0) {
    return { ok: false, error: "Invalid option selected." };
  }

  // Require vote signature for anonymous voting
  if (!voteSignature) {
    return { ok: false, error: "Vote signature required." };
  }

  // Insert vote with signature for deduplication
  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null,
      option_index: optionIndex,
      signature: voteSignature,
    },
  ]);

  if (error) {
    // Check if it's a unique constraint violation
    if (error.code === '23505') {
      return { ok: false, error: "You have already voted on this poll." };
    }
    return { ok: false, error: getFriendlyErrorMessage(error) };
  }

  revalidatePath(`/poll/${pollId}`);
  return { ok: true };
}

// DELETE POLL
export async function deletePoll(id: string) {
  // Rate limiting
  const rateLimitResult = await rateLimitCheck('deletePoll');
  if (!rateLimitResult.ok) {
    return rateLimitResult;
  }

  const supabase = await createClient();

  // Get user from session
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

  const { data, error } = await supabase
    .from("polls")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select();

  if (error) {
    return { ok: false, error: getFriendlyErrorMessage(error) };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "Poll not found or you don't have permission to delete it." };
  }

  revalidatePath("/dashboard/polls");
  return { ok: true };
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  // Rate limiting
  const rateLimitResult = await rateLimitCheck('updatePoll');
  if (!rateLimitResult.ok) {
    return rateLimitResult;
  }

  const supabase = await createClient();

  // Extract and validate input data
  const question = sanitizeText(formData.get("question") as string);
  const options = (formData.getAll("options").filter(Boolean) as string[]).map(sanitizeText);

  // Validate input with Zod
  const validationResult = updatePollSchema.safeParse({ question, options });
  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return { ok: false, error: firstError.message };
  }

  const { question: validatedQuestion, options: validatedOptions } = validationResult.data;

  // Get user from session
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

  // Only allow updating polls owned by the user
  const { data, error } = await supabase
    .from("polls")
    .update({ question: validatedQuestion, options: validatedOptions })
    .eq("id", pollId)
    .eq("user_id", user.id)
    .select();

  if (error) {
    return { ok: false, error: getFriendlyErrorMessage(error) };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "Poll not found or you don't have permission to update it." };
  }

  revalidatePath("/dashboard/polls");
  return { ok: true };
}
