import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Category, Season, Garment } from '@/lib/database.types';

// GET /api/garments - Get all garments with optional filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') as Category | null;
  const season = searchParams.get('season') as Season | null;
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const order = searchParams.get('order') || 'desc';

  let query = supabase
    .from('garments')
    .select('*');

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

  const { data, error } = await supabase
    .from('garments')
    .insert({
      name,
      photo_url,
      quantity,
      use_count: 0,
      category,
      season,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Garment, { status: 201 });
}
