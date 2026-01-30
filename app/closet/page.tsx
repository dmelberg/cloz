'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import GarmentCard from '../components/GarmentCard';
import type { Garment, Category, Season } from '@/lib/database.types';

const categories: (Category | 'all')[] = ['all', 'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'pijama'];
const seasons: (Season | 'all')[] = ['all', 'mid-season', 'summer', 'winter', 'all-season'];

export default function ClosetPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedSeason, setSelectedSeason] = useState<Season | 'all'>('all');

  useEffect(() => {
    fetchGarments();
  }, [selectedCategory, selectedSeason]);

  async function fetchGarments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedSeason !== 'all') params.set('season', selectedSeason);

      const response = await fetch(`/api/garments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setGarments(data);
      }
    } catch (error) {
      console.error('Failed to fetch garments:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader
        title="My Closet"
        rightAction={
          <Link
            href="/closet/add"
            className="p-2 text-violet-600 dark:text-violet-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        }
      />

      {/* Filters */}
      <div className="px-4 py-3 space-y-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Season Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {seasons.map((season) => (
            <button
              key={season}
              onClick={() => setSelectedSeason(season)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedSeason === season
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {season === 'all' ? 'All Seasons' : season.charAt(0).toUpperCase() + season.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Garments Grid */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-zinc-200 dark:bg-zinc-800" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : garments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">No garments yet</h3>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">Start by adding your first garment</p>
            <Link
              href="/closet/add"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-violet-600 text-white rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Garment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {garments.map((garment) => (
              <GarmentCard key={garment.id} garment={garment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
