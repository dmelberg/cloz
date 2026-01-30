-- =============================================================================
-- DATA MIGRATION SCRIPT
-- =============================================================================
-- 
-- This script migrates existing data (created before auth was added) to a user.
-- Run this AFTER you have:
--   1. Applied migration 004_add_user_authentication.sql
--   2. Created your user account via the signup page
--   3. Copied your user ID from Supabase Auth dashboard
--
-- HOW TO GET YOUR USER ID:
--   1. Go to Supabase Dashboard > Authentication > Users
--   2. Find your user and copy the UUID from the "User UID" column
--   3. Replace 'YOUR-USER-UUID-HERE' below with your actual UUID
--
-- =============================================================================
-- STEP 1: Set your user ID here (replace the placeholder)
-- Example: DO $$ DECLARE user_uuid UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DO $$
DECLARE user_uuid UUID := '7ee91062-9dff-4792-9983-f6909a6edd7e';
-- <-- REPLACE THIS WITH YOUR USER ID
BEGIN -- Verify the user exists
IF NOT EXISTS (
  SELECT 1
  FROM auth.users
  WHERE id = user_uuid
) THEN RAISE EXCEPTION 'User with ID % does not exist. Please check your user UUID.',
user_uuid;
END IF;
-- STEP 2: Migrate garments
UPDATE garments
SET user_id = user_uuid
WHERE user_id IS NULL;
RAISE NOTICE 'Migrated % garments',
(
  SELECT COUNT(*)
  FROM garments
  WHERE user_id = user_uuid
);
-- STEP 3: Migrate outfits
UPDATE outfits
SET user_id = user_uuid
WHERE user_id IS NULL;
RAISE NOTICE 'Migrated % outfits',
(
  SELECT COUNT(*)
  FROM outfits
  WHERE user_id = user_uuid
);
-- STEP 4: Migrate preferences
UPDATE preferences
SET user_id = user_uuid
WHERE user_id IS NULL;
RAISE NOTICE 'Migrated % preferences rows',
(
  SELECT COUNT(*)
  FROM preferences
  WHERE user_id = user_uuid
);
RAISE NOTICE 'Migration complete!';
END $$;
-- =============================================================================
-- OPTIONAL: Make user_id NOT NULL (run this after migration is successful)
-- =============================================================================
-- Uncomment and run these lines ONLY after verifying all data has been migrated:
--
-- ALTER TABLE garments ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE outfits ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE preferences ALTER COLUMN user_id SET NOT NULL;
-- =============================================================================