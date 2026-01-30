import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { Outfit, Garment } from '@/lib/database.types';

// GET /api/outfits - Get all outfits with optional date filtering
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month'); // YYYY-MM format
  const date = searchParams.get('date'); // YYYY-MM-DD format

  let query = supabase
    .from('outfits')
    .select('*')
    .eq('user_id', user.id)
    .order('worn_date', { ascending: false });

  if (date) {
    query = query.eq('worn_date', date);
  } else if (month) {
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
    query = query.gte('worn_date', startDate).lte('worn_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Outfit[]);
}

// POST /api/outfits - Create a new outfit with linked garments
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    photo_url: string;
    worn_date: string;
    garment_ids?: string[];
  };
  const { photo_url, worn_date, garment_ids } = body;

  if (!photo_url || !worn_date) {
    return NextResponse.json(
      { error: 'Missing required fields: photo_url, worn_date' },
      { status: 400 }
    );
  }

  // Create outfit
  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .insert({ photo_url, worn_date, user_id: user.id })
    .select()
    .single();

  if (outfitError) {
    return NextResponse.json({ error: outfitError.message }, { status: 500 });
  }

  const outfitData = outfit as Outfit;

  // Link garments to outfit and increment use counts
  if (garment_ids && garment_ids.length > 0) {
    // Create outfit_garments links
    const links = garment_ids.map((garment_id: string) => ({
      outfit_id: outfitData.id,
      garment_id,
    }));

    const { error: linkError } = await supabase
      .from('outfit_garments')
      .insert(links);

    if (linkError) {
      console.error('Failed to link garments:', linkError);
    }

    // Increment use_count for each garment (only user's garments)
    for (const garment_id of garment_ids) {
      const { data: garment } = await supabase
        .from('garments')
        .select('use_count')
        .eq('id', garment_id)
        .eq('user_id', user.id)
        .single();

      const garmentData = garment as Garment | null;
      if (garmentData) {
        await supabase
          .from('garments')
          .update({ use_count: garmentData.use_count + 1 })
          .eq('id', garment_id)
          .eq('user_id', user.id);
      }
    }
  }

  return NextResponse.json(outfitData, { status: 201 });
}
