'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Plus, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/closet',
    label: 'Closet',
    icon: LayoutGrid,
  },
  {
    href: '/outfits/add',
    label: 'Add',
    icon: Plus,
    isPrimary: true,
  },
  {
    href: '/outfits/calendar',
    label: 'Calendar',
    icon: Calendar,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide navigation on auth pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border pb-safe z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center size-14 -mt-6 rounded-full shadow-lg",
                  "bg-primary text-primary-foreground",
                  "active:scale-95 transition-all duration-200",
                  "hover:shadow-xl hover:scale-105"
                )}
              >
                <Icon className="size-6" strokeWidth={2.5} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn("size-5", isActive && "stroke-[2.5]")} />
              <span className={cn(
                "text-[10px]",
                isActive ? "font-medium" : "font-normal"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
