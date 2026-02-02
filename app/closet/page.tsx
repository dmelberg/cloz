'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import GarmentCard from '../components/GarmentCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Shirt, LayoutGrid } from 'lucide-react';
import type { Garment, Category, Season } from '@/lib/database.types';

const categories: (Category | 'all')[] = ['all', 'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'pijama'];
const seasons: (Season | 'all')[] = ['all', 'mid-season', 'summer', 'winter', 'all-season'];

const categoryLabels: Record<Category | 'all', string> = {
  all: 'All',
  tops: 'Tops',
  bottoms: 'Bottoms',
  dresses: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  pijama: 'Pijama',
};

const seasonLabels: Record<Season | 'all', string> = {
  all: 'All Seasons',
  'mid-season': 'Mid-season',
  summer: 'Summer',
  winter: 'Winter',
  'all-season': 'All-season',
};

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
    <div className="min-h-screen bg-background">
      <PageHeader
        title="My Closet"
        rightAction={
          <Link href="/closet/add">
            <Button variant="ghost" size="icon" className="text-primary">
              <Plus className="size-6" />
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="px-4 py-3 space-y-3 bg-card border-b border-border max-w-lg mx-auto">
        {/* Category Filter */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as Category | 'all')}>
          <TabsList className="w-full justify-start overflow-x-auto no-scrollbar pb-1">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category}>
                {categoryLabels[category]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Season Filter */}
        <Tabs value={selectedSeason} onValueChange={(v) => setSelectedSeason(v as Season | 'all')}>
          <TabsList className="w-full justify-start overflow-x-auto no-scrollbar pb-1">
            {seasons.map((season) => (
              <TabsTrigger key={season} value={season}>
                {seasonLabels[season]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Garments Grid */}
      <div className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="masonry-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border">
                <Skeleton className="aspect-[3/4] rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : garments.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center size-20 rounded-full bg-muted mb-4">
              <Shirt className="size-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No garments yet</h3>
            <p className="mt-1 text-muted-foreground text-sm max-w-xs mx-auto">
              Start building your digital wardrobe by adding your first garment
            </p>
            <Button asChild className="mt-6 rounded-full" size="lg">
              <Link href="/closet/add">
                <Plus className="size-5 mr-2" />
                Add Garment
              </Link>
            </Button>
          </div>
        ) : (
          <div className="masonry-grid">
            {garments.map((garment, index) => (
              <GarmentCard key={garment.id} garment={garment} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
