import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
    <Card className="overflow-hidden">
      <CardHeader className={cn(
        "py-3",
        variant === 'warning' && 'bg-amber-50 dark:bg-amber-900/20'
      )}>
        <CardTitle className={cn(
          "text-base font-semibold",
          variant === 'warning' 
            ? 'text-amber-700 dark:text-amber-400' 
            : 'text-foreground'
        )}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {garments.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">
              {emptyMessage}
            </p>
          ) : (
            garments.map((garment, index) => (
              <Link
                key={garment.id}
                href={`/closet/${garment.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  "hover:bg-muted/50 transition-colors",
                  "animate-fade-in-up"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="size-12 rounded-xl overflow-hidden relative bg-muted flex-shrink-0">
                  <Image
                    src={getImageUrl(garment.photo_url)}
                    alt={garment.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {garment.name}
                  </p>
                  <Badge variant="secondary" className="text-xs capitalize mt-0.5">
                    {garment.category}
                  </Badge>
                </div>
                {showUseCount && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {garment.use_count}
                    </p>
                    <p className="text-xs text-muted-foreground">wears</p>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
