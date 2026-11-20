import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, CheckCircle2, AlertCircle, Link } from 'lucide-react';

export interface PhotoUploadProps {
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

export const MAX_FIRESTORE_DATA_URL_BYTES = 490_000;
const FIRESTORE_HARD_DATA_URL_LIMIT = 500_000;
const MIN_CANVAS_MAX_DIM = 240;
const CANVAS_SHRINK_FACTOR = 0.78;
const JPEG_INITIAL_QUALITIES = [0.84, 0.74, 0.64, 0.52, 0.42] as const;
const JPEG_SHRINK_QUALITIES = [0.78, 0.65, 0.52, 0.42] as const;

const DATA_URL_PREFIX_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;
const STRICT_FIRESTORE_DATA_URL_REGEX =
  /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const ALLOWED_RASTER_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif'
]);

const utf8Encoder = new TextEncoder();

export function utf8ByteLength(str: string): number {
  return utf8Encoder.encode(str).length;
}

function normalizeDataUrlPrefix(dataUrl: string): string {
  return dataUrl.trim().replace(DATA_URL_PREFIX_REGEX, (prefix) => prefix.toLowerCase());
}

function isValidRasterDataUrl(dataUrl: string): boolean {
  return STRICT_FIRESTORE_DATA_URL_REGEX.test(dataUrl);
}

function computeScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDim: number
): { width: number; height: number } {
  let width = srcWidth;
  let height = srcHeight;

  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.max(1, Math.round((height * maxDim) / width));
      width = Math.max(1, Math.round(maxDim));
    } else {
      width = Math.max(1, Math.round((width * maxDim) / height));
      height = Math.max(1, Math.round(maxDim));
    }
  } else {
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
  }

  return { width, height };
}

function drawImageToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: Pick<HTMLImageElement, 'width' | 'height'>,
  srcWidth: number,
  srcHeight: number,
  maxDim: number,
  fillWhiteBackground: boolean
): { width: number; height: number } {
  const { width, height } = computeScaledDimensions(srcWidth, srcHeight, maxDim);
  canvas.width = width;
  canvas.height = height;

  if (fillWhiteBackground) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else if (typeof ctx.clearRect === 'function') {
    ctx.clearRect(0, 0, width, height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img as CanvasImageSource, 0, 0, width, height);
  return { width, height };
}

/**
 * Progressively optimizes a decoded image onto a canvas until the Base64
 * data URL fits within `maxBytes` (default 490 KB, leaving headroom under
 * Firestore's 500,000-byte limit) with a strictly lowercase MIME prefix.
 */
export function optimizeCanvasToDataUrl(
  canvas: HTMLCanvasElement,
  img: Pick<HTMLImageElement, 'width' | 'height'> &
    Partial<Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight'>>,
  preferredMime: string = 'image/jpeg',
  initialMaxDim: number = 1200,
  maxBytes: number = MAX_FIRESTORE_DATA_URL_BYTES
): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;
  if (!Number.isFinite(srcWidth) || !Number.isFinite(srcHeight) || srcWidth <= 0 || srcHeight <= 0) {
    return '';
  }

  const normalizedPreferred = preferredMime.toLowerCase();
  const firstMime = normalizedPreferred === 'image/png' ? 'image/png' : 'image/jpeg';
  const fillWhiteFirst = firstMime === 'image/jpeg';

  let bestCandidate = '';
  let bestBytes = Number.POSITIVE_INFINITY;

  const tryEncode = (mime: string, quality?: number): string | null => {
    let raw: string;
    try {
      raw = quality !== undefined ? canvas.toDataURL(mime, quality) : canvas.toDataURL(mime);
    } catch {
      return null;
    }
    const candidate = normalizeDataUrlPrefix(raw);
    if (!isValidRasterDataUrl(candidate)) {
      return null;
    }
    const bytes = utf8ByteLength(candidate);
    if (bytes < bestBytes) {
      bestCandidate = candidate;
      bestBytes = bytes;
    }
    return bytes <= maxBytes ? candidate : null;
  };

  // Pass 1: Preferred MIME at initial max dimension (preserves transparency for small PNGs)
  drawImageToCanvas(canvas, ctx, img, srcWidth, srcHeight, initialMaxDim, fillWhiteFirst);
  const initialFit =
    firstMime === 'image/png' ? tryEncode('image/png') : tryEncode('image/jpeg', 0.86);
  if (initialFit) {
    return initialFit;
  }

  // Pass 2: Re-encode as white-backed JPEG across stepped quality levels
  if (!fillWhiteFirst) {
    drawImageToCanvas(canvas, ctx, img, srcWidth, srcHeight, initialMaxDim, true);
  }
  for (const quality of JPEG_INITIAL_QUALITIES) {
    const fit = tryEncode('image/jpeg', quality);
    if (fit) {
      return fit;
    }
  }

  // Pass 3: Iteratively shrink dimensions by 0.78 down to 240px and retry JPEG qualities
  let currentMaxDim = Math.min(initialMaxDim, Math.max(srcWidth, srcHeight));
  while (currentMaxDim > MIN_CANVAS_MAX_DIM) {
    const nextMaxDim = Math.max(MIN_CANVAS_MAX_DIM, Math.round(currentMaxDim * CANVAS_SHRINK_FACTOR));
    if (nextMaxDim >= currentMaxDim) break;
    currentMaxDim = nextMaxDim;

    drawImageToCanvas(canvas, ctx, img, srcWidth, srcHeight, currentMaxDim, true);
    for (const quality of JPEG_SHRINK_QUALITIES) {
      const fit = tryEncode('image/jpeg', quality);
      if (fit) {
        return fit;
      }
    }
  }

  return bestCandidate;
}

