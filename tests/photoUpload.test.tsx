import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  MAX_FIRESTORE_DATA_URL_BYTES,
  optimizeCanvasToDataUrl,
  PhotoUpload,
  utf8ByteLength
} from '../src/components/PhotoUpload';
import { isValidFirestoreImageUrl } from '../src/lib/firestoreContent';

function createMockCanvas(
  toDataURLImpl: (canvas: HTMLCanvasElement, mime?: string, quality?: number) => string
) {
  const fillRect = vi.fn();
  const clearRect = vi.fn();
  const drawImage = vi.fn();
  const ctx = {
    fillStyle: '',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    fillRect,
    clearRect,
    drawImage
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn((mime?: string, quality?: number) =>
      toDataURLImpl(canvas as unknown as HTMLCanvasElement, mime, quality)
    )
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx, fillRect, clearRect, drawImage };
}

describe('PhotoUpload optimization & Firestore 500 KB compliance', () => {
  const OriginalImage = globalThis.Image;
  const OriginalFileReader = globalThis.FileReader;

  afterEach(() => {
    cleanup();
    globalThis.Image = OriginalImage;
    globalThis.FileReader = OriginalFileReader;
    vi.restoreAllMocks();
  });

  it('utf8ByteLength accurately computes UTF-8 byte lengths', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('Zürich')).toBe(7); // 'ü' is 2 bytes in UTF-8
    expect(MAX_FIRESTORE_DATA_URL_BYTES).toBe(490_000);
  });

  it('keeps small PNGs as PNG without white background fill and normalizes uppercase prefix', () => {
    const { canvas, fillRect } = createMockCanvas((_c, mime) => {
      if (mime === 'image/png') {
        return `DATA:IMAGE/PNG;BASE64,${'A'.repeat(120_000)}`;
      }
      return `data:image/jpeg;base64,${'B'.repeat(50_000)}`;
    });

    const result = optimizeCanvasToDataUrl(
      canvas,
      { width: 600, height: 400 },
      'image/png',
      1200,
      MAX_FIRESTORE_DATA_URL_BYTES
    );

    expect(result.startsWith('data:image/png;base64,')).toBe(true);
    expect(utf8ByteLength(result)).toBeLessThanOrEqual(MAX_FIRESTORE_DATA_URL_BYTES);
    expect(fillRect).not.toHaveBeenCalled();
    expect(isValidFirestoreImageUrl(result)).toBe(true);
  });

  it('re-encodes oversized PNG as white-backed JPEG below 500,000 bytes', () => {
    const { canvas, ctx, fillRect, drawImage } = createMockCanvas((_c, mime, quality) => {
      if (mime === 'image/png') {
        // Simulates uncompressed PNG exceeding Firestore's 500 KB limit
        return `DATA:IMAGE/PNG;BASE64,${'P'.repeat(720_000)}`;
      }
      if (mime === 'image/jpeg') {
        const q = quality ?? 0.86;
        if (q >= 0.8) return `DATA:IMAGE/JPEG;BASE64,${'J'.repeat(540_000)}`;
        if (q >= 0.7) return `DATA:IMAGE/JPEG;BASE64,${'J'.repeat(360_000)}`;
        return `DATA:IMAGE/JPEG;BASE64,${'J'.repeat(220_000)}`;
      }
      return '';
    });

    const result = optimizeCanvasToDataUrl(
      canvas,
      { width: 1600, height: 1200 },
      'image/png',
      1200,
      MAX_FIRESTORE_DATA_URL_BYTES
    );

    expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(utf8ByteLength(result)).toBeLessThanOrEqual(MAX_FIRESTORE_DATA_URL_BYTES);
    expect(utf8ByteLength(result)).toBeLessThan(500_000);
    expect(ctx.fillStyle).toBe('#FFFFFF');
    expect(fillRect).toHaveBeenCalledWith(0, 0, 1200, 900);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(isValidFirestoreImageUrl(result)).toBe(true);
  });

  it('iteratively downscales oversized JPEG dimensions until encoded size fits below 500,000 bytes', () => {
    const recordedDims: Array<{ width: number; height: number; quality?: number }> = [];

    const { canvas } = createMockCanvas((c, mime, quality) => {
      recordedDims.push({ width: c.width, height: c.height, quality });
      expect(mime).toBe('image/jpeg');
      // Simulate payload proportional to pixel area * quality so only downscaled pass fits
      const area = c.width * c.height;
      const estimatedLength = Math.round(area * (quality ?? 0.86) * 1.4);
      return `DATA:IMAGE/JPEG;BASE64,${'K'.repeat(estimatedLength)}`;
    });

    const result = optimizeCanvasToDataUrl(
      canvas,
      { width: 2400, height: 1800 },
      'image/jpeg',
      1200,
      MAX_FIRESTORE_DATA_URL_BYTES
    );

    // Must have shrunk from initial 1200x900 down to smaller proportional dimensions
    expect(canvas.width).toBeLessThan(1200);
    expect(canvas.width).toBeGreaterThanOrEqual(240);
    expect(Math.round((canvas.width / canvas.height) * 100)).toBe(Math.round((4 / 3) * 100));
    expect(recordedDims.some((d) => d.width === 936 && d.height === 702)).toBe(true);

    expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(utf8ByteLength(result)).toBeLessThanOrEqual(MAX_FIRESTORE_DATA_URL_BYTES);
    expect(utf8ByteLength(result)).toBeLessThan(500_000);
    expect(isValidFirestoreImageUrl(result)).toBe(true);
  });

  it('optimizes an uploaded oversized PNG in <PhotoUpload /> and invokes onChange with a valid lowercase data URL', async () => {
    const rawOversizedPng = `DATA:IMAGE/PNG;BASE64,${'R'.repeat(680_000)}`;

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        this.result = rawOversizedPng;
        queueMicrotask(() => {
          this.onload?.({ target: { result: rawOversizedPng } } as unknown as ProgressEvent<FileReader>);
        });
      }
    }

    class MockImage {
      width = 1400;
      height = 1400;
      naturalWidth = 1400;
      naturalHeight = 1400;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.Image = MockImage as unknown as typeof Image;

    const { canvas } = createMockCanvas((_c, mime, quality) => {
      if (mime === 'image/png') {
        return `DATA:IMAGE/PNG;BASE64,${'P'.repeat(650_000)}`;
      }
      const len = (quality ?? 0.86) >= 0.8 ? 520_000 : 145_000;
      return `DATA:IMAGE/JPEG;BASE64,${'Q'.repeat(len)}`;
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        return canvas;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    const onChangeSpy = vi.fn();
    render(
      <PhotoUpload
        id="board-headshot"
        value=""
        onChange={onChangeSpy}
        aspectRatio="avatar"
      />
    );

    expect(screen.getByText(/Auto-optimized < 500 KB/i)).toBeInTheDocument();

    const fileInput = document.querySelector('#board-headshot-file-input') as HTMLInputElement;
    const pngFile = new File(['fake-png-bytes'], 'headshot.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    await waitFor(() => {
      expect(onChangeSpy).toHaveBeenCalledTimes(1);
    });

    const emittedUrl = onChangeSpy.mock.calls[0][0] as string;
    expect(emittedUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(utf8ByteLength(emittedUrl)).toBeLessThanOrEqual(500_000);
    expect(isValidFirestoreImageUrl(emittedUrl)).toBe(true);
  });

  it('rejects an oversized raw fallback (> 500,000 bytes), shows an inline error, and does NOT call onChange', async () => {
    const oversizedFallback = `DATA:IMAGE/PNG;BASE64,${'X'.repeat(560_000)}`;

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        this.result = oversizedFallback;
        queueMicrotask(() => {
          this.onload?.({
            target: { result: oversizedFallback }
          } as unknown as ProgressEvent<FileReader>);
        });
      }
    }

    class FailingMockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.Image = FailingMockImage as unknown as typeof Image;

    const onChangeSpy = vi.fn();
    render(<PhotoUpload id="fallback-test" value="" onChange={onChangeSpy} />);

    const fileInput = document.querySelector('#fallback-test-file-input') as HTMLInputElement;
    const pngFile = new File(['corrupt-large-png'], 'corrupt.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    const alertBanner = await screen.findByRole('alert');
    expect(alertBanner).toHaveTextContent(/500 KB/i);
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('normalizes uppercase prefix on a valid small raw fallback and renders Ready · KB badge when loaded', async () => {
    const smallFallback = `DATA:IMAGE/PNG;BASE64,${'A'.repeat(145_386)}`; // ~142 KB

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        this.result = smallFallback;
        queueMicrotask(() => {
          this.onload?.({
            target: { result: smallFallback }
          } as unknown as ProgressEvent<FileReader>);
        });
      }
    }

    class FailingMockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.Image = FailingMockImage as unknown as typeof Image;

    const onChangeSpy = vi.fn();
    const { rerender } = render(
      <PhotoUpload id="small-fallback-test" value="" onChange={onChangeSpy} />
    );

    const fileInput = document.querySelector('#small-fallback-test-file-input') as HTMLInputElement;
    const pngFile = new File(['small-png'], 'small.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    await waitFor(() => {
      expect(onChangeSpy).toHaveBeenCalledTimes(1);
    });

    const emitted = onChangeSpy.mock.calls[0][0] as string;
    expect(emitted.startsWith('data:image/png;base64,')).toBe(true);
    expect(isValidFirestoreImageUrl(emitted)).toBe(true);

    rerender(<PhotoUpload id="small-fallback-test" value={emitted} onChange={onChangeSpy} />);
    expect(screen.getByText('Ready · 142 KB')).toBeInTheDocument();
  });
});
