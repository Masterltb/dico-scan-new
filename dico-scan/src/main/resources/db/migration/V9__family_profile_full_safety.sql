-- =================================================================
-- V9: Overhaul family_profiles to store a full SafetyProfile JSONB
-- Drop simple allergies/diet columns, replace with safety_profile JSONB
-- =================================================================

ALTER TABLE family_profiles
    DROP COLUMN IF EXISTS allergies,
    DROP COLUMN IF EXISTS diet;

ALTER TABLE family_profiles
    ADD COLUMN IF NOT EXISTS safety_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

-- GIN index for fast safety profile queries
CREATE INDEX IF NOT EXISTS idx_family_profile_safety_gin
    ON family_profiles USING GIN (safety_profile);
