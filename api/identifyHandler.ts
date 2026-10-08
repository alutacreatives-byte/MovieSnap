import { GoogleGenAI } from '@google/genai';

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

/**
 * Real visual scene identification handler.
 * Analyzes actors, characters, locations, costumes, cinematography and visual context.
 * Identifies both Movies and TV Series from actual scenes.
 * Never defaults to Oppenheimer or fabricated titles.
 */
export async function identifySceneFromImage(base64Image: string): Promise<SceneIdentificationResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      identified: false,
      reason: 'MovieSnap Vision API key (GEMINI_API_KEY) is not configured in the environment.',
    };
  }

  // Clean data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
  const mimeMatch = base64Image.match(/^data:(image\/[a-z]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `You are a film and television scene recognition engine.
Inspect this captured scene image and use Google Search to verify and identify if this image shows a recognizable scene from an existing Movie or TV Series.
Crucial rules:
1. The image does NOT need to contain the title, poster, text, or subtitles. Use visual information such as recognizable actors, characters, setting, locations, costumes, lighting, cinematography, and production style.
2. Distinguish clearly whether it is a "Movie" or a "TV Series".
3. Use Google Search grounding to verify the exact title, release year, director, genre, synopsis, IMDb rating, and Rotten Tomatoes score against official IMDb, TMDB, and Rotten Tomatoes databases.
4. Ratings:
   - Provide the real IMDb rating (e.g. 8.4) if known.
   - If an official Rotten Tomatoes score is publicly known for this title, include it; otherwise set null. Do NOT invent or guess scores.
5. If the image is a solid block, blurry, a selfie, random household room, furniture, or cannot be confidently identified as a known movie/TV series:
   Respond with: {"identified": false, "reason": "Scene not identified. Could not match visual features to a known movie or TV series."}

Respond in STRICT JSON format with this exact structure:
{
  "identified": true,
  "mediaType": "Movie" or "TV Series",
  "title": "Exact Title",
  "year": 2023,
  "runtime": "2h 10m" or "45m / ep",
  "genre": ["Sci-Fi", "Drama"],
  "synopsis": "Concise 1-2 sentence synopsis of the title.",
  "director": "Director or Creator Name",
  "imdbRating": 8.5 or null,
  "rottenTomatoesScore": 92 or null,
  "rottenTomatoesAudienceScore": 88 or null,
  "primaryRatingSource": "IMDb" or "Rotten Tomatoes",
  "confidence": 0.95
}`;

  // Try candidate models in order of speed and capability
  const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
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
        const parsed = JSON.parse(text);
        if (parsed.identified && parsed.title) {
          const sources: Array<{ name: string; score: string; type: string }> = [];
          if (parsed.rottenTomatoesScore) {
            sources.push({
              name: 'Rotten Tomatoes',
              score: `${parsed.rottenTomatoesScore}%`,
              type: 'critic',
            });
          }
          if (parsed.imdbRating) {
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
        } else {
          return {
            identified: false,
            reason: parsed.reason || 'Scene not identified. Could not match visual features to a known movie or TV series.',
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
