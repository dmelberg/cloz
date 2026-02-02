'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import PageHeader from '../../components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageUrl, parseLocalDate } from '@/lib/supabase';
import type { Outfit, Garment } from '@/lib/database.types';

interface OutfitWithGarments extends Outfit {
  garments: Garment[];
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedOutfits, setSelectedOutfits] = useState<OutfitWithGarments[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchOutfits = useCallback(async () => {
    setLoading(true);
    try {
      const month = format(currentMonth, 'yyyy-MM');
      const response = await fetch(`/api/outfits?month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setOutfits(data);
      }
    } catch (error) {
      console.error('Failed to fetch outfits:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchOutfits();
  }, [fetchOutfits]);

  // Auto-select today if there's an outfit worn today
  useEffect(() => {
    if (!loading && outfits.length > 0 && !selectedDate) {
      const today = new Date();
      const todayOutfits = outfits.filter(o => isSameDay(parseLocalDate(o.worn_date), today));
      if (todayOutfits.length > 0) {
        handleDayClick(today);
      }
    }
  }, [loading, outfits]);

  async function handleDayClick(date: Date) {
    const dayOutfits = getOutfitsForDate(date);
    if (dayOutfits.length > 0) {
      setSelectedDate(date);
      setLoadingDetails(true);
      const outfitDetails: OutfitWithGarments[] = [];
      for (const outfit of dayOutfits) {
        const response = await fetch(`/api/outfits/${outfit.id}`);
        if (response.ok) {
          const data = await response.json();
          outfitDetails.push(data);
        }
      }
      setSelectedOutfits(outfitDetails);
      setLoadingDetails(false);
    } else {
      setSelectedDate(null);
      setSelectedOutfits([]);
    }
  }

  function getOutfitsForDate(date: Date): Outfit[] {
    return outfits.filter(o => isSameDay(parseLocalDate(o.worn_date), date));
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => 
    new Date(monthStart.getTime() - (startDay - i) * 24 * 60 * 60 * 1000)
  );

  const allDays = [...paddingDays, ...days];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Outfit Calendar" />

      <div className="p-4 max-w-lg mx-auto">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const dayOutfits = isCurrentMonth ? getOutfitsForDate(day) : [];
            const outfitCount = dayOutfits.length;

            return (
              <button
                key={index}
                onClick={() => isCurrentMonth && handleDayClick(day)}
                disabled={!isCurrentMonth}
                className={cn(
                  "aspect-square rounded-xl overflow-hidden relative transition-all",
                  isCurrentMonth
                    ? 'bg-card border border-border hover:border-primary/50'
                    : 'bg-muted/50',
                  isToday && 'ring-2 ring-primary',
                  selectedDate && isSameDay(day, selectedDate) && 'ring-2 ring-primary/60'
                )}
              >
                {outfitCount > 0 ? (
                  <>
                    <Image
                      src={getImageUrl(dayOutfits[0].photo_url)}
                      alt={`Outfit on ${format(day, 'MMM d')}`}
                      fill
                      className="object-cover"
                      sizes="50px"
                    />
                    {outfitCount > 1 && (
                      <Badge className="absolute top-0.5 right-0.5 size-4 p-0 flex items-center justify-center text-[10px]">
                        {outfitCount}
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className={cn(
                    "absolute inset-0 flex items-center justify-center text-sm",
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {format(day, 'd')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <Loader2 className="size-6 mx-auto animate-spin text-primary" />
          </div>
        )}

        {/* Selected Outfits Detail */}
        {selectedDate && (
          <div className="mt-6 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                {selectedOutfits.length > 1 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({selectedOutfits.length} outfits)
                  </span>
                )}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setSelectedDate(null); setSelectedOutfits([]); }}
              >
                <X className="size-4" />
              </Button>
            </div>

            {loadingDetails ? (
              <div className="text-center py-6">
                <Loader2 className="size-6 mx-auto animate-spin text-primary" />
              </div>
            ) : (
              selectedOutfits.map((outfit, index) => (
                <Card key={outfit.id} className="overflow-hidden">
                  {selectedOutfits.length > 1 && (
                    <div className="px-4 pt-3 pb-1">
                      <Badge variant="secondary" className="text-xs">
                        Outfit {index + 1}
                      </Badge>
                    </div>
                  )}
                  <div className="aspect-video relative">
                    <Image
                      src={getImageUrl(outfit.photo_url)}
                      alt={`Outfit ${index + 1} on ${format(selectedDate, 'MMMM d, yyyy')}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    {outfit.garments.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Garments worn:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {outfit.garments.map(garment => (
                            <div
                              key={garment.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full"
                            >
                              <div className="size-6 rounded-full overflow-hidden relative">
                                <Image
                                  src={getImageUrl(garment.photo_url)}
                                  alt={garment.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <span className="text-sm text-foreground">{garment.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && outfits.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No outfits logged this month</p>
          </div>
        )}
      </div>
    </div>
  );
}
