'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import PageHeader from '../../components/PageHeader';
import ImageCropper from '../../components/ImageCropper';
import { uploadBlob, uploadImage } from '@/lib/storage';
import type { Garment, Category, Season } from '@/lib/database.types';
import { getImageUrl } from '@/lib/supabase';

const categories: Category[] = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'pijama'];
const seasons: Season[] = ['mid-season', 'summer', 'winter', 'all-season'];

export default function GarmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [garment, setGarment] = useState<Garment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('tops');
  const [editSeason, setEditSeason] = useState<Season>('all-season');
  const [editQuantity, setEditQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image editing state
  const [showCropper, setShowCropper] = useState(false);
  const [croppedImage, setCroppedImage] = useState<{ blob: Blob; preview: string } | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function startEditing() {
    if (!garment) return;
    setEditName(garment.name);
    setEditCategory(garment.category);
    setEditSeason(garment.season);
    setEditQuantity(garment.quantity);
    setCroppedImage(null);
    setNewImageFile(null);
    setNewImagePreview(null);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    if (croppedImage) {
      URL.revokeObjectURL(croppedImage.preview);
    }
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setCroppedImage(null);
    setNewImageFile(null);
    setNewImagePreview(null);
    setError(null);
    setIsEditing(false);
  }

  function handleNewImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear any existing cropped image since we're replacing with a new photo
    if (croppedImage) {
      URL.revokeObjectURL(croppedImage.preview);
      setCroppedImage(null);
    }
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }

    setNewImageFile(file);
    const preview = URL.createObjectURL(file);
    setNewImagePreview(preview);
    
    // Reset the input so the same file can be selected again
    e.target.value = '';
  }

  function handleCropComplete(blob: Blob) {
    const preview = URL.createObjectURL(blob);
    setCroppedImage({ blob, preview });
    setShowCropper(false);
  }

  async function handleSave() {
    if (!garment) return;

    setSaving(true);
    setError(null);

    try {
      // Upload new image if exists (priority: new file > cropped image > existing)
      let newPhotoUrl = garment.photo_url;
      if (newImageFile) {
        newPhotoUrl = await uploadImage(newImageFile, 'garments');
      } else if (croppedImage) {
        newPhotoUrl = await uploadBlob(croppedImage.blob, 'garments');
      }

      const response = await fetch(`/api/garments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          category: editCategory,
          season: editSeason,
          quantity: editQuantity,
          photo_url: newPhotoUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      const updatedGarment = await response.json();
      setGarment(updatedGarment);
      
      if (croppedImage) {
        URL.revokeObjectURL(croppedImage.preview);
      }
      if (newImagePreview) {
        URL.revokeObjectURL(newImagePreview);
      }
      setCroppedImage(null);
      setNewImageFile(null);
      setNewImagePreview(null);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
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

  const imageUrl = newImagePreview || croppedImage?.preview || getImageUrl(garment.photo_url);
  // For cropping, use the new image if uploaded, otherwise the original
  const cropSourceUrl = newImagePreview || getImageUrl(garment.photo_url);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader
        title={isEditing ? 'Edit Garment' : garment.name}
        showBack
        rightAction={
          isEditing ? (
            <button
              onClick={cancelEditing}
              className="p-2 text-zinc-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={startEditing}
                className="p-2 text-violet-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 text-red-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )
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
        
        {/* Image editing buttons when in edit mode */}
        {isEditing && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-black/70 hover:bg-black/80 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              New Photo
            </button>
            <button
              onClick={() => setShowCropper(true)}
              className="px-4 py-2 bg-black/70 hover:bg-black/80 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Crop
            </button>
          </div>
        )}
        
        {/* Hidden file input for new photo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleNewImageSelect}
          className="hidden"
        />
      </div>

      {/* Details / Edit Form */}
      <div className="p-4 space-y-4">
        {isEditing ? (
          <>
            {/* Edit Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditCategory(cat)}
                      className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                        editCategory === cat
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Season
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {seasons.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditSeason(s)}
                      className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                        editSeason === s
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                    className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xl"
                  >
                    −
                  </button>
                  <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 w-12 text-center">
                    {editQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditQuantity(editQuantity + 1)}
                    className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* New image indicator */}
            {(newImageFile || croppedImage) && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700 dark:text-green-300">
                  {newImageFile ? 'New photo ready to save' : 'Cropped image ready to save'}
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Save/Cancel buttons */}
            <div className="flex gap-3">
              <button
                onClick={cancelEditing}
                className="flex-1 py-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="flex-1 py-4 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        ) : (
          /* View Mode */
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
        )}
      </div>

      {/* Image Cropper Modal */}
      {showCropper && (
        <ImageCropper
          imageSrc={cropSourceUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowCropper(false)}
          aspectRatio={1}
        />
      )}
    </div>
  );
}