/**
 * Optimizes and converts an uploaded File to a clean Base64 data URL.
 * Automatically resizes and re-encodes large camera/phone photos so the
 * encoded Base64 string stays safely under Firestore's 500,000-byte limit.
 */
function processAndOptimizeImage(
  file: File,
  maxDimension: number = 1200,
  maxBytes: number = MAX_FIRESTORE_DATA_URL_BYTES
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = typeof event.target?.result === 'string' ? event.target.result : '';
      if (!rawDataUrl) {
        reject(new Error('Could not read image file.'));
        return;
      }

      const normalizedRaw = normalizeDataUrlPrefix(rawDataUrl);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const preferredMime =
          file.type.toLowerCase() === 'image/png' ? 'image/png' : 'image/jpeg';
        const optimized = optimizeCanvasToDataUrl(
          canvas,
          img,
          preferredMime,
          maxDimension,
          maxBytes
        );
        resolve(optimized || normalizedRaw);
      };
      img.onerror = () => {
        // Fallback to normalized raw data URL; handleFile enforces size & format limits
        resolve(normalizedRaw);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file.'));
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
  const base64Bytes = value && value.startsWith('data:') ? utf8ByteLength(value) : null;
  const base64SizeKb =
    base64Bytes !== null ? Math.max(1, Math.round(base64Bytes / 1024)) : null;
  const isWithinStorageCap =
    base64Bytes === null || base64Bytes <= FIRESTORE_HARD_DATA_URL_LIMIT;

  const handleFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      // Validate file type (raster images only; SVG disallowed by firestore.rules)
      if (!ALLOWED_RASTER_MIME_TYPES.has(file.type.toLowerCase())) {
        setErrorMessage('Only raster image files (PNG, JPEG, WEBP, GIF) are supported.');
        return;
      }

      // Validate raw file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setErrorMessage(`File is too large. Please upload an image under ${maxSizeMB}MB.`);
        return;
      }

      try {
        setIsProcessing(true);
        const maxDim = isAvatar ? 500 : 1200;
        const dataUrl = await processAndOptimizeImage(
          file,
          maxDim,
          MAX_FIRESTORE_DATA_URL_BYTES
        );
        const normalizedDataUrl = normalizeDataUrlPrefix(dataUrl);
        const encodedBytes = utf8ByteLength(normalizedDataUrl);

        if (encodedBytes > FIRESTORE_HARD_DATA_URL_LIMIT) {
          const encodedKb = Math.ceil(encodedBytes / 1024);
          setErrorMessage(
            `This image could not be optimized to < 500 KB (encoded size: ${encodedKb} KB). Please choose a smaller image or paste an external image URL.`
          );
          return;
        }

        if (!isValidRasterDataUrl(normalizedDataUrl)) {
          setErrorMessage(
            'The selected image could not be encoded as a supported raster image (PNG, JPEG, WEBP, GIF).'
          );
          return;
        }

        onChange(normalizedDataUrl);
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
    e.target.value = '';
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
            <span
              className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                isWithinStorageCap
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-amber-800 bg-amber-50 border-amber-200'
              }`}
            >
              {isWithinStorageCap ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-600" />
              )}
              {base64SizeKb !== null
                ? isWithinStorageCap
                  ? `Ready · ${base64SizeKb} KB`
                  : `${base64SizeKb} KB (> 500 KB)`
                : 'Photo loaded'}
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
                className={`w-full h-full object-cover ${isAvatar ? 'object-top' : 'object-center'}`}
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
                  {base64SizeKb !== null
                    ? isWithinStorageCap
                      ? `Automatically optimized to < 500 KB (${base64SizeKb} KB)`
                      : `Encoded size (${base64SizeKb} KB) exceeds the 500 KB limit`
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
                <span>PNG, JPG, WEBP or GIF (Up to {maxSizeMB}MB · Auto-optimized &lt; 500 KB)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium animate-in fade-in duration-200"
        >
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
