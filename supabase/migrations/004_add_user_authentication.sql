-- Migration: Add user authentication support
-- This adds user_id columns to all tables and enables Row Level Security

-- =============================================================================
-- STEP 1: Add user_id columns to all tables
-- =============================================================================

-- Add user_id to garments (nullable initially for existing data migration)
ALTER TABLE garments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to outfits
ALTER TABLE outfits ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to preferences
ALTER TABLE preferences ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for efficient queries
CREATE INDEX idx_garments_user_id ON garments(user_id);
CREATE INDEX idx_outfits_user_id ON outfits(user_id);
CREATE INDEX idx_preferences_user_id ON preferences(user_id);

-- =============================================================================
-- STEP 2: Enable Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- Garments: Users can only access their own garments
CREATE POLICY "Users can view own garments" ON garments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garments" ON garments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garments" ON garments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own garments" ON garments
  FOR DELETE USING (auth.uid() = user_id);

-- Outfits: Users can only access their own outfits
CREATE POLICY "Users can view own outfits" ON outfits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outfits" ON outfits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outfits" ON outfits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outfits" ON outfits
  FOR DELETE USING (auth.uid() = user_id);

-- Outfit_garments: Access allowed if user owns the related outfit
CREATE POLICY "Users can view own outfit_garments" ON outfit_garments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM outfits WHERE id = outfit_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own outfit_garments" ON outfit_garments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM outfits WHERE id = outfit_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own outfit_garments" ON outfit_garments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM outfits WHERE id = outfit_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own outfit_garments" ON outfit_garments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM outfits WHERE id = outfit_id AND user_id = auth.uid())
  );

-- Preferences: Users can only access their own preferences
CREATE POLICY "Users can view own preferences" ON preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON preferences
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 3: Update Storage Policies for authenticated access
-- =============================================================================

-- Drop existing anonymous policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes" ON storage.objects;

-- New authenticated policies
CREATE POLICY "Authenticated users can read images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete images" ON storage.objects
  FOR DELETE USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- =============================================================================
-- NOTES FOR DATA MIGRATION:
-- =============================================================================
-- After creating your first user account, run these commands manually in 
-- the Supabase SQL editor to migrate existing data:
--
-- UPDATE garments SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- UPDATE outfits SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- UPDATE preferences SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
--
-- Then make user_id NOT NULL:
-- ALTER TABLE garments ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE outfits ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE preferences ALTER COLUMN user_id SET NOT NULL;
-- =============================================================================
