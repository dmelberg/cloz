'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Plus, Check, Trash2, MapPin, PackageOpen, Heart, Loader2 } from 'lucide-react';
import type { Garment } from '@/lib/database.types';

interface SavedDonation {
  id: string;
  garment_id: string;
  saved_at: string;
  garment: Garment;
}

export default function OutputPage() {
  const { toast } = useToast();
  const [donationSuggestions, setDonationSuggestions] = useState<Garment[]>([]);
  const [savedDonations, setSavedDonations] = useState<SavedDonation[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const fetchDonationSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const prefsRes = await fetch('/api/preferences');
      const prefs = await prefsRes.json();
      const thresholdMonths = prefs.donation_threshold_months || 6;

      const response = await fetch(`/api/analytics?thresholdMonths=${thresholdMonths}`);
      if (response.ok) {
        const data = await response.json();
        setDonationSuggestions(data.donationSuggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const fetchSavedDonations = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const response = await fetch('/api/saved-donations');
      if (response.ok) {
        const data = await response.json();
        setSavedDonations(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved donations:', error);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    fetchDonationSuggestions();
    fetchSavedDonations();
  }, [fetchDonationSuggestions, fetchSavedDonations]);

  async function handleSaveForDonation(garment: Garment) {
    setSavingIds(prev => new Set(prev).add(garment.id));
    try {
      const response = await fetch('/api/saved-donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ garment_id: garment.id }),
      });

      if (response.ok) {
        toast({
          title: 'Saved for donation',
          description: `${garment.name} has been added to your donation list.`,
          variant: 'success',
        });
        fetchSavedDonations();
      } else if (response.status === 409) {
        toast({
          title: 'Already saved',
          description: `${garment.name} is already in your donation list.`,
        });
      }
    } catch (error) {
      console.error('Failed to save donation:', error);
      toast({
        title: 'Error',
        description: 'Failed to save. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(garment.id);
        return next;
      });
    }
  }

  async function handleRemoveSavedDonation(garmentId: string, garmentName: string) {
    setRemovingIds(prev => new Set(prev).add(garmentId));
    try {
      const response = await fetch(`/api/saved-donations?garment_id=${garmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Removed',
          description: `${garmentName} has been removed from your donation list.`,
        });
        fetchSavedDonations();
      }
    } catch (error) {
      console.error('Failed to remove:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(garmentId);
        return next;
      });
    }
  }

  const savedGarmentIds = new Set(savedDonations.map(sd => sd.garment_id));
  const unsavedSuggestions = donationSuggestions.filter(g => !savedGarmentIds.has(g.id));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Output" />

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Saved for Donation */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-green-50 dark:bg-green-900/20 py-3">
            <div className="flex items-center gap-2">
              <Heart className="size-4 text-green-600 dark:text-green-400" />
              <CardTitle className="text-base font-semibold text-green-700 dark:text-green-400">
                Ready to Donate ({savedDonations.length})
              </CardTitle>
            </div>
            <CardDescription className="text-green-600/80 dark:text-green-400/80">
              Items you&apos;ve decided to give away
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSaved ? (
              <div className="divide-y divide-border">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="size-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : savedDonations.length === 0 ? (
              <p className="px-4 py-8 text-center text-muted-foreground text-sm">
                No items saved for donation yet. Add items from the suggestions below!
              </p>
            ) : (
              <div className="divide-y divide-border">
                {savedDonations.map((sd, index) => (
                  <div
                    key={sd.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      "animate-fade-in-up"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <Link href={`/closet/${sd.garment.id}`} className="size-12 rounded-xl overflow-hidden relative bg-muted flex-shrink-0">
                      <Image
                        src={getImageUrl(sd.garment.photo_url)}
                        alt={sd.garment.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </Link>
                    <Link href={`/closet/${sd.garment.id}`} className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {sd.garment.name}
                      </p>
                      <Badge variant="secondary" className="text-xs capitalize mt-0.5">
                        {sd.garment.category}
                      </Badge>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSavedDonation(sd.garment_id, sd.garment.name)}
                      disabled={removingIds.has(sd.garment_id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {removingIds.has(sd.garment_id) ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donation Suggestions */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-amber-50 dark:bg-amber-900/20 py-3">
            <div className="flex items-center gap-2">
              <PackageOpen className="size-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base font-semibold text-amber-700 dark:text-amber-400">
                Suggestions ({unsavedSuggestions.length})
              </CardTitle>
            </div>
            <CardDescription className="text-amber-600/80 dark:text-amber-400/80">
              Rarely worn items you might want to give away
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSuggestions ? (
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="size-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : unsavedSuggestions.length === 0 ? (
              <p className="px-4 py-8 text-center text-muted-foreground text-sm">
                {donationSuggestions.length === 0 
                  ? "No donation suggestions yet. Keep logging outfits!" 
                  : "All suggestions have been saved!"}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {unsavedSuggestions.map((garment, index) => (
                  <div
                    key={garment.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      "animate-fade-in-up"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <Link href={`/closet/${garment.id}`} className="size-12 rounded-xl overflow-hidden relative bg-muted flex-shrink-0">
                      <Image
                        src={getImageUrl(garment.photo_url)}
                        alt={garment.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </Link>
                    <Link href={`/closet/${garment.id}`} className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {garment.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {garment.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {garment.use_count} wears
                        </span>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSaveForDonation(garment)}
                      disabled={savingIds.has(garment.id)}
                      className="text-muted-foreground hover:text-green-600"
                    >
                      {savingIds.has(garment.id) ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Where to Donate - Coming Soon */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold text-foreground">
                Where to Donate
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            </div>
            <CardDescription>
              Discover local places to donate your clothes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-muted mb-3">
                <MapPin className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                We&apos;re working on adding donation location suggestions. Check back soon!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
