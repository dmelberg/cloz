-- Cloz App Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories enum type
CREATE TYPE category_type AS ENUM ('tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories');

-- Seasons enum type  
CREATE TYPE season_type AS ENUM ('mid-season', 'summer', 'winter', 'all-season');

-- Garments table
CREATE TABLE garments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  category category_type NOT NULL,
  season season_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outfits table
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_url TEXT NOT NULL,
  worn_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for outfit-garment relationships
CREATE TABLE outfit_garments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  garment_id UUID NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
  UNIQUE(outfit_id, garment_id)
);

-- Preferences table (single row for app settings)
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_threshold_months INTEGER NOT NULL DEFAULT 6
);

-- Insert default preferences
INSERT INTO preferences (donation_threshold_months) VALUES (6);

-- Create indexes for performance
CREATE INDEX idx_garments_category ON garments(category);
CREATE INDEX idx_garments_season ON garments(season);
CREATE INDEX idx_garments_use_count ON garments(use_count);
CREATE INDEX idx_garments_created_at ON garments(created_at);
CREATE INDEX idx_outfits_worn_date ON outfits(worn_date);
CREATE INDEX idx_outfit_garments_outfit ON outfit_garments(outfit_id);
CREATE INDEX idx_outfit_garments_garment ON outfit_garments(garment_id);

-- Row Level Security (RLS) - disabled for personal use app
-- If you want to enable multi-user later, add RLS policies here

-- Storage bucket setup (run in Supabase Dashboard > Storage)
-- 1. Create bucket named 'images' with public access
-- 2. Add policy: Allow public read access
-- 3. Add policy: Allow authenticated/anon insert access
