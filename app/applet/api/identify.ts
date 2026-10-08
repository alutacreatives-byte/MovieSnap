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
}

export async function identifySceneFromImage(base64Image: string): Promise<SceneIdentificationResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
  const mimeMatch = base64Image.match(/^data:(image\/[a-z]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const ai = new GoogleGenAI(apiKey ? { apiKey } : undefined);
  const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      const prompt = `You are an expert film and television scene recognition engine with live Google Search web grounding.
1. Inspect the provided image and analyze its visual features (actors, characters, set design, costumes, cinematography, location, text).
2. Perform an actual web search using Google Search grounding across IMDb, TMDB, and Rotten Tomatoes to find matching movie or TV series titles.
3. Compare the visual scene with the search results and return the best-supported match.
4. Retrieve genuine ratings (IMDb rating, Rotten Tomatoes score), release year, director, genre, and synopsis.

If the image cannot be reliably identified, return:
{"identified": false, "reason": "Scene not identified. Could not match visual features to a known movie or TV series."}

Respond in STRICT JSON format:
{
  "identified": true,
  "mediaType": "Movie" or "TV Series",
  "title": "Exact Title",
  "year": 2023,
  "runtime": "2h 10m",
  "genre": ["Sci-Fi", "Drama"],
  "synopsis": "Concise summary.",
  "director": "Director Name",
  "imdbRating": 8.5,
  "rottenTomatoesScore": 92,
  "rottenTomatoesAudienceScore": 88,
  "confidence": 0.95
}`;

      const response = await ai.models.generateContent({
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
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim();
      if (text) {
        const cleanText = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/, '');
        const parsed = JSON.parse(cleanText);

        if (parsed.identified && parsed.title) {
          const sources: Array<{ name: string; score: string; type: string }> = [];
          if (typeof parsed.rottenTomatoesScore === 'number') {
            sources.push({
              name: 'Rotten Tomatoes',
              score: `${parsed.rottenTomatoesScore}%`,
              type: 'critic',
            });
          }
          if (typeof parsed.imdbRating === 'number') {
            sources.push({
              name: 'IMDb',
              score: `${parsed.imdbRating}/10`,
              type: 'critic',
            });
          }

          return {
            identified: true,
            mediaType: parsed.mediaType === 'TV Series' ? 'TV Series' : 'Movie',
            title: parsed.title,
            year: parsed.year || new Date().getFullYear(),
            runtime: parsed.runtime || '2h 00m',
            genre: Array.isArray(parsed.genre) ? parsed.genre : ['Drama'],
            synopsis: parsed.synopsis || `Scene identified from ${parsed.title}.`,
            director: parsed.director || 'Unknown',
            imdbRating: typeof parsed.imdbRating === 'number' ? parsed.imdbRating : null,
            rottenTomatoesScore: typeof parsed.rottenTomatoesScore === 'number' ? parsed.rottenTomatoesScore : null,
            rottenTomatoesAudienceScore: typeof parsed.rottenTomatoesAudienceScore === 'number' ? parsed.rottenTomatoesAudienceScore : null,
            ratingSource: parsed.rottenTomatoesScore ? 'Rotten Tomatoes' : parsed.imdbRating ? 'IMDb' : 'The Movie Database (TMDB)',
            sources,
            confidence: parsed.confidence || 0.9,
          };
        }
      }
    } catch (err: unknown) {
      console.warn(`Model ${model} identification attempt failed:`, err);
    }
  }

  return {
    identified: false,
    reason: 'Scene not identified. Could not recognize visual features in this image.',
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
