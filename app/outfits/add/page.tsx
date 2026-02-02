'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PageHeader from '../../components/PageHeader';
import ImageUpload from '../../components/ImageUpload';
import ImageCropper from '../../components/ImageCropper';
import { uploadImage, uploadBlob, fileToBase64 } from '@/lib/storage';
import { getImageUrl, getTodayString } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  Check, 
  X, 
  Crop, 
  Plus,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { categories, categoryLabels } from '@/lib/constants';
import type { Garment, Category, Season } from '@/lib/database.types';

interface DetectedGarment {
  name: string;
  category: Category;
  season: Season;
  description: string;
  matchedGarment?: Garment;
  confidence: number;
}

type Step = 'upload' | 'analyzing' | 'review' | 'saving';

export default function AddOutfitPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [wornDate, setWornDate] = useState(getTodayString());
  const [detectedGarments, setDetectedGarments] = useState<DetectedGarment[]>([]);
  const [selectedGarments, setSelectedGarments] = useState<Map<number, Garment | 'new'>>(new Map());
  const [newGarmentData, setNewGarmentData] = useState<Map<number, { name: string; category: Category; season: Season }>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [croppedImages, setCroppedImages] = useState<Map<number, { blob: Blob; preview: string }>>(new Map());
  
  const [showClosetPicker, setShowClosetPicker] = useState(false);
  const [closetGarments, setClosetGarments] = useState<Garment[]>([]);
  const [manuallySelectedGarments, setManuallySelectedGarments] = useState<Garment[]>([]);
  const [closetFilter, setClosetFilter] = useState<Category | 'all'>('all');
  const [loadingCloset, setLoadingCloset] = useState(false);

  useEffect(() => {
    if (showClosetPicker && closetGarments.length === 0) {
      fetchClosetGarments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showClosetPicker]);

  async function fetchClosetGarments() {
    setLoadingCloset(true);
    try {
      const response = await fetch('/api/garments');
      if (response.ok) {
        const data = await response.json();
        setClosetGarments(data);
      }
    } catch (err) {
      console.error('Failed to fetch closet garments:', err);
    } finally {
      setLoadingCloset(false);
    }
  }

  function toggleManualGarment(garment: Garment) {
    setManuallySelectedGarments(prev => {
      const exists = prev.find(g => g.id === garment.id);
      if (exists) {
        return prev.filter(g => g.id !== garment.id);
      }
      return [...prev, garment];
    });
  }

  function isManuallySelected(garment: Garment) {
    return manuallySelectedGarments.some(g => g.id === garment.id);
  }

  const filteredClosetGarments = closetFilter === 'all' 
    ? closetGarments 
    : closetGarments.filter(g => g.category === closetFilter);

  async function handleImageSelect(file: File) {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageFile) return;

    setStep('analyzing');
    setError(null);

    try {
      const base64 = await fileToBase64(imageFile);
      const response = await fetch('/api/analyze-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze outfit');
      }

      const data = await response.json();
      setDetectedGarments(data.detectedGarments);

      const selections = new Map<number, Garment | 'new'>();
      data.detectedGarments.forEach((g: DetectedGarment, index: number) => {
        if (g.matchedGarment) {
          selections.set(index, g.matchedGarment);
        }
      });
      setSelectedGarments(selections);

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('upload');
    }
  }

  function toggleGarmentSelection(index: number, detected: DetectedGarment) {
    const current = selectedGarments.get(index);
    const newSelections = new Map(selectedGarments);

    if (current === undefined) {
      if (detected.matchedGarment) {
        newSelections.set(index, detected.matchedGarment);
      } else {
        newSelections.set(index, 'new');
        if (!newGarmentData.has(index)) {
          setNewGarmentData(new Map(newGarmentData).set(index, {
            name: detected.name,
            category: detected.category,
            season: detected.season,
          }));
        }
      }
    } else {
      newSelections.delete(index);
    }

    setSelectedGarments(newSelections);
  }

  function handleNewGarmentChange(index: number, field: 'name' | 'category' | 'season', value: string) {
    const current = newGarmentData.get(index) || { name: '', category: 'tops' as Category, season: 'all-season' as Season };
    setNewGarmentData(new Map(newGarmentData).set(index, {
      ...current,
      [field]: value,
    }));
  }

  function handleCropComplete(index: number, blob: Blob) {
    const preview = URL.createObjectURL(blob);
    setCroppedImages(new Map(croppedImages).set(index, { blob, preview }));
    setCroppingIndex(null);
  }

  function removeCroppedImage(index: number) {
    const newCroppedImages = new Map(croppedImages);
    const existing = newCroppedImages.get(index);
    if (existing) {
      URL.revokeObjectURL(existing.preview);
    }
    newCroppedImages.delete(index);
    setCroppedImages(newCroppedImages);
  }

  async function handleSaveOutfit() {
    if (!imageFile) return;

    setStep('saving');
    setError(null);

    try {
      const outfitPhotoUrl = await uploadImage(imageFile, 'outfits');
      const garmentIds: string[] = [];

      for (const [index, selection] of selectedGarments) {
        if (selection === 'new') {
          const data = newGarmentData.get(index);
          if (!data) continue;

          let garmentPhotoUrl: string;
          const croppedImage = croppedImages.get(index);
          if (croppedImage) {
            garmentPhotoUrl = await uploadBlob(croppedImage.blob, 'garments');
          } else {
            garmentPhotoUrl = await uploadImage(imageFile, 'garments');
          }

          const response = await fetch('/api/garments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              photo_url: garmentPhotoUrl,
              quantity: 1,
              category: data.category,
              season: data.season,
            }),
          });

          if (response.ok) {
            const garment = await response.json();
            garmentIds.push(garment.id);
          }
        } else {
          garmentIds.push(selection.id);
        }
      }

      for (const garment of manuallySelectedGarments) {
        if (!garmentIds.includes(garment.id)) {
          garmentIds.push(garment.id);
        }
      }

      const response = await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: outfitPhotoUrl,
          worn_date: wornDate,
          garment_ids: garmentIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save outfit');
      }

      toast({
        title: 'Outfit logged',
        description: 'Your outfit has been saved to your calendar.',
        variant: 'success',
      });

      router.push('/outfits/calendar');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('review');
    }
  }

  const totalSelectedCount = selectedGarments.size + manuallySelectedGarments.length;
  const canSave = totalSelectedCount > 0;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Add Outfit" showBack />

      <div className="p-4 max-w-lg mx-auto">
        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <ImageUpload onImageSelect={handleImageSelect} />

            <div className="space-y-2">
              <Label>Date Worn</Label>
              <Input
                type="date"
                value={wornDate}
                onChange={(e) => setWornDate(e.target.value)}
                max={getTodayString()}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!imageFile}
              className="w-full"
              size="lg"
            >
              <Sparkles className="size-4 mr-2" />
              Analyze Outfit
            </Button>
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="text-center py-16">
            <Loader2 className="size-12 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Analyzing your outfit...</p>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="space-y-6">
            {imagePreview && (
              <div className="aspect-square relative rounded-2xl overflow-hidden bg-muted">
                <Image src={imagePreview} alt="Outfit" fill className="object-cover" />
              </div>
            )}

            <div className="text-center">
              <p className="text-muted-foreground">
                {detectedGarments.length > 0 
                  ? `Found ${detectedGarments.length} garments in your outfit`
                  : 'No garments were automatically detected'}
              </p>
            </div>

            {detectedGarments.length === 0 && !showClosetPicker && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        The AI couldn&apos;t automatically detect garments in this photo. You can manually select items from your closet.
                      </p>
                      <Button
                        onClick={() => setShowClosetPicker(true)}
                        className="w-full bg-amber-600 hover:bg-amber-700"
                      >
                        Select from Closet
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detected Garments */}
            {detectedGarments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Detected Garments</h3>
                {detectedGarments.map((garment, index) => {
                  const isSelected = selectedGarments.has(index);
                  const selection = selectedGarments.get(index);
                  const isNew = selection === 'new';

                  return (
                    <Card
                      key={index}
                      className={cn(
                        "transition-all",
                        isSelected && "border-primary bg-primary/5"
                      )}
                    >
                      <CardContent className="p-4">
                        <button
                          onClick={() => toggleGarmentSelection(index, garment)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{garment.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {garment.category} / {garment.season}
                              </p>
                              {garment.matchedGarment && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="size-8 rounded-lg bg-muted relative overflow-hidden">
                                    <Image
                                      src={getImageUrl(garment.matchedGarment.photo_url)}
                                      alt={garment.matchedGarment.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <Badge variant="success" className="text-xs">
                                    <Check className="size-3 mr-1" />
                                    Matched: {garment.matchedGarment.name}
                                  </Badge>
                                </div>
                              )}
                              {!garment.matchedGarment && (
                                <Badge variant="warning" className="text-xs mt-2">
                                  No match - will create new
                                </Badge>
                              )}
                            </div>
                            <div className={cn(
                              "size-6 rounded-full border-2 flex items-center justify-center shrink-0",
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                            )}>
                              {isSelected && <Check className="size-4 text-primary-foreground" />}
                            </div>
                          </div>
                        </button>

                        {isNew && (
                          <div className="mt-4 pt-4 border-t border-border space-y-3">
                            <div className="flex items-center gap-3">
                              {croppedImages.get(index) ? (
                                <>
                                  <div className="size-16 rounded-xl overflow-hidden relative bg-muted shrink-0">
                                    <Image
                                      src={croppedImages.get(index)!.preview}
                                      alt="Cropped preview"
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <Badge variant="success" className="text-xs">
                                      <Check className="size-3 mr-1" />
                                      Image cropped
                                    </Badge>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-xs"
                                        onClick={() => setCroppingIndex(index)}
                                      >
                                        Re-crop
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-xs text-muted-foreground"
                                        onClick={() => removeCroppedImage(index)}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="size-16 rounded-xl overflow-hidden relative bg-muted shrink-0">
                                    {imagePreview && (
                                      <Image
                                        src={imagePreview}
                                        alt="Full outfit"
                                        fill
                                        className="object-cover"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <Badge variant="warning" className="text-xs mb-2">
                                      Using full outfit photo
                                    </Badge>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => setCroppingIndex(index)}
                                    >
                                      <Crop className="size-3 mr-1" />
                                      Crop to this garment
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>

                            <Input
                              type="text"
                              value={newGarmentData.get(index)?.name || garment.name}
                              onChange={(e) => handleNewGarmentChange(index, 'name', e.target.value)}
                              placeholder="Garment name"
                            />
                            <div className="flex gap-2">
                              <select
                                value={newGarmentData.get(index)?.category || garment.category}
                                onChange={(e) => handleNewGarmentChange(index, 'category', e.target.value)}
                                className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                              >
                                <option value="tops">Tops</option>
                                <option value="bottoms">Bottoms</option>
                                <option value="dresses">Dresses</option>
                                <option value="outerwear">Outerwear</option>
                                <option value="shoes">Shoes</option>
                                <option value="accessories">Accessories</option>
                              </select>
                              <select
                                value={newGarmentData.get(index)?.season || garment.season}
                                onChange={(e) => handleNewGarmentChange(index, 'season', e.target.value)}
                                className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                              >
                                <option value="all-season">All Season</option>
                                <option value="summer">Summer</option>
                                <option value="winter">Winter</option>
                                <option value="mid-season">Mid-Season</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Manually Selected Garments */}
            {manuallySelectedGarments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">
                  Manually Added ({manuallySelectedGarments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {manuallySelectedGarments.map((garment) => (
                    <Badge
                      key={garment.id}
                      variant="secondary"
                      className="flex items-center gap-2 py-2 pl-2 pr-1"
                    >
                      <div className="size-6 rounded bg-muted relative overflow-hidden">
                        <Image
                          src={getImageUrl(garment.photo_url)}
                          alt={garment.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span>{garment.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 hover:bg-transparent"
                        onClick={() => toggleManualGarment(garment)}
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add from closet button */}
            {detectedGarments.length > 0 && !showClosetPicker && (
              <Button
                variant="outline"
                onClick={() => setShowClosetPicker(true)}
                className="w-full border-dashed"
              >
                <Plus className="size-4 mr-2" />
                Add more from closet
              </Button>
            )}

            {/* Closet Picker */}
            {showClosetPicker && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Select from Closet</h3>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowClosetPicker(false)}
                    >
                      Done
                    </Button>
                  </div>

                  <Tabs value={closetFilter} onValueChange={(v) => setClosetFilter(v as Category | 'all')}>
                    <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
                      {categories.map((cat) => (
                        <TabsTrigger key={cat} value={cat} className="text-xs">
                          {categoryLabels[cat]}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>

                  {loadingCloset ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-xl" />
                      ))}
                    </div>
                  ) : filteredClosetGarments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {closetGarments.length === 0 ? 'Your closet is empty' : 'No garments in this category'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {filteredClosetGarments.map((garment) => {
                        const isSelected = isManuallySelected(garment);
                        return (
                          <button
                            key={garment.id}
                            onClick={() => toggleManualGarment(garment)}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                              isSelected
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-transparent hover:border-muted-foreground/30'
                            )}
                          >
                            <Image
                              src={getImageUrl(garment.photo_url)}
                              alt={garment.name}
                              fill
                              className="object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="size-4 text-primary-foreground" />
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                              <p className="text-white text-xs truncate">{garment.name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button
                onClick={handleSaveOutfit}
                disabled={!canSave}
                className="flex-1"
                size="lg"
              >
                Save Outfit {totalSelectedCount > 0 && `(${totalSelectedCount})`}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Saving */}
        {step === 'saving' && (
          <div className="text-center py-16">
            <Loader2 className="size-12 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Saving your outfit...</p>
          </div>
        )}
      </div>

      {croppingIndex !== null && imagePreview && (
        <ImageCropper
          imageSrc={imagePreview}
          onCropComplete={(blob) => handleCropComplete(croppingIndex, blob)}
          onCancel={() => setCroppingIndex(null)}
          aspectRatio={1}
        />
      )}
    </div>
  );
}
