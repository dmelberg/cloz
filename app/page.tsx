'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from './components/PageHeader';
import StatCard from './components/Analytics/StatCard';
import GarmentList from './components/Analytics/GarmentList';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Shirt, Calendar, Target, Plus } from 'lucide-react';
import type { Garment } from '@/lib/database.types';

interface AnalyticsData {
  stats: {
    totalGarments: number;
    totalOutfits: number;
    utilizationPercent: number;
  };
  mostWorn: Garment[];
  leastWorn: Garment[];
  donationSuggestions: Garment[];
}

export default function HomePage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [thresholdMonths, setThresholdMonths] = useState(6);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics?thresholdMonths=${thresholdMonths}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [thresholdMonths]);

  useEffect(() => {
    fetch('/api/preferences')
      .then(res => res.json())
      .then(prefs => {
        setThresholdMonths(prefs.donation_threshold_months || 6);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Home" />

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex flex-col items-center gap-2">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <Skeleton className="h-12 w-full rounded-none" />
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3 px-4 py-3 border-t border-border">
                      <Skeleton className="size-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-6 w-8 ml-auto" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Garments"
                value={data.stats.totalGarments}
                icon={<Shirt className="size-4" />}
              />
              <StatCard
                label="Outfits"
                value={data.stats.totalOutfits}
                icon={<Calendar className="size-4" />}
              />
              <StatCard
                label="Utilization"
                value={`${data.stats.utilizationPercent}%`}
                icon={<Target className="size-4" />}
              />
            </div>

            {/* Donation Suggestions */}
            {data.donationSuggestions.length > 0 && (
              <GarmentList
                title={`Consider Donating (${data.donationSuggestions.length} items)`}
                garments={data.donationSuggestions.slice(0, 5)}
                variant="warning"
                emptyMessage="All your clothes are being worn!"
              />
            )}

            {/* Most Worn */}
            <GarmentList
              title="Most Worn (Top 5)"
              garments={data.mostWorn}
              emptyMessage="Start logging outfits to see stats"
            />

            {/* Least Worn */}
            <GarmentList
              title="Least Worn (Bottom 5)"
              garments={data.leastWorn}
              emptyMessage="Add garments to your closet"
            />

            {/* Empty State */}
            {data.stats.totalGarments === 0 && (
              <div className="text-center py-12 px-4">
                <div className="inline-flex items-center justify-center size-20 rounded-full bg-muted mb-4">
                  <Shirt className="size-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Welcome to Cloz!</h3>
                <p className="mt-1 text-muted-foreground text-sm max-w-xs mx-auto">
                  Start building your digital wardrobe by adding your first garment
                </p>
                <Button asChild className="mt-6 rounded-full" size="lg">
                  <Link href="/closet/add">
                    <Plus className="size-5 mr-2" />
                    Add Your First Garment
                  </Link>
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load analytics</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchAnalytics()}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
