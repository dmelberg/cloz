import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { Outfit, Garment, OutfitGarment } from '@/lib/database.types';

// GET /api/outfits/[id] - Get a single outfit with its garments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get outfit
  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (outfitError) {
    return NextResponse.json({ error: outfitError.message }, { status: 404 });
  }

  const outfitData = outfit as Outfit;

  // Get linked garments
  const { data: links } = await supabase
    .from('outfit_garments')
    .select('garment_id')
    .eq('outfit_id', id);

  const linksData = (links || []) as Pick<OutfitGarment, 'garment_id'>[];
  const garmentIds = linksData.map(l => l.garment_id);

  let garments: Garment[] = [];
  if (garmentIds.length > 0) {
    const { data } = await supabase
      .from('garments')
      .select('*')
      .in('id', garmentIds)
      .eq('user_id', user.id);
    garments = (data || []) as Garment[];
  }

  return NextResponse.json({
    ...outfitData,
    garments,
  });
}

// DELETE /api/outfits/[id] - Delete an outfit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify the outfit belongs to user
  const { data: outfit } = await supabase
    .from('outfits')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!outfit) {
    return NextResponse.json({ error: 'Outfit not found' }, { status: 404 });
  }

  // Get linked garments to decrement use counts
  const { data: links } = await supabase
    .from('outfit_garments')
    .select('garment_id')
    .eq('outfit_id', id);

  const linksData = (links || []) as Pick<OutfitGarment, 'garment_id'>[];

  // Decrement use_count for each garment
  for (const link of linksData) {
    const { data: garment } = await supabase
      .from('garments')
      .select('use_count')
      .eq('id', link.garment_id)
      .eq('user_id', user.id)
      .single();

    const garmentData = garment as Pick<Garment, 'use_count'> | null;
    if (garmentData && garmentData.use_count > 0) {
      await supabase
        .from('garments')
        .update({ use_count: garmentData.use_count - 1 })
        .eq('id', link.garment_id)
        .eq('user_id', user.id);
    }
  }

  // Delete outfit (cascade will remove outfit_garments)
  const { error } = await supabase
    .from('outfits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
