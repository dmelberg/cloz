import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { Category, Season, Garment } from '@/lib/database.types';
import { generateImageEmbedding, formatEmbeddingForStorage } from '@/lib/embeddings';

// GET /api/garments - Get all garments with optional filters
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') as Category | null;
  const season = searchParams.get('season') as Season | null;
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const order = searchParams.get('order') || 'desc';

  let query = supabase
    .from('garments')
    .select('*')
    .eq('user_id', user.id);

  if (category) {
    query = query.eq('category', category);
  }

  if (season) {
    query = query.eq('season', season);
  }

  query = query.order(sortBy, { ascending: order === 'asc' });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Garment[]);
}

// POST /api/garments - Create a new garment
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  
  const { name, photo_url, quantity = 1, category, season } = body as {
    name: string;
    photo_url: string;
    quantity?: number;
    category: Category;
    season: Season;
  };

  if (!name || !photo_url || !category || !season) {
    return NextResponse.json(
      { error: 'Missing required fields: name, photo_url, category, season' },
      { status: 400 }
    );
  }

  // Generate CLIP embedding for the garment image
  let embedding: string | null = null;
  try {
    const embeddingVector = await generateImageEmbedding(photo_url);
    embedding = formatEmbeddingForStorage(embeddingVector);
    console.log('Generated embedding for new garment');
  } catch (embeddingError) {
    // Log but don't fail - embedding can be generated later via backfill
    console.warn('Failed to generate embedding:', embeddingError);
  }

  const { data, error } = await supabase
    .from('garments')
    .insert({
      name,
      photo_url,
      quantity,
      use_count: 0,
      category,
      season,
      user_id: user.id,
      ...(embedding && { embedding }),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Garment, { status: 201 });
}
