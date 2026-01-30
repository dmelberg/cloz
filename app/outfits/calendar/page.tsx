'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import PageHeader from '../../components/PageHeader';
import { getImageUrl } from '@/lib/supabase';
import type { Outfit, Garment } from '@/lib/database.types';

interface OutfitWithGarments extends Outfit {
  garments: Garment[];
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitWithGarments | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function handleDayClick(date: Date) {
    const outfit = outfits.find(o => isSameDay(new Date(o.worn_date), date));
    if (outfit) {
      // Fetch outfit details with garments
      const response = await fetch(`/api/outfits/${outfit.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedOutfit(data);
      }
    } else {
      setSelectedOutfit(null);
    }
  }

  function getOutfitForDate(date: Date): Outfit | undefined {
    return outfits.find(o => isSameDay(new Date(o.worn_date), date));
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for the first week
  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => 
    new Date(monthStart.getTime() - (startDay - i) * 24 * 60 * 60 * 1000)
  );

  const allDays = [...paddingDays, ...days];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader title="Outfit Calendar" />

      <div className="p-4 max-w-lg mx-auto">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 text-zinc-600 dark:text-zinc-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-zinc-600 dark:text-zinc-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const outfit = isCurrentMonth ? getOutfitForDate(day) : undefined;

            return (
              <button
                key={index}
                onClick={() => isCurrentMonth && handleDayClick(day)}
                disabled={!isCurrentMonth}
                className={`aspect-square rounded-lg overflow-hidden relative transition-all ${
                  isCurrentMonth
                    ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
                    : 'bg-zinc-100 dark:bg-zinc-900/50'
                } ${isToday ? 'ring-2 ring-violet-500' : ''}`}
              >
                {outfit ? (
                  <Image
                    src={getImageUrl(outfit.photo_url)}
                    alt={`Outfit on ${format(day, 'MMM d')}`}
                    fill
                    className="object-cover"
                    sizes="50px"
                  />
                ) : (
                  <span className={`absolute inset-0 flex items-center justify-center text-sm ${
                    isCurrentMonth
                      ? 'text-zinc-700 dark:text-zinc-300'
                      : 'text-zinc-400 dark:text-zinc-600'
                  }`}>
                    {format(day, 'd')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4 text-zinc-500">Loading...</div>
        )}

        {/* Selected Outfit Detail */}
        {selectedOutfit && (
          <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="aspect-video relative">
              <Image
                src={getImageUrl(selectedOutfit.photo_url)}
                alt={`Outfit on ${format(new Date(selectedOutfit.worn_date), 'MMMM d, yyyy')}`}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {format(new Date(selectedOutfit.worn_date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <button
                  onClick={() => setSelectedOutfit(null)}
                  className="p-1 text-zinc-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedOutfit.garments.length > 0 && (
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                    Garments worn:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOutfit.garments.map(garment => (
                      <div
                        key={garment.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden relative">
                          <Image
                            src={getImageUrl(garment.photo_url)}
                            alt={garment.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{garment.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && outfits.length === 0 && (
          <div className="text-center py-8">
            <p className="text-zinc-500 dark:text-zinc-400">No outfits logged this month</p>
          </div>
        )}
      </div>
    </div>
  );
}
