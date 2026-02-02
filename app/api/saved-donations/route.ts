import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
  
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
  
  return supabase;
}

// GET - Fetch all saved donations for user
export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('saved_donations')
      .select(`
        *,
        garment:garments(*)
      `)
      .eq('user_id', user.id)
      .is('donated_at', null)
      .order('saved_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch saved donations:', error);
    return NextResponse.json({ error: 'Failed to fetch saved donations' }, { status: 500 });
  }
}

// POST - Save a garment for donation
export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { garment_id } = body;

    if (!garment_id) {
      return NextResponse.json({ error: 'garment_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_donations')
      .insert({
        garment_id,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already saved for donation' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to save donation:', error);
    return NextResponse.json({ error: 'Failed to save donation' }, { status: 500 });
  }
}

// DELETE - Remove a saved donation
export async function DELETE(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const garment_id = searchParams.get('garment_id');

    if (!garment_id) {
      return NextResponse.json({ error: 'garment_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('saved_donations')
      .delete()
      .eq('garment_id', garment_id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove saved donation:', error);
    return NextResponse.json({ error: 'Failed to remove saved donation' }, { status: 500 });
  }
}

// PATCH - Mark as donated
export async function PATCH(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { garment_id } = body;

    if (!garment_id) {
      return NextResponse.json({ error: 'garment_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_donations')
      .update({ donated_at: new Date().toISOString() })
      .eq('garment_id', garment_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to mark as donated:', error);
    return NextResponse.json({ error: 'Failed to mark as donated' }, { status: 500 });
  }
}
