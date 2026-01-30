import { supabase, getImageUrl } from './supabase';

/**
 * Upload an image to Supabase Storage
 * @param file - The file to upload
 * @param folder - The folder path (e.g., 'garments' or 'outfits')
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(file: File, folder: 'garments' | 'outfits'): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return fileName;
}

/**
 * Delete an image from Supabase Storage
 * @param path - The path of the image to delete
 */
export async function deleteImage(path: string): Promise<void> {
  if (!path || path.startsWith('http')) return;

  const { error } = await supabase.storage
    .from('images')
    .remove([path]);

  if (error) {
    console.error('Failed to delete image:', error.message);
  }
}

/**
 * Convert a File to base64 string for AI vision analysis
 * @param file - The file to convert
 * @returns Base64 encoded string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Get the full public URL for a storage path
 */
export { getImageUrl };
