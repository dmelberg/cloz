-- Create saved_donations table to track items user decides to donate
CREATE TABLE IF NOT EXISTS saved_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garment_id UUID NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    donated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    UNIQUE(garment_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_donations_user_id ON saved_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_donations_garment_id ON saved_donations(garment_id);

-- Enable RLS
ALTER TABLE saved_donations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own saved donations"
    ON saved_donations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved donations"
    ON saved_donations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved donations"
    ON saved_donations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved donations"
    ON saved_donations FOR DELETE
    USING (auth.uid() = user_id);
