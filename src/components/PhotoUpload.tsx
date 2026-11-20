import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, CheckCircle2, AlertCircle, Link } from 'lucide-react';

interface PhotoUploadProps {
  id?: string;
  value?: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  sublabel?: string;
  aspectRatio?: 'video' | 'square' | 'avatar' | 'wide';
  maxSizeMB?: number;
  presets?: { label: string; url: string }[];
  allowUrlInput?: boolean;
}

const ALLOWED_RASTER_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif'
]);

/**
 * Optimizes and converts an uploaded File to a clean Base64 data URL.
 * Automatically resizes large camera/phone photos to max dimension
 * to maintain crisp fidelity while keeping local state responsive.
 */
function processAndOptimizeImage(
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // Fallback to raw dataURL if canvas draw fails
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  id = 'photo-upload',
  value,
  onChange,
  label = 'Upload Photo',
  sublabel = 'Drag & drop your image here, or browse files from your device',
  aspectRatio = 'video',
  maxSizeMB = 10,
  presets = [],
  allowUrlInput = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAvatar = aspectRatio === 'avatar';

  const handleFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      // Validate file type (raster images only; SVG disallowed by firestore.rules)
      if (!ALLOWED_RASTER_MIME_TYPES.has(file.type.toLowerCase())) {
        setErrorMessage('Only raster image files (PNG, JPEG, WEBP, GIF) are supported.');
        return;
      }

      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setErrorMessage(`File is too large. Please upload an image under ${maxSizeMB}MB.`);
        return;
      }

      try {
        setIsProcessing(true);
        const maxDim = isAvatar ? 500 : 1200;
        const dataUrl = await processAndOptimizeImage(file, maxDim);
        onChange(dataUrl);
      } catch (err) {
        console.error('Error processing image:', err);
        setErrorMessage('Failed to process image file. Please try another image.');
      } finally {
        setIsProcessing(false);
      }
    },
    [isAvatar, maxSizeMB, onChange]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleApplyUrl = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (customUrl.trim()) {
      onChange(customUrl.trim());
      setCustomUrl('');
      setShowUrlFallback(false);
      setErrorMessage(null);
    }
  };

  const handleClear = () => {
    onChange('');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div id={id} className="w-full space-y-2.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-[#121c2a] uppercase tracking-wide">
            {label}
          </label>
          {value && (
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Photo loaded
            </span>
          )}
        </div>
      )}

      {/* Hidden File Input (triggered via click) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onFileSelect}
        className="hidden"
        id={`${id}-file-input`}
      />

      {/* Main Preview or Upload Box */}
      {value ? (
        /* Display Current Image Preview with Replace / Remove Actions */
        <div className="bg-[#f9f9ff] border border-[#bec7d2] rounded-xl p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Image Preview Container */}
            <div
              className={`relative overflow-hidden shrink-0 border border-[#006191]/30 bg-gray-100 shadow-2xs ${
                isAvatar
                  ? 'w-24 h-24 rounded-full'
                  : aspectRatio === 'wide'
                  ? 'w-full sm:w-48 aspect-21/9 rounded-lg'
                  : aspectRatio === 'square'
                  ? 'w-full sm:w-32 aspect-square rounded-lg'
                  : 'w-full sm:w-44 aspect-video rounded-lg'
              }`}
            >
              <img
                src={value}
                alt="Uploaded preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLElement).style.opacity = '0.3';
                }}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Info & Action Buttons */}
            <div className="flex-1 w-full space-y-2 text-center sm:text-left">
              <div>
                <p className="text-xs font-bold text-[#121c2a]">
                  {value.startsWith('data:') ? 'Custom Photo Uploaded from Device' : 'Photo Configured'}
                </p>
                <p className="text-[11px] text-[#566771] mt-0.5">
                  {value.startsWith('data:')
                    ? 'Stored in high resolution and ready for publication'
                    : 'Source: ' + value.slice(0, 42) + '...'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  id={`${id}-replace-btn`}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-[#006191] text-white hover:bg-[#007bb6] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Different Photo</span>
                </button>

                <button
                  type="button"
                  id={`${id}-clear-btn`}
                  onClick={handleClear}
                  className="px-3 py-1.5 bg-white border border-[#bec7d2] hover:border-[#ba1a1a] text-[#ba1a1a] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer hover:bg-rose-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: Drag & Drop Dropzone */
        <div
          id={`${id}-dropzone`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer group ${
            isDragging
              ? 'border-[#006191] bg-[#eff3ff] scale-[1.01]'
              : 'border-[#bec7d2] hover:border-[#006191] bg-[#f9f9ff] hover:bg-[#eff3ff]/50'
          }`}
        >
          {isProcessing ? (
            <div className="py-4 space-y-2">
              <RefreshCw className="w-8 h-8 text-[#006191] mx-auto animate-spin" />
              <p className="text-xs font-semibold text-[#006191]">Processing &amp; optimizing photo...</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#eff3ff] group-hover:bg-[#d3e5f1] text-[#006191] flex items-center justify-center transition-colors">
                <UploadCloud className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>

              <div>
                <p className="text-xs sm:text-sm font-bold text-[#121c2a]">
                  <span className="text-[#006191] underline decoration-[#006191]/40 group-hover:decoration-[#006191]">
                    Click to browse files
                  </span>{' '}
                  or drag and drop photo
                </p>
                <p className="text-[11px] sm:text-xs text-[#566771] mt-1">{sublabel}</p>
              </div>

              <div className="inline-flex items-center gap-2 text-[10px] font-semibold text-[#566771] uppercase tracking-wider bg-white px-2.5 py-1 rounded-full border border-[#bec7d2]/60 shadow-2xs">
                <ImageIcon className="w-3 h-3 text-[#006191]" />
                <span>PNG, JPG, WEBP or GIF (Max {maxSizeMB}MB)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Presets and URL Fallback Options */}
      <div className="pt-1 space-y-2">
        {/* Curated Sample Presets for Quick Testing */}
        {presets.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[#566771] mb-1.5">
              Or pick from recommended community presets:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(p.url);
                    setErrorMessage(null);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                    value === p.url
                      ? 'bg-[#006191] text-white border-[#006191] shadow-2xs'
                      : 'bg-white text-[#3f4850] border-[#bec7d2] hover:border-[#006191] hover:text-[#006191]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary: Manual URL input link */}
        {allowUrlInput && (
          <div className="text-right">
            {!showUrlFallback ? (
              <button
                type="button"
                onClick={() => setShowUrlFallback(true)}
                className="text-[11px] text-[#006191] hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <Link className="w-3 h-3" />
                <span>Paste external image URL instead</span>
              </button>
            ) : (
              <div
                role="group"
                aria-label="External image URL input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyUrl();
                  }
                }}
                className="flex items-center gap-2 mt-2"
              >
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                />
                <button
                  type="button"
                  onClick={() => handleApplyUrl()}
                  className="px-3 py-1.5 bg-[#006191] text-white text-xs font-semibold rounded-lg hover:bg-[#007bb6] cursor-pointer"
                >
                  Apply URL
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlFallback(false)}
                  className="px-2 py-1.5 text-xs text-[#566771] hover:text-[#121c2a] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
