'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 50,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageCropper({ 
  imageSrc, 
  onCropComplete, 
  onCancel,
  aspectRatio = 1 
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [localImageSrc, setLocalImageSrc] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Convert external URL to local blob URL to avoid CORS issues with canvas
  useEffect(() => {
    async function loadImage() {
      setLoadingImage(true);
      try {
        // If it's already a data URL or blob URL, use it directly
        if (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')) {
          setLocalImageSrc(imageSrc);
        } else {
          // Fetch the image as a blob to avoid CORS canvas tainting
          const response = await fetch(imageSrc);
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setLocalImageSrc(objectUrl);
        }
      } catch (err) {
        console.error('Failed to load image:', err);
        // Fall back to original URL
        setLocalImageSrc(imageSrc);
      } finally {
        setLoadingImage(false);
      }
    }
    loadImage();

    // Cleanup blob URL on unmount
    return () => {
      if (localImageSrc && localImageSrc.startsWith('blob:') && localImageSrc !== imageSrc) {
        URL.revokeObjectURL(localImageSrc);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerAspectCrop(width, height, aspectRatio);
    setCrop(initialCrop);
    
    // Also set completedCrop with pixel values so Done button works immediately
    if (initialCrop.unit === '%') {
      setCompletedCrop({
        unit: 'px',
        x: (initialCrop.x / 100) * width,
        y: (initialCrop.y / 100) * height,
        width: (initialCrop.width / 100) * width,
        height: (initialCrop.height / 100) * height,
      });
    }
  }, [aspectRatio]);

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!completedCrop || !imgRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Calculate the scale factor between displayed size and natural size
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to the cropped area dimensions
    const outputWidth = completedCrop.width * scaleX;
    const outputHeight = completedCrop.height * scaleY;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Draw the cropped portion of the image
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      outputWidth,
      outputHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.9
      );
    });
  }, [completedCrop]);

  const handleSaveCrop = async () => {
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      } else {
        console.error('Failed to create cropped image blob');
        alert('Failed to crop image. Please try again.');
      }
    } catch (err) {
      console.error('Error cropping image:', err);
      alert('Failed to crop image. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <button
          onClick={onCancel}
          className="text-white/80 hover:text-white"
        >
          Cancel
        </button>
        <h3 className="text-white font-medium">Crop Garment Image</h3>
        <button
          onClick={handleSaveCrop}
          disabled={!completedCrop || loadingImage}
          className="text-violet-400 hover:text-violet-300 font-medium disabled:opacity-50"
        >
          Done
        </button>
      </div>

      {/* Crop Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {loadingImage ? (
          <div className="text-white">Loading image...</div>
        ) : localImageSrc ? (
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            className="max-h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={localImageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[70vh] w-auto"
            />
          </ReactCrop>
        ) : (
          <div className="text-red-400">Failed to load image</div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-black/50 text-center">
        <p className="text-white/70 text-sm">
          Drag to select the area containing this garment
        </p>
      </div>
    </div>
  );
}
