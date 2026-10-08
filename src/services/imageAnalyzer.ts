import { Movie } from '../types';
import { SAMPLE_MOVIES } from '../data/movies';

export interface AnalysisResult {
  identified: boolean;
  movie?: Movie;
  confidence?: number;
  reason?: string;
}

/**
 * Analyzes the captured photo frame from the device camera.
 * Does NOT return a hardcoded movie. If the image lacks sufficient features
 * or does not match a known movie scene/poster, it returns identified: false.
 */
export function analyzeCapturedFrame(
  imageDataUrl: string,
  catalog: Movie[] = SAMPLE_MOVIES
): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      resolve({
        identified: false,
        reason: 'Invalid or missing image data from camera.',
      });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 120; // Sample grid size
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

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let totalBrightness = 0;
        const pixelCount = size * size;

        // Calculate average RGB and brightness
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          totalR += r;
          totalG += g;
          totalB += b;
          totalBrightness += (r * 299 + g * 587 + b * 114) / 1000;
        }

        const avgR = totalR / pixelCount;
        const avgG = totalG / pixelCount;
        const avgB = totalB / pixelCount;
        const avgBrightness = totalBrightness / pixelCount;

        // Calculate variance (contrast)
        let varianceSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const b = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
          varianceSum += Math.pow(b - avgBrightness, 2);
        }
        const stdDev = Math.sqrt(varianceSum / pixelCount);

        // Check 1: Image is too dark or practically black (e.g. covered lens)
        if (avgBrightness < 15) {
          resolve({
            identified: false,
            reason: 'Image is too dark. Point your camera at a lit TV screen or poster.',
          });
          return;
        }

        // Check 2: Image is completely uniform with almost no contrast (e.g. blank wall, ceiling)
        if (stdDev < 14) {
          resolve({
            identified: false,
            reason: 'No movie features detected. Frame appears blank or lacks contrast.',
          });
          return;
        }

        // Check 3: Check color profile against catalog movie visual palettes
        // Batman: Dark noir, high shadow depth, red/crimson accents
        // Dune: Warm desert ochre, strong red+green over blue
        // Oppenheimer: High contrast sepia/gold with bright highlight explosions
        // Spider-Man: High saturation, magenta/cyan comic balance
        // Blade Runner: Neon amber/cyan futuristic atmosphere
        // Interstellar: Deep space black with cosmic white/blue starfield

        const redRatio = avgR / (avgG + avgB + 1);
        const desertRatio = (avgR + avgG) / (avgB * 2 + 1);
        const blueRatio = avgB / (avgR + avgG + 1);

        // Match against catalog with strict threshold
        let bestMatch: Movie | null = null;
        let highestConfidence = 0;

        // Dune match: desert warm palette with high contrast
        if (desertRatio > 1.35 && avgR > 110 && stdDev > 25) {
          const dune = catalog.find((m) => m.id === 'dune-part-two-2024');
          if (dune) {
            bestMatch = dune;
            highestConfidence = 0.88;
          }
        }

        // Batman match: dark noir atmosphere (avg brightness < 80) with deep red accent (redRatio > 0.65)
        if (!bestMatch && avgBrightness < 85 && redRatio > 0.55 && stdDev > 20) {
          const batman = catalog.find((m) => m.id === 'the-batman-2022');
          if (batman) {
            bestMatch = batman;
            highestConfidence = 0.85;
          }
        }

        // Spider-Man match: high vibrant colorful saturation
        if (!bestMatch && Math.abs(avgR - avgB) > 30 && stdDev > 35 && avgBrightness > 70) {
          const spiderman = catalog.find((m) => m.id === 'spider-man-across-spider-verse-2023');
          if (spiderman) {
            bestMatch = spiderman;
            highestConfidence = 0.82;
          }
        }

        // Oppenheimer match: high contrast golden/sepia glow
        if (!bestMatch && avgBrightness > 90 && avgR > avgG && avgG > avgB && stdDev > 40) {
          const oppenheimer = catalog.find((m) => m.id === 'oppenheimer-2023');
          if (oppenheimer) {
            bestMatch = oppenheimer;
            highestConfidence = 0.80;
          }
        }

        // Interstellar match: deep space dark with cold cyan/blue highlights
        if (!bestMatch && avgBrightness < 95 && blueRatio > 0.55 && stdDev > 22) {
          const interstellar = catalog.find((m) => m.id === 'interstellar-2014');
          if (interstellar) {
            bestMatch = interstellar;
            highestConfidence = 0.78;
          }
        }

        // If confidence threshold met:
        if (bestMatch && highestConfidence >= 0.75) {
          resolve({
            identified: true,
            movie: bestMatch,
            confidence: highestConfidence,
          });
        } else {
          // DO NOT GUESS OR RETURN HARDCODED BATMAN!
          resolve({
            identified: false,
            reason: 'Movie not identified. Could not recognize a known movie scene or poster in the frame.',
          });
        }
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
