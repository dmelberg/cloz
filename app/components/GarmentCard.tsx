'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Garment } from '@/lib/database.types';
import { getImageUrl } from '@/lib/supabase';

interface GarmentCardProps {
  garment: Garment;
  showUseCount?: boolean;
}

export default function GarmentCard({ garment, showUseCount = true }: GarmentCardProps) {
  const imageUrl = getImageUrl(garment.photo_url);

  return (
    <Link
      href={`/closet/${garment.id}`}
      className="block bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 touch-press transition-transform"
    >
      <div className="aspect-square relative bg-zinc-100 dark:bg-zinc-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={garment.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {garment.quantity > 1 && (
          <span className="absolute top-2 right-2 bg-zinc-900/70 text-white text-xs px-2 py-0.5 rounded-full">
            ×{garment.quantity}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{garment.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{garment.category}</span>
          {showUseCount && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {garment.use_count} {garment.use_count === 1 ? 'wear' : 'wears'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
