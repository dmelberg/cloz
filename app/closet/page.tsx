'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import GarmentCard from '../components/GarmentCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Shirt } from 'lucide-react';
import { categories, seasons, categoryLabels, seasonConfig } from '@/lib/constants';
import type { Garment, Category, Season } from '@/lib/database.types';

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
      <PageHeader title="My Closet" />

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
              <TabsTrigger key={season} value={season} className="gap-1.5">
                {seasonConfig[season].icon}
                {seasonConfig[season].label}
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
                Add Item
              </Link>
            </Button>
          </div>
        ) : (
          <div className="masonry-grid">
            {/* Add Item Card */}
            <Link
              href="/closet/add"
              className="rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center aspect-[3/4] animate-fade-in-up"
            >
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plus className="size-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Add Item</span>
            </Link>
            {garments.map((garment, index) => (
              <GarmentCard key={garment.id} garment={garment} index={index + 1} />
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <Link
        href="/closet/add"
        className="fixed bottom-24 right-4 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
