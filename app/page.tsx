'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from './components/PageHeader';
import StatCard from './components/Analytics/StatCard';
import GarmentList from './components/Analytics/GarmentList';
import type { Garment } from '@/lib/database.types';

interface AnalyticsData {
  stats: {
    totalGarments: number;
    totalOutfits: number;
    totalWears: number;
    mostWornCategory: string;
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
    // Fetch preferences first
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader title="Cloz" />

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-zinc-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Total Garments"
                value={data.stats.totalGarments}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                }
              />
              <StatCard
                label="Outfits Logged"
                value={data.stats.totalOutfits}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <StatCard
                label="Total Wears"
                value={data.stats.totalWears}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
              <StatCard
                label="Top Category"
                value={data.stats.mostWornCategory}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                }
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
              title="Most Worn (Top 10)"
              garments={data.mostWorn}
              emptyMessage="Start logging outfits to see stats"
            />

            {/* Least Worn */}
            <GarmentList
              title="Least Worn (Bottom 10)"
              garments={data.leastWorn}
              emptyMessage="Add garments to your closet"
            />

            {/* Empty State */}
            {data.stats.totalGarments === 0 && (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">Welcome to Cloz!</h3>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">Start by adding garments to your closet</p>
                <Link
                  href="/closet/add"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-violet-600 text-white rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Garment
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            Failed to load analytics
          </div>
        )}
      </div>
    </div>
  );
}
