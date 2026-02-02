'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, User, Settings, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
  hideProfileMenu?: boolean;
}

export default function PageHeader({ title, showBack = false, rightAction, className, hideProfileMenu = false }: PageHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      setLoggingOut(false);
    }
  }

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
        <div className="flex items-center gap-2">
          {rightAction && <div>{rightAction}</div>}
          {!hideProfileMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} destructive disabled={loggingOut}>
                  {loggingOut ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="size-4" />
                      Sign Out
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
