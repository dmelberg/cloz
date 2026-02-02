'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import PageHeader from '../../components/PageHeader';
import ImageCropper from '../../components/ImageCropper';
import { uploadBlob, uploadImage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Pencil, 
  Trash2, 
  X, 
  Camera, 
  Crop, 
  Minus, 
  Plus, 
  Loader2,
  ImageIcon,
  CheckCircle2
} from 'lucide-react';
import type { Garment, Category, Season } from '@/lib/database.types';
import { getImageUrl } from '@/lib/supabase';

const categories: Category[] = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'pijama'];
const seasons: Season[] = ['mid-season', 'summer', 'winter', 'all-season'];

const categoryLabels: Record<Category, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  dresses: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  pijama: 'Pijama',
};

const seasonLabels: Record<Season, string> = {
  'mid-season': 'Mid-season',
  summer: 'Summer',
  winter: 'Winter',
  'all-season': 'All-season',
};

export default function GarmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
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
        toast({
          title: 'Garment deleted',
          description: 'The garment has been removed from your closet.',
        });
        router.push('/closet');
      }
    } catch (error) {
      console.error('Failed to delete garment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete garment. Please try again.',
        variant: 'destructive',
      });
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
      
      toast({
        title: 'Changes saved',
        description: 'Your garment has been updated.',
        variant: 'success',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Loading..." showBack />
        <Skeleton className="aspect-square rounded-none" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
    );
  }

  if (!garment) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Not Found" showBack />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Garment not found</p>
        </div>
      </div>
    );
  }

  const imageUrl = newImagePreview || croppedImage?.preview || getImageUrl(garment.photo_url);
  const cropSourceUrl = newImagePreview || getImageUrl(garment.photo_url);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={isEditing ? 'Edit Garment' : garment.name}
        showBack
        rightAction={
          isEditing ? (
            <Button variant="ghost" size="icon" onClick={cancelEditing}>
              <X className="size-5" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={startEditing} className="text-primary">
                <Pencil className="size-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive"
              >
                {deleting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Trash2 className="size-5" />
                )}
              </Button>
            </div>
          )
        }
      />

      {/* Image */}
      <div className="aspect-square relative bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={garment.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="size-24 stroke-1" />
          </div>
        )}
        
        {isEditing && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="bg-black/70 hover:bg-black/80 text-white border-0"
            >
              <Camera className="size-4 mr-2" />
              New Photo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCropper(true)}
              className="bg-black/70 hover:bg-black/80 text-white border-0"
            >
              <Crop className="size-4 mr-2" />
              Crop
            </Button>
          </div>
        )}
        
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
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditCategory(cat)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          editCategory === cat
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
                    {seasons.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditSeason(s)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          editSeason === s
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        )}
                      >
                        {seasonLabels[s]}
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
                      onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="text-2xl font-semibold text-foreground w-12 text-center tabular-nums">
                      {editQuantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-12 rounded-full"
                      onClick={() => setEditQuantity(editQuantity + 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(newImageFile || croppedImage) && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  {newImageFile ? 'New photo ready to save' : 'Cropped image ready to save'}
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelEditing}
                className="flex-1"
                size="lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="flex-1"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="secondary" className="capitalize">{garment.category}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Season</span>
                <Badge variant="secondary" className="capitalize">{garment.season}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium text-foreground">{garment.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Times Worn</span>
                <span className="font-medium text-foreground">{garment.use_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Added</span>
                <span className="font-medium text-foreground">
                  {new Date(garment.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
