import Image from 'next/image';
import Link from 'next/link';
import type { Garment } from '@/lib/database.types';
import { getImageUrl } from '@/lib/supabase';

interface GarmentListProps {
  title: string;
  garments: Garment[];
  showUseCount?: boolean;
  emptyMessage?: string;
  variant?: 'default' | 'warning';
}

export default function GarmentList({
  title,
  garments,
  showUseCount = true,
  emptyMessage = 'No garments',
  variant = 'default',
}: GarmentListProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className={`px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 ${
        variant === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : ''
      }`}>
        <h3 className={`font-medium ${
          variant === 'warning' 
            ? 'text-amber-700 dark:text-amber-400' 
            : 'text-zinc-900 dark:text-zinc-100'
        }`}>
          {title}
        </h3>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {garments.length === 0 ? (
          <p className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            {emptyMessage}
          </p>
        ) : (
          garments.map((garment) => (
            <Link
              key={garment.id}
              href={`/closet/${garment.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden relative bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                <Image
                  src={getImageUrl(garment.photo_url)}
                  alt={garment.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {garment.name}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                  {garment.category}
                </p>
              </div>
              {showUseCount && (
                <div className="flex-shrink-0 text-right">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {garment.use_count}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">wears</p>
                </div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
