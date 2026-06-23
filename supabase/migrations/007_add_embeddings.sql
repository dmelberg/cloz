-- =============================================================================
-- ADD CLIP EMBEDDINGS FOR VISUAL GARMENT MATCHING
-- =============================================================================
-- 
-- This migration adds vector embedding support using pgvector for improved
-- garment matching in outfit analysis. CLIP embeddings enable visual similarity
-- matching instead of relying on text-based name matching.
--
-- =============================================================================

-- Enable pgvector extension (Supabase has this available)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to garments table
-- Jina CLIP v2 produces 1024-dimensional vectors
ALTER TABLE garments ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- Create index for fast cosine similarity search
-- Using ivfflat for approximate nearest neighbor search
-- Note: Index will be more effective after data is populated
CREATE INDEX IF NOT EXISTS idx_garments_embedding 
ON garments USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function to find similar garments by embedding
CREATE OR REPLACE FUNCTION match_garments_by_embedding(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  photo_url text,
  category category_type,
  season season_type,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.photo_url,
    g.category,
    g.season,
    1 - (g.embedding <=> query_embedding) as similarity
  FROM garments g
  WHERE 
    g.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR g.user_id = filter_user_id)
    AND (filter_category IS NULL OR g.category::text = filter_category)
    AND 1 - (g.embedding <=> query_embedding) > match_threshold
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION match_garments_by_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION match_garments_by_embedding TO anon;

-- =============================================================================
-- NOTES:
-- - The embedding column stores 1024-dimensional Jina CLIP v2 vectors
-- - Cosine similarity is used (<=> operator returns cosine distance)
-- - Similarity = 1 - distance, so higher is more similar
-- - The ivfflat index provides fast approximate nearest neighbor search
-- - Run the backfill script after this migration to populate embeddings
-- =============================================================================
