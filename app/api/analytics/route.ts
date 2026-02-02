import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { Garment } from '@/lib/database.types';

// GET /api/analytics - Get analytics data for the home page
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const thresholdMonths = parseInt(searchParams.get('thresholdMonths') || '6', 10);

  try {
    // Get all garments for this user
    const { data: garmentsData, error: garmentsError } = await supabase
      .from('garments')
      .select('*')
      .eq('user_id', user.id)
      .order('use_count', { ascending: false });

    if (garmentsError) {
      throw new Error(garmentsError.message);
    }

    const garments = (garmentsData || []) as Garment[];

    // Get all outfits count for this user
    const { count: totalOutfits } = await supabase
      .from('outfits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Calculate donation threshold date
    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);

    // Most worn garments (top 5)
    const mostWorn = garments.slice(0, 5);

    // Least worn garments (bottom 5)
    const leastWorn = [...garments]
      .sort((a, b) => a.use_count - b.use_count)
      .slice(0, 5);

    // Donation suggestions: garments with 0-1 uses AND created before threshold
    const donationSuggestions = garments.filter(garment => {
      const createdAt = new Date(garment.created_at);
      return garment.use_count <= 1 && createdAt < thresholdDate;
    });

    // Calculate wardrobe utilization (% of items worn at least once)
    const wornGarments = garments.filter(g => g.use_count > 0).length;
    const utilizationPercent = garments.length > 0 
      ? Math.round((wornGarments / garments.length) * 100) 
      : 0;

    return NextResponse.json({
      stats: {
        totalGarments: garments.length,
        totalOutfits: totalOutfits || 0,
        utilizationPercent,
      },
      mostWorn,
      leastWorn,
      donationSuggestions,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
