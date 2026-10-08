import { Movie } from '../types';
import { SAMPLE_MOVIES } from '../data/movies';

export interface AnalysisResult {
  identified: boolean;
  movie?: Movie;
  confidence?: number;
  reason?: string;
}

/**
 * Analyzes the captured frame without guessing.
 * NEVER returns Oppenheimer, Batman, or any default movie when identification fails.
 */
export function analyzeCapturedFrame(
  imageDataUrl: string,
  catalog: Movie[] = SAMPLE_MOVIES
): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      resolve({
        identified: false,
        reason: 'Invalid or missing image data from camera feed.',
      });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 120;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ identified: false, reason: 'Could not process image canvas.' });
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        let totalBrightness = 0;
        const pixelCount = size * size;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          totalBrightness += (r * 299 + g * 587 + b * 114) / 1000;
        }

        const avgBrightness = totalBrightness / pixelCount;

        // Calculate variance (contrast)
        let varianceSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const b = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
          varianceSum += Math.pow(b - avgBrightness, 2);
        }
        const stdDev = Math.sqrt(varianceSum / pixelCount);

        // Check 1: Image is too dark (e.g. lens covered)
        if (avgBrightness < 16) {
          resolve({
            identified: false,
            reason: 'Image is too dark. Please aim at an active TV screen, monitor, or movie poster.',
          });
          return;
        }

        // Check 2: Image lacks visual contrast (e.g. blank wall or ceiling)
        if (stdDev < 12) {
          resolve({
            identified: false,
            reason: 'Frame lacks distinct movie visual features. Point directly at your TV or poster.',
          });
          return;
        }

        // NO HARDCODED OPPENHEIMER, BATMAN OR HEURISTIC GUESSING.
        // Unless verified visual matching or AI vision identifies a movie, do NOT invent a match.
        resolve({
          identified: false,
          reason: 'Movie not identified. Could not recognize a known movie scene or poster in this frame.',
        });
      } catch (err) {
        console.error('Frame analysis error:', err);
        resolve({
          identified: false,
          reason: 'Error processing frame. Please try again.',
        });
      }
    };

    img.onerror = () => {
      resolve({
        identified: false,
        reason: 'Failed to load captured image for analysis.',
      });
    };

    img.src = imageDataUrl;
  });
}
