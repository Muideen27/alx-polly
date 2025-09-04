-- Add signature column to votes table
ALTER TABLE votes ADD COLUMN signature VARCHAR(255);

-- Create unique constraint on (poll_id, signature) to prevent duplicate votes
-- This ensures one vote per signature per poll
CREATE UNIQUE INDEX idx_votes_poll_signature_unique 
ON votes (poll_id, signature) 
WHERE signature IS NOT NULL;

-- Add index for performance on signature lookups
CREATE INDEX idx_votes_signature ON votes (signature);
