'use client';

import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';

export default function SettingsPage() {
  const [thresholdMonths, setThresholdMonths] = useState(6);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current preferences
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
    setSaved(false);

    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donation_threshold_months: thresholdMonths }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader title="Settings" />

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-32 bg-white dark:bg-zinc-900 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Donation Threshold Setting */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Donation Suggestions
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Suggest giving away garments that haven&apos;t been worn after a certain period of time.
              </p>

              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Time threshold (months)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={thresholdMonths}
                  onChange={(e) => setThresholdMonths(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <span className="w-16 text-center font-semibold text-zinc-900 dark:text-zinc-100">
                  {thresholdMonths} {thresholdMonths === 1 ? 'month' : 'months'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                Garments with 0-1 wears added more than {thresholdMonths} months ago will be suggested for donation.
              </p>
            </div>

            {/* About Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                About Cloz
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Cloz helps you track your wardrobe and discover which clothes you actually wear. 
                By logging your outfits, you can make informed decisions about what to keep and what to give away.
              </p>
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Version 1.0.0
                </p>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Data Management
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Your data is stored securely in Supabase. Photos are stored in Supabase Storage.
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-4 rounded-xl font-medium transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-violet-600 text-white'
              } disabled:opacity-50`}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
