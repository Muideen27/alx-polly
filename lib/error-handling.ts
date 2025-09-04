import { logger } from './logger';

// Database error codes to friendly messages mapping
const DB_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'This action has already been completed.',
  '23503': 'Referenced item not found.',
  '23502': 'Required field is missing.',
  '42501': 'You do not have permission to perform this action.',
  '42P01': 'Requested resource not found.',
  'PGRST116': 'Requested resource not found.',
  'PGRST301': 'You do not have permission to perform this action.',
  'PGRST302': 'Authentication required.',
  'PGRST303': 'You do not have permission to perform this action.',
};

// Supabase error codes to friendly messages
const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  'invalid_credentials': 'Invalid email or password.',
  'email_not_confirmed': 'Please check your email and confirm your account.',
  'weak_password': 'Password is too weak. Please choose a stronger password.',
  'user_not_found': 'User not found.',
  'email_address_invalid': 'Please enter a valid email address.',
  'signup_disabled': 'New account registration is currently disabled.',
  'email_address_not_authorized': 'This email address is not authorized.',
  'invalid_request': 'Invalid request. Please try again.',
  'invalid_grant': 'Invalid credentials.',
  'invalid_token': 'Session expired. Please log in again.',
  'token_expired': 'Session expired. Please log in again.',
  'refresh_token_not_found': 'Session expired. Please log in again.',
  'invalid_refresh_token': 'Session expired. Please log in again.',
  'invalid_otp': 'Invalid verification code.',
  'otp_expired': 'Verification code has expired.',
  'email_rate_limit_exceeded': 'Too many requests. Please try again later.',
  'sms_rate_limit_exceeded': 'Too many requests. Please try again later.',
  'phone_number_invalid': 'Please enter a valid phone number.',
  'invalid_phone_number': 'Please enter a valid phone number.',
  'phone_number_not_found': 'Phone number not found.',
  'invalid_email': 'Please enter a valid email address.',
  'invalid_password': 'Password does not meet requirements.',
  'invalid_user_data': 'Invalid user information provided.',
  'invalid_claims': 'Invalid user claims.',
  'invalid_audience': 'Invalid audience.',
  'invalid_issuer': 'Invalid issuer.',
  'invalid_jwt': 'Invalid authentication token.',
  'invalid_webhook': 'Invalid webhook request.',
  'invalid_webhook_signature': 'Invalid webhook signature.',
  'invalid_webhook_payload': 'Invalid webhook payload.',
  'invalid_webhook_event': 'Invalid webhook event.',
  'invalid_webhook_topic': 'Invalid webhook topic.',
  'invalid_webhook_version': 'Invalid webhook version.',
  'invalid_webhook_environment': 'Invalid webhook environment.',
  'invalid_webhook_application': 'Invalid webhook application.',
  'invalid_webhook_organization': 'Invalid webhook organization.',
  'invalid_webhook_user': 'Invalid webhook user.',
  'invalid_webhook_team': 'Invalid webhook team.',
  'invalid_webhook_project': 'Invalid webhook project.',
  'invalid_webhook_workspace': 'Invalid webhook workspace.',
  'invalid_webhook_environment': 'Invalid webhook environment.',
  'invalid_webhook_application': 'Invalid webhook application.',
  'invalid_webhook_organization': 'Invalid webhook organization.',
  'invalid_webhook_user': 'Invalid webhook user.',
  'invalid_webhook_team': 'Invalid webhook team.',
  'invalid_webhook_project': 'Invalid webhook project.',
  'invalid_webhook_workspace': 'Invalid webhook workspace.',
};

export function getFriendlyErrorMessage(error: any): string {
  // Log the full error for debugging
  logger.error('Database/API Error:', {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    stack: error?.stack,
  });

  // Check for specific error codes first
  if (error?.code && DB_ERROR_MESSAGES[error.code]) {
    return DB_ERROR_MESSAGES[error.code];
  }

  // Check for Supabase error messages
  if (error?.message && SUPABASE_ERROR_MESSAGES[error.message]) {
    return SUPABASE_ERROR_MESSAGES[error.message];
  }

  // Check for common error patterns
  if (error?.message?.includes('duplicate key')) {
    return 'This item already exists.';
  }

  if (error?.message?.includes('foreign key')) {
    return 'Referenced item not found.';
  }

  if (error?.message?.includes('permission denied')) {
    return 'You do not have permission to perform this action.';
  }

  if (error?.message?.includes('not found')) {
    return 'Requested resource not found.';
  }

  if (error?.message?.includes('unauthorized')) {
    return 'Authentication required.';
  }

  if (error?.message?.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }

  if (error?.message?.includes('rate limit')) {
    return 'Too many requests. Please try again later.';
  }

  if (error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  if (error?.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove any potential HTML tags and dangerous characters
  return text
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}
