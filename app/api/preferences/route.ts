import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { Preferences } from '@/lib/database.types';

// GET /api/preferences - Get preferences
export async function GET() {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // If no preferences exist, return default
    return NextResponse.json({
      id: 'default',
      donation_threshold_months: 6,
      user_id: user.id,
    });
  }

  return NextResponse.json(data as Preferences);
}

// PATCH /api/preferences - Update preferences
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { donation_threshold_months: number };
  const { donation_threshold_months } = body;

  if (typeof donation_threshold_months !== 'number' || donation_threshold_months < 1) {
    return NextResponse.json(
      { error: 'donation_threshold_months must be a positive number' },
      { status: 400 }
    );
  }

  // Get existing preferences for this user
  const { data: existing } = await supabase
    .from('preferences')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const existingData = existing as Pick<Preferences, 'id'> | null;

  if (existingData) {
    // Update existing
    const { data, error } = await supabase
      .from('preferences')
      .update({ donation_threshold_months })
      .eq('id', existingData.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Preferences);
  } else {
    // Create new for this user
    const { data, error } = await supabase
      .from('preferences')
      .insert({ donation_threshold_months, user_id: user.id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Preferences, { status: 201 });
  }
}
