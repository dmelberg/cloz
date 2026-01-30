'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';
import { uploadImage } from '@/lib/storage';
import type { Category, Season } from '@/lib/database.types';

const categories: Category[] = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'pijama'];
const seasons: Season[] = ['mid-season', 'summer', 'winter', 'all-season'];

interface GarmentFormProps {
  initialData?: {
    name?: string;
    category?: Category;
    season?: Season;
    quantity?: number;
    imageFile?: File;
    imagePreviewUrl?: string;
  };
  onSuccess?: (garmentId: string) => void;
}

export default function GarmentForm({ initialData, onSuccess }: GarmentFormProps) {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(initialData?.imageFile || null);
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<Category>(initialData?.category || 'tops');
  const [season, setSeason] = useState<Season>(initialData?.season || 'all-season');
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile && !initialData?.imagePreviewUrl) {
      setError('Please add a photo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload image to storage
      let photoUrl = initialData?.imagePreviewUrl || '';
      if (imageFile) {
        photoUrl = await uploadImage(imageFile, 'garments');
      }

      // Create garment
      const response = await fetch('/api/garments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          photo_url: photoUrl,
          quantity,
          category,
          season,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create garment');
      }

      const garment = await response.json();

      if (onSuccess) {
        onSuccess(garment.id);
      } else {
        router.push('/closet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload */}
      <ImageUpload
        onImageSelect={setImageFile}
        previewUrl={initialData?.imagePreviewUrl}
        className="max-w-xs mx-auto"
      />

      {/* Name Input */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Blue cotton t-shirt"
          required
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                category === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Season */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Season
        </label>
        <div className="grid grid-cols-2 gap-2">
          {seasons.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeason(s)}
              className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                season === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Quantity
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xl"
          >
            −
          </button>
          <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 w-12 text-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xl"
          >
            +
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? 'Saving...' : 'Add to Closet'}
      </button>
    </form>
  );
}
