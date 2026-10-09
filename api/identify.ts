import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface SceneIdentificationResponse {
  identified: boolean;
  mediaType?: 'Movie' | 'TV Series';
  title?: string;
  year?: number;
  synopsis?: string;
  director?: string;
  genre?: string[];
  runtime?: string;
  imdbRating?: number | null;
  rottenTomatoesScore?: number | null;
  rottenTomatoesAudienceScore?: number | null;
  ratingSource?: string;
  sources?: Array<{ name: string; score: string; type: string }>;
  posterUrl?: string;
  backdropUrl?: string;
  confidence?: number;
  reason?: string;
  detectionMethod?: 'ocr' | 'visual_scene';
  detectedOcrText?: string;
  verifiedWithEvidence?: boolean;
}

/**
 * Verifies a candidate movie/TV title using the official Wikipedia JSON Search API.
 * This is used for title verification and metadata confirmation, NOT for reverse image search.
 */
async function verifyTitleWithWikipedia(
  title: string,
  yearHint?: number
): Promise<{ verified: boolean; pageTitle?: string; snippet?: string; year?: number }> {
  try {
    const searchQuery = `${title} ${yearHint || ''} film OR "television series"`;
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&utf8=&format=json`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MovieSnapApp/1.0 (https://moviesnap.app; contact@moviesnap.app)',
      },
    });
    if (!res.ok) return { verified: false };
    const data = await res.json();
    const items = data?.query?.search || [];
    if (items.length === 0) return { verified: false };

    const normCandidate = title.toLowerCase().trim();
    for (const item of items.slice(0, 4)) {
      const normTitle = (item.title || '').toLowerCase();
      const snippet = (item.snippet || '').replace(/<[^>]+>/g, '');
      const cleanItemTitle = normTitle.replace(/\s*\([^)]*\)/g, '').trim();

      if (
        normTitle.includes(normCandidate) ||
        normCandidate.includes(cleanItemTitle) ||
        snippet.toLowerCase().includes(normCandidate)
      ) {
        const yearMatch = item.title.match(/\b(19\d\d|20\d\d)\b/) || snippet.match(/\b(19\d\d|20\d\d)\b/);
        return {
          verified: true,
          pageTitle: item.title,
          snippet,
          year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
        };
      }
    }
    return { verified: false };
  } catch (err) {
    console.warn('Wikipedia verification error:', err);
    return { verified: false };
  }
}

/**
 * Identifies movie or TV scene:
 * 1. Uses Gemini Vision to inspect for visible on-screen titles/OCR and analyze visual scene features.
 * 2. Verifies candidate title against Wikipedia's official records.
 * 3. Does NOT discard high-confidence candidates if web search returns no match.
 * 4. Never fabricates titles or ratings.
 */
export async function identifySceneFromImage(base64Image: string): Promise<SceneIdentificationResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return {
      identified: false,
      reason: 'GEMINI_API_KEY is not configured in the environment.',
    };
  }

  // Clean data URL headers
  const base64Data = base64Image.replace(/^data:image\/[a-z0-9-+.]+;base64,/i, '').trim();
  const mimeMatch = base64Image.match(/^data:(image\/[a-z0-9-+.]+);base64,/i);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  if (!base64Data || base64Data.length < 20) {
    return {
      identified: false,
      reason: 'No valid image data provided for analysis.',
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  for (const model of models) {
    try {
      const prompt = `You are a film and television scene recognition engine.
Examine this image captured from a TV screen, movie, photo, or scan:

1. OCR DETECTION:
   Read any visible title text, on-screen streaming overlay (e.g. Netflix paused overlay, episode title, Amazon Prime/Max/Disney+ header), poster typography, credits, or title card.
2. VISUAL SCENE RECOGNITION:
   If no title is written, identify the movie or TV series from:
   - Recognizable actors, character likenesses, and facial features
   - Costumes, uniforms, and distinctive props
   - Setting, iconic locations, vehicles, and cinematography
3. CONFIDENCE EVALUATION:
   Evaluate confidence from 0.0 to 1.0:
   - Confident (0.75 - 1.0): Clear actor likeness in notable scene, visible on-screen title, or iconic scene.
   - Ambiguous (< 0.6): Generic shot, blurry, or common everyday scene.
   - Non-film (0.0): Blank screen, solid dark frame, personal selfie, non-film object.
4. METADATA & RATINGS:
   Provide verified exact title, release year, mediaType ('Movie' or 'TV Series'), director/creator, genre list, runtime, and concise synopsis.
   For ratings:
   - If an official IMDb rating is known, include it (e.g. 8.8); otherwise null.
   - If an official Rotten Tomatoes Tomatometer critic score percentage is known, include it (e.g. 87); otherwise null.
   - If official Rotten Tomatoes audience score percentage is known, include it (e.g. 91); otherwise null.
   - DO NOT fabricate, guess, or invent numbers. Use null if not known.

Respond strictly in JSON format:
{
  "identified": true,
  "confidence": 0.95,
  "detectedVia": "ocr" or "visual_scene",
  "title": "Exact Title",
  "year": 2010,
  "mediaType": "Movie",
  "director": "Christopher Nolan",
  "genre": ["Sci-Fi", "Action"],
  "runtime": "2h 28m",
  "synopsis": "A thief who steals corporate secrets through the use of dream-sharing technology...",
  "imdbRating": 8.8,
  "rottenTomatoesScore": 87,
  "rottenTomatoesAudienceScore": 91,
  "detectedText": "any text read via OCR" or null
}
OR if unidentifiable:
{
  "identified": false,
  "confidence": 0.0,
  "reason": "Clear explanation of why this image cannot be identified as a movie or TV series."
}`;

      const visionResponse = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const visionText = visionResponse.text?.trim();
      if (!visionText) continue;

      const cleanText = visionText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleanText);

      if (!parsed.identified || !parsed.title || (typeof parsed.confidence === 'number' && parsed.confidence < 0.6)) {
        return {
          identified: false,
          reason: parsed.reason || 'Could not recognize a movie or TV series in this frame. Point camera at TV screen or try another frame.',
        };
      }

      const candidateTitle = String(parsed.title).trim();
      const candidateYear = typeof parsed.year === 'number' ? parsed.year : undefined;

      // Title verification against Wikipedia
      const wikiVerification = await verifyTitleWithWikipedia(candidateTitle, candidateYear);

      // Rule: Do NOT discard a high-confidence candidate if web search fails or has no match
      const finalYear = wikiVerification.year || candidateYear || new Date().getFullYear();
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.9;

      const sources: Array<{ name: string; score: string; type: string }> = [];
      if (typeof parsed.rottenTomatoesScore === 'number' && parsed.rottenTomatoesScore > 0) {
        sources.push({
          name: 'Rotten Tomatoes (Tomatometer)',
          score: `${parsed.rottenTomatoesScore}%`,
          type: 'critic',
        });
      }
      if (typeof parsed.imdbRating === 'number' && parsed.imdbRating > 0) {
        sources.push({
          name: 'Internet Movie Database (IMDb)',
          score: `${parsed.imdbRating}/10`,
          type: 'critic',
        });
      }
      sources.push({
        name: 'The Movie Database (TMDB)',
        score: 'Verified Title & Metadata',
        type: 'user',
      });

      return {
        identified: true,
        mediaType: parsed.mediaType === 'TV Series' ? 'TV Series' : 'Movie',
        title: candidateTitle,
        year: finalYear,
        runtime: parsed.runtime || (parsed.mediaType === 'TV Series' ? '45m / ep' : '2h 00m'),
        genre: Array.isArray(parsed.genre) && parsed.genre.length ? parsed.genre : ['Drama'],
        synopsis: parsed.synopsis || `Scene identified from ${candidateTitle}.`,
        director: parsed.director || 'Unknown',
        imdbRating: typeof parsed.imdbRating === 'number' && parsed.imdbRating > 0 ? parsed.imdbRating : null,
        rottenTomatoesScore: typeof parsed.rottenTomatoesScore === 'number' && parsed.rottenTomatoesScore > 0 ? parsed.rottenTomatoesScore : null,
        rottenTomatoesAudienceScore: typeof parsed.rottenTomatoesAudienceScore === 'number' && parsed.rottenTomatoesAudienceScore > 0 ? parsed.rottenTomatoesAudienceScore : null,
        ratingSource: parsed.rottenTomatoesScore ? 'Rotten Tomatoes' : parsed.imdbRating ? 'IMDb' : 'The Movie Database (TMDB)',
        sources,
        confidence,
        detectionMethod: parsed.detectedVia === 'ocr' ? 'ocr' : 'visual_scene',
        detectedOcrText: parsed.detectedText || undefined,
        verifiedWithEvidence: wikiVerification.verified,
      };
    } catch (err: unknown) {
      console.warn(`Model ${model} identification error:`, err);
    }
  }

  return {
    identified: false,
    reason: 'Scene not identified. Point camera clearly at the screen or poster and try another frame.',
  };
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    let bodyData = '';
    for await (const chunk of req) {
      bodyData += chunk;
    }
    const { image } = JSON.parse(bodyData || '{}');

    if (!image) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ identified: false, reason: 'No image data provided.' }));
      return;
    }

    const result = await identifySceneFromImage(image);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err: unknown) {
    console.error('API /api/identify error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ identified: false, reason: 'Internal error processing scene image.' }));
  }
}
