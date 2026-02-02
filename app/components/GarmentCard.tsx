'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Garment } from '@/lib/database.types';
import { getImageUrl } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface GarmentCardProps {
  garment: Garment;
  showUseCount?: boolean;
  index?: number;
}

export default function GarmentCard({ garment, showUseCount = true, index = 0 }: GarmentCardProps) {
  const imageUrl = getImageUrl(garment.photo_url);

  return (
    <Link
      href={`/closet/${garment.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl bg-card border border-border",
        "card-hover animate-fade-in-up"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image container with Pinterest-style variable height */}
      <div className="relative overflow-hidden bg-muted">
        {imageUrl ? (
          <div className="relative aspect-[3/4]">
            <Image
              src={imageUrl}
              alt={garment.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Hover content */}
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <h3 className="font-semibold text-white text-sm line-clamp-2">{garment.name}</h3>
            </div>
          </div>
        ) : (
          <div className="aspect-[3/4] flex items-center justify-center text-muted-foreground">
            <ImageIcon className="size-12 stroke-1" />
          </div>
        )}
        
        {/* Quantity badge */}
        {garment.quantity > 1 && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 bg-black/60 text-white border-0 backdrop-blur-sm"
          >
            ×{garment.quantity}
          </Badge>
        )}
      </div>
      
      {/* Card content */}
      <div className="p-3 space-y-2">
        <h3 className="font-medium text-card-foreground text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {garment.name}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-xs capitalize">
            {garment.category}
          </Badge>
          {showUseCount && (
            <span className="text-xs text-muted-foreground">
              {garment.use_count} {garment.use_count === 1 ? 'wear' : 'wears'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
