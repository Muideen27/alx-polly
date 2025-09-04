-- Enable Row Level Security on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLLS TABLE POLICIES
-- =============================================

-- Allow public to read polls
CREATE POLICY "polls_select_public" ON polls
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert polls they own
CREATE POLICY "polls_insert_owner" ON polls
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND owner = auth.uid());

-- Allow owners to update their polls
CREATE POLICY "polls_update_owner" ON polls
    FOR UPDATE
    USING (auth.uid() IS NOT NULL AND owner = auth.uid())
    WITH CHECK (owner = auth.uid());

-- Allow owners to delete their polls
CREATE POLICY "polls_delete_owner" ON polls
    FOR DELETE
    USING (auth.uid() IS NOT NULL AND owner = auth.uid());

-- =============================================
-- POLL_OPTIONS TABLE POLICIES
-- =============================================

-- Allow public to read poll options
CREATE POLICY "poll_options_select_public" ON poll_options
    FOR SELECT
    USING (true);

-- Allow poll owners to insert options for their polls
CREATE POLICY "poll_options_insert_owner" ON poll_options
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.owner = auth.uid()
        )
    );

-- Allow poll owners to update options for their polls
CREATE POLICY "poll_options_update_owner" ON poll_options
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.owner = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.owner = auth.uid()
        )
    );

-- Allow poll owners to delete options for their polls
CREATE POLICY "poll_options_delete_owner" ON poll_options
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.owner = auth.uid()
        )
    );

-- =============================================
-- VOTES TABLE POLICIES
-- =============================================

-- Allow public to insert votes when poll exists and is active
CREATE POLICY "votes_insert_public" ON votes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND (polls.is_active IS NULL OR polls.is_active = true)
        )
    );

-- Prevent all updates to votes (append-only)
CREATE POLICY "votes_no_update" ON votes
    FOR UPDATE
    USING (false);

-- Prevent all deletes from votes (append-only)
CREATE POLICY "votes_no_delete" ON votes
    FOR DELETE
    USING (false);

-- =============================================
-- UNIQUE INDEXES
-- =============================================

-- Ensure poll_options are unique per poll by index
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_options_poll_idx_unique 
ON poll_options (poll_id, idx);

-- Ensure votes are unique per poll by voter fingerprint/signature
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_poll_fingerprint_unique 
ON votes (poll_id, signature) 
WHERE signature IS NOT NULL;

-- Alternative: If using voter_fingerprint instead of signature
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_poll_fingerprint_unique 
-- ON votes (poll_id, voter_fingerprint) 
-- WHERE voter_fingerprint IS NOT NULL;

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Index for poll lookups by owner
CREATE INDEX IF NOT EXISTS idx_polls_owner ON polls (owner);

-- Index for poll_options by poll_id
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options (poll_id);

-- Index for votes by poll_id
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes (poll_id);

-- Index for votes by signature/fingerprint
CREATE INDEX IF NOT EXISTS idx_votes_signature ON votes (signature);

-- Index for votes by user_id (if tracking authenticated votes)
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes (user_id) WHERE user_id IS NOT NULL;

-- =============================================
-- ADD MISSING COLUMNS (if needed)
-- =============================================

-- Add is_active column to polls if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'polls' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE polls ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add signature column to votes if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'votes' AND column_name = 'signature'
    ) THEN
        ALTER TABLE votes ADD COLUMN signature VARCHAR(255);
    END IF;
END $$;

-- Add idx column to poll_options if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'poll_options' AND column_name = 'idx'
    ) THEN
        ALTER TABLE poll_options ADD COLUMN idx INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;
