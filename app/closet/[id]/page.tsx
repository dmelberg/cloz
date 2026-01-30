'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import PageHeader from '../../components/PageHeader';
import type { Garment } from '@/lib/database.types';
import { getImageUrl } from '@/lib/supabase';

export default function GarmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [garment, setGarment] = useState<Garment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchGarment();
  }, [params.id]);

  async function fetchGarment() {
    try {
      const response = await fetch(`/api/garments/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setGarment(data);
      }
    } catch (error) {
      console.error('Failed to fetch garment:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this garment?')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/garments/${params.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/closet');
      }
    } catch (error) {
      console.error('Failed to delete garment:', error);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <PageHeader title="Loading..." showBack />
        <div className="animate-pulse">
          <div className="aspect-square bg-zinc-200 dark:bg-zinc-800" />
          <div className="p-4 space-y-4">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!garment) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <PageHeader title="Not Found" showBack />
        <div className="text-center py-12">
          <p className="text-zinc-500">Garment not found</p>
        </div>
      </div>
    );
  }

  const imageUrl = getImageUrl(garment.photo_url);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader
        title={garment.name}
        showBack
        rightAction={
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-red-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        }
      />

      {/* Image */}
      <div className="aspect-square relative bg-zinc-100 dark:bg-zinc-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={garment.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Category</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">{garment.category}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Season</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">{garment.season}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Quantity</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{garment.quantity}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Times Worn</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{garment.use_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Added</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {new Date(garment.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
