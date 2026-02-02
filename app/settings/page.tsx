'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '../components/PageHeader';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Loader2, Check, Info, Database } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [thresholdMonths, setThresholdMonths] = useState(6);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || null);
      }
    });
  }, []);

  useEffect(() => {
    fetch('/api/preferences')
      .then(res => res.json())
      .then(data => {
        setThresholdMonths(data.donation_threshold_months || 6);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);

    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donation_threshold_months: thresholdMonths }),
      });

      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'Your preferences have been updated.',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

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
    <div className="min-h-screen bg-background">
      <PageHeader title="Settings" />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Donation Threshold Setting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Donation Suggestions</CardTitle>
                <CardDescription>
                  Suggest giving away garments that haven&apos;t been worn after a certain period of time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Time threshold (months)</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={24}
                      value={thresholdMonths}
                      onChange={(e) => setThresholdMonths(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="w-20 text-center font-semibold text-foreground tabular-nums">
                      {thresholdMonths} {thresholdMonths === 1 ? 'month' : 'months'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Garments with 0-1 wears added more than {thresholdMonths} months ago will be suggested for donation.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">About Cloz</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cloz helps you track your wardrobe and discover which clothes you actually wear. 
                  By logging your outfits, you can make informed decisions about what to keep and what to give away.
                </p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">Version 1.0.0</p>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">Data Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your data is stored securely in Supabase. Photos are stored in Supabase Storage.
                </p>
              </CardContent>
            </Card>

            {/* Account Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userEmail && (
                  <p className="text-sm text-muted-foreground">
                    Signed in as <span className="font-medium text-foreground">{userEmail}</span>
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full"
                >
                  {loggingOut ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="size-4 mr-2" />
                      Sign Out
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
