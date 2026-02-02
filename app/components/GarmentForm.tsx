'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';
import { uploadImage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { categoriesWithoutAll, seasonsWithoutAll, categoryLabels, seasonConfig } from '@/lib/constants';
import type { Category, Season } from '@/lib/database.types';

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
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Blue cotton t-shirt"
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <div className="grid grid-cols-3 gap-2">
          {categoriesWithoutAll.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                category === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Season */}
      <div className="space-y-2">
        <Label>Season</Label>
        <div className="grid grid-cols-2 gap-2">
          {seasonsWithoutAll.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeason(s)}
              className={cn(
                "px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                season === s
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {seasonConfig[s].icon}
              {seasonConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label>Quantity</Label>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-12 rounded-full"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Minus className="size-4" />
          </Button>
          <span className="text-2xl font-semibold text-foreground w-12 text-center tabular-nums">
            {quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-12 rounded-full"
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Add to Closet'
        )}
      </Button>
    </form>
  );
}
