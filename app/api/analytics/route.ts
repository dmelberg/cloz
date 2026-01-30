import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Garment } from '@/lib/database.types';

// GET /api/analytics - Get analytics data for the home page
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const thresholdMonths = parseInt(searchParams.get('thresholdMonths') || '6', 10);

  try {
    // Get all garments
    const { data: garmentsData, error: garmentsError } = await supabase
      .from('garments')
      .select('*')
      .order('use_count', { ascending: false });

    if (garmentsError) {
      throw new Error(garmentsError.message);
    }

    const garments = (garmentsData || []) as Garment[];

    // Get all outfits count
    const { count: totalOutfits } = await supabase
      .from('outfits')
      .select('*', { count: 'exact', head: true });

    // Calculate donation threshold date
    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);

    // Most worn garments (top 10)
    const mostWorn = garments.slice(0, 10);

    // Least worn garments (bottom 10)
    const leastWorn = [...garments]
      .sort((a, b) => a.use_count - b.use_count)
      .slice(0, 10);

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
