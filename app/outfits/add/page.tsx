'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PageHeader from '../../components/PageHeader';
import ImageUpload from '../../components/ImageUpload';
import ImageCropper from '../../components/ImageCropper';
import { uploadImage, uploadBlob, fileToBase64 } from '@/lib/storage';
import { getImageUrl, getTodayString } from '@/lib/supabase';
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
  const [step, setStep] = useState<Step>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [wornDate, setWornDate] = useState(getTodayString());
  const [detectedGarments, setDetectedGarments] = useState<DetectedGarment[]>([]);
  const [selectedGarments, setSelectedGarments] = useState<Map<number, Garment | 'new'>>(new Map());
  const [newGarmentData, setNewGarmentData] = useState<Map<number, { name: string; category: Category; season: Season }>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  // Cropping state
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [croppedImages, setCroppedImages] = useState<Map<number, { blob: Blob; preview: string }>>(new Map());
  
  // Manual selection state
  const [showClosetPicker, setShowClosetPicker] = useState(false);
  const [closetGarments, setClosetGarments] = useState<Garment[]>([]);
  const [manuallySelectedGarments, setManuallySelectedGarments] = useState<Garment[]>([]);
  const [closetFilter, setClosetFilter] = useState<Category | 'all'>('all');
  const [loadingCloset, setLoadingCloset] = useState(false);

  // Fetch closet garments when picker is opened
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

      // Auto-select matched garments
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
      // Select it - use matched garment if available, otherwise mark as new
      if (detected.matchedGarment) {
        newSelections.set(index, detected.matchedGarment);
      } else {
        newSelections.set(index, 'new');
        // Set default new garment data
        if (!newGarmentData.has(index)) {
          setNewGarmentData(new Map(newGarmentData).set(index, {
            name: detected.name,
            category: detected.category,
            season: detected.season,
          }));
        }
      }
    } else {
      // Deselect it
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
      // Upload outfit photo
      const outfitPhotoUrl = await uploadImage(imageFile, 'outfits');

      // Create new garments first
      const garmentIds: string[] = [];

      // Add detected garments that are selected
      for (const [index, selection] of selectedGarments) {
        if (selection === 'new') {
          const data = newGarmentData.get(index);
          if (!data) continue;

          // Use cropped image if available, otherwise use full outfit photo
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

      // Add manually selected garments from closet
      for (const garment of manuallySelectedGarments) {
        if (!garmentIds.includes(garment.id)) {
          garmentIds.push(garment.id);
        }
      }

      // Create outfit
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

      router.push('/outfits/calendar');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('review');
    }
  }

  const totalSelectedCount = selectedGarments.size + manuallySelectedGarments.length;
  const canSave = totalSelectedCount > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader title="Add Outfit" showBack />

      <div className="p-4 max-w-lg mx-auto">
        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <ImageUpload onImageSelect={handleImageSelect} />

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Date Worn
              </label>
              <input
                type="date"
                value={wornDate}
                onChange={(e) => setWornDate(e.target.value)}
                max={getTodayString()}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!imageFile}
              className="w-full py-4 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Analyze Outfit
            </button>
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Analyzing your outfit...</p>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="space-y-6">
            {/* Outfit Preview */}
            {imagePreview && (
              <div className="aspect-square relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <Image src={imagePreview} alt="Outfit" fill className="object-cover" />
              </div>
            )}

            <div className="text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                {detectedGarments.length > 0 
                  ? `Found ${detectedGarments.length} garments in your outfit`
                  : 'No garments were automatically detected'}
              </p>
            </div>

            {/* No detection message with guidance */}
            {detectedGarments.length === 0 && !showClosetPicker && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-amber-800 dark:text-amber-200 text-sm mb-3">
                  The AI couldn&apos;t automatically detect garments in this photo. You can manually select items from your closet to add to this outfit.
                </p>
                <button
                  onClick={() => setShowClosetPicker(true)}
                  className="w-full py-3 rounded-lg bg-amber-600 text-white font-medium text-sm"
                >
                  Select from Closet
                </button>
              </div>
            )}

            {/* Detected Garments */}
            {detectedGarments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Detected Garments</h3>
                {detectedGarments.map((garment, index) => {
                  const isSelected = selectedGarments.has(index);
                  const selection = selectedGarments.get(index);
                  const isNew = selection === 'new';

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border transition-colors ${
                        isSelected
                          ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <button
                        onClick={() => toggleGarmentSelection(index, garment)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">{garment.name}</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                              {garment.category} • {garment.season}
                            </p>
                            {garment.matchedGarment && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                                  <Image
                                    src={getImageUrl(garment.matchedGarment.photo_url)}
                                    alt={garment.matchedGarment.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <span className="text-sm text-green-600 dark:text-green-400">
                                  Matched: {garment.matchedGarment.name}
                                </span>
                              </div>
                            )}
                            {!garment.matchedGarment && (
                              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                                No match found - will create new
                              </p>
                            )}
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-violet-600 border-violet-600'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* New garment form */}
                      {isNew && (
                        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                          {/* Crop image section */}
                          <div className="flex items-center gap-3">
                            {croppedImages.get(index) ? (
                              <>
                                <div className="w-16 h-16 rounded-lg overflow-hidden relative bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                                  <Image
                                    src={croppedImages.get(index)!.preview}
                                    alt="Cropped preview"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                    Image cropped
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setCroppingIndex(index)}
                                      className="text-xs text-violet-600 dark:text-violet-400"
                                    >
                                      Re-crop
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeCroppedImage(index)}
                                      className="text-xs text-zinc-500 dark:text-zinc-400"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-16 h-16 rounded-lg overflow-hidden relative bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
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
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                                    Using full outfit photo
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setCroppingIndex(index)}
                                    className="px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium"
                                  >
                                    Crop to this garment
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          <input
                            type="text"
                            value={newGarmentData.get(index)?.name || garment.name}
                            onChange={(e) => handleNewGarmentChange(index, 'name', e.target.value)}
                            placeholder="Garment name"
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm"
                          />
                          <div className="flex gap-2">
                            <select
                              value={newGarmentData.get(index)?.category || garment.category}
                              onChange={(e) => handleNewGarmentChange(index, 'category', e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm"
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
                              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm"
                            >
                              <option value="all-season">All Season</option>
                              <option value="summer">Summer</option>
                              <option value="winter">Winter</option>
                              <option value="mid-season">Mid-Season</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manually Selected Garments */}
            {manuallySelectedGarments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  Manually Added ({manuallySelectedGarments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {manuallySelectedGarments.map((garment) => (
                    <div
                      key={garment.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-300 dark:border-violet-700"
                    >
                      <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                        <Image
                          src={getImageUrl(garment.photo_url)}
                          alt={garment.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-sm text-zinc-900 dark:text-zinc-100">{garment.name}</span>
                      <button
                        onClick={() => toggleManualGarment(garment)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add from closet button (when garments were detected) */}
            {detectedGarments.length > 0 && !showClosetPicker && (
              <button
                onClick={() => setShowClosetPicker(true)}
                className="w-full py-3 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                + Add more from closet
              </button>
            )}

            {/* Closet Picker Modal */}
            {showClosetPicker && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Select from Closet</h3>
                  <button
                    onClick={() => setShowClosetPicker(false)}
                    className="text-sm text-violet-600 dark:text-violet-400"
                  >
                    Done
                  </button>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(['all', 'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setClosetFilter(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                        closetFilter === cat
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Garments Grid */}
                {loadingCloset ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 mx-auto border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredClosetGarments.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
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
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-violet-500 ring-2 ring-violet-500/30'
                              : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                          }`}
                        >
                          <Image
                            src={getImageUrl(garment.photo_url)}
                            alt={garment.name}
                            fill
                            className="object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-violet-600/30 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
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
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('upload')}
                className="flex-1 py-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSaveOutfit}
                disabled={!canSave}
                className="flex-1 py-4 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50"
              >
                Save Outfit {totalSelectedCount > 0 && `(${totalSelectedCount})`}
              </button>
            </div>
          </div>
        )}

        {/* Step: Saving */}
        {step === 'saving' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Saving your outfit...</p>
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
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
