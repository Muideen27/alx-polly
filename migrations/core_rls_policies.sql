-- =============================================
-- CORE RLS POLICIES (Idempotent)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLLS POLICIES
-- =============================================

-- Public read access
DROP POLICY IF EXISTS "polls_select_public" ON polls;
CREATE POLICY "polls_select_public" ON polls
    FOR SELECT
    USING (true);

-- Owner insert only
DROP POLICY IF EXISTS "polls_insert_owner" ON polls;
CREATE POLICY "polls_insert_owner" ON polls
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND owner = auth.uid());

-- Owner update only
DROP POLICY IF EXISTS "polls_update_owner" ON polls;
CREATE POLICY "polls_update_owner" ON polls
    FOR UPDATE
    USING (auth.uid() IS NOT NULL AND owner = auth.uid())
    WITH CHECK (owner = auth.uid());

-- Owner delete only
DROP POLICY IF EXISTS "polls_delete_owner" ON polls;
CREATE POLICY "polls_delete_owner" ON polls
    FOR DELETE
    USING (auth.uid() IS NOT NULL AND owner = auth.uid());

-- =============================================
-- POLL_OPTIONS POLICIES
-- =============================================

-- Public read access
DROP POLICY IF EXISTS "poll_options_select_public" ON poll_options;
CREATE POLICY "poll_options_select_public" ON poll_options
    FOR SELECT
    USING (true);

-- Poll owner can manage options
DROP POLICY IF EXISTS "poll_options_insert_owner" ON poll_options;
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

DROP POLICY IF EXISTS "poll_options_update_owner" ON poll_options;
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

DROP POLICY IF EXISTS "poll_options_delete_owner" ON poll_options;
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
-- VOTES POLICIES
-- =============================================

-- Public can vote on active polls
DROP POLICY IF EXISTS "votes_insert_public" ON votes;
CREATE POLICY "votes_insert_public" ON votes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND (polls.is_active IS NULL OR polls.is_active = true)
        )
    );

-- No updates allowed (append-only)
DROP POLICY IF EXISTS "votes_no_update" ON votes;
CREATE POLICY "votes_no_update" ON votes
    FOR UPDATE
    USING (false);

-- No deletes allowed (append-only)
DROP POLICY IF EXISTS "votes_no_delete" ON votes;
CREATE POLICY "votes_no_delete" ON votes
    FOR DELETE
    USING (false);

-- =============================================
-- UNIQUE CONSTRAINTS
-- =============================================

-- Poll options unique per poll by index
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_options_poll_idx_unique 
ON poll_options (poll_id, idx);

-- Votes unique per poll by signature/fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_poll_signature_unique 
ON votes (poll_id, signature) 
WHERE signature IS NOT NULL;
