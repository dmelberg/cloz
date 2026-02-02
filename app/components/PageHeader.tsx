'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, showBack = false, rightAction, className }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className={cn(
      "sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border",
      className
    )}>
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="-ml-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-6" />
            </Button>
          )}
          <span className="text-xl text-purple-500 font-[family-name:var(--font-pacifico)]">cloz</span>
          <span className="text-muted-foreground">|</span>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
