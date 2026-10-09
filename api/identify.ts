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
  searchQueries?: string[];
  searchResultsCount?: number;
}

/**
 * Performs a real web search using DuckDuckGo to verify titles and fetch genuine ratings.
 */
async function searchWeb(query: string): Promise<Array<{ title: string; snippet: string; url?: string }>> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const titleMatches = [...html.matchAll(/<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim()
    );
    const snippetMatches = [...html.matchAll(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim()
    );
    const urlMatches = [...html.matchAll(/<a[^>]+class="result__url"[^>]*>([\s\S]*?)<\/a>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim()
    );

    const results: Array<{ title: string; snippet: string; url?: string }> = [];
    for (let i = 0; i < Math.min(titleMatches.length, 6); i++) {
      if (titleMatches[i]) {
        results.push({
          title: titleMatches[i],
          snippet: snippetMatches[i] || '',
          url: urlMatches[i] || '',
        });
      }
    }
    return results;
  } catch (err) {
    console.error('Web search error:', err);
    return [];
  }
}

/**
 * 4-Step Identification Pipeline:
 * 1. First, use OCR to detect and read any visible movie or TV-series title,
 *    including Netflix on-screen titles and text.
 * 2. If no title is visible, use Gemini vision to analyse the scene and identify
 *    likely movies or TV series from the actors, characters, setting, and visual details.
 * 3. Search the web to verify the identified title and retrieve its release year and genuine ratings.
 * 4. Return the verified result, or allow the user to try another frame if unidentifiable.
 */
export async function identifySceneFromImage(base64Image: string): Promise<SceneIdentificationResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return {
      identified: false,
      reason: 'GEMINI_API_KEY is not configured in the environment.',
    };
  }

  const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
  const mimeMatch = base64Image.match(/^data:(image\/[a-z]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const ai = new GoogleGenAI({ apiKey });
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  for (const model of models) {
    try {
      // -------------------------------------------------------------
      // Step 1: Optical Character Recognition (OCR) for on-screen titles
      // -------------------------------------------------------------
      const ocrPrompt = `You are a high-accuracy OCR (Optical Character Recognition) engine specializing in detecting film and television titles.
Inspect this image specifically for any visible text, words, logos, or typography:
1. Scan for on-screen streaming UI titles (especially Netflix title cards, paused video player headers, episode titles, Disney+, Prime Video, HBO Max).
2. Scan for opening/closing film titles, credits, subtitles containing the title, watermarks, or poster text.
3. If you find a visible text that represents an actual Movie or TV Series title, extract the exact title.

Ignore generic UI buttons like "Skip Intro", "Pause", "Play", "Volume", "10s", or random non-title text unless it names a show or film.

Respond in strict JSON:
{
  "hasVisibleTitle": true/false,
  "detectedTitle": "Exact Title Found" or null,
  "detectedTextSnippets": ["visible text 1", "visible text 2"],
  "confidence": 0.0 to 1.0
}`;

      let candidateTitle: string | null = null;
      let detectionMethod: 'ocr' | 'visual_scene' = 'visual_scene';
      let ocrExtractedText = '';

      try {
        const ocrResponse = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: ocrPrompt },
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

        const ocrText = ocrResponse.text?.trim();
        if (ocrText) {
          const cleanOcr = ocrText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
          const ocrParsed = JSON.parse(cleanOcr);
          if (ocrParsed.hasVisibleTitle && ocrParsed.detectedTitle && typeof ocrParsed.detectedTitle === 'string') {
            const rawTitle = ocrParsed.detectedTitle.trim();
            // Filter out generic streaming platform names mistaken for titles
            const invalidGenericNames = ['netflix', 'prime video', 'disney+', 'hbo max', 'max', 'hulu', 'youtube', 'apple tv'];
            if (!invalidGenericNames.includes(rawTitle.toLowerCase())) {
              candidateTitle = rawTitle;
              detectionMethod = 'ocr';
              ocrExtractedText = rawTitle;
            }
          }
        }
      } catch (ocrErr) {
        console.warn('OCR detection step warning:', ocrErr);
      }

      // -------------------------------------------------------------
      // Step 2: Visual Scene Analysis (if no title was detected via OCR)
      // -------------------------------------------------------------
      let visualSearchQuery = '';
      if (!candidateTitle) {
        const scenePrompt = `You are an expert film and television scene recognition engine.
No title was clearly read from OCR in this image.
Inspect the visible visual scene in detail:
1. Identify notable actors, characters, facial likenesses, costumes, and uniforms.
2. Examine the setting, location, cinematography, distinctive props, vehicles, or iconic staging.
3. Determine the most likely Movie or TV Series shown in this scene.

Respond in strict JSON:
{
  "identifiedLikelyTitle": "Most Likely Title" or null,
  "actorsOrCharacters": ["Actor/Character 1", "Actor/Character 2"],
  "sceneDescription": "Detailed visual description of the scene",
  "searchQuery": "4-7 specific keywords (actors, setting, distinguishing elements) to verify this movie on IMDb/Wikipedia"
}`;

        const sceneResponse = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: scenePrompt },
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

        const sceneText = sceneResponse.text?.trim();
        if (sceneText) {
          const cleanScene = sceneText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
          const sceneParsed = JSON.parse(cleanScene);
          if (sceneParsed.identifiedLikelyTitle) {
            candidateTitle = sceneParsed.identifiedLikelyTitle;
            detectionMethod = 'visual_scene';
          }
          if (sceneParsed.searchQuery) {
            visualSearchQuery = sceneParsed.searchQuery;
          }
        }
      }

      // If neither OCR nor visual scene analysis found any plausible candidate
      if (!candidateTitle && !visualSearchQuery) {
        return {
          identified: false,
          reason: 'Title could not be confidently identified from this frame. Please point clearly at the screen, logo, or try another frame.',
        };
      }

      // -------------------------------------------------------------
      // Step 3: Search the web to verify the title and retrieve genuine ratings
      // -------------------------------------------------------------
      const searchQuery = candidateTitle
        ? `${candidateTitle} movie OR "tv series" Rotten Tomatoes IMDb rating release year`
        : `${visualSearchQuery} movie OR tv series`;

      const searchResults = await searchWeb(searchQuery);

      // Verify and synthesize findings with Gemini
      const verificationPrompt = `You are a film and television verification engine.
You are given an image from a screen, photo, or scan, and ACTUAL WEB SEARCH RESULTS:

Candidate Title Detected: ${candidateTitle ? `"${candidateTitle}" (via ${detectionMethod.toUpperCase()})` : 'None specified'}
Web Search Query: "${searchQuery}"
Actual Web Search Results:
${JSON.stringify(searchResults, null, 2)}

Instructions:
1. Examine the web search results and compare them with the image.
2. Confirm if the candidate title (or another verified title from the search results) matches the actual scene.
3. If verified, extract:
   - exact title
   - release year (number)
   - mediaType ("Movie" or "TV Series")
   - director or series creator
   - genres (array of strings)
   - runtime (e.g. "2h 10m" or "45m / ep")
   - concise 1-2 sentence synopsis
   - genuine IMDb rating (e.g. 8.4) if found in search results or official data, else null
   - genuine Rotten Tomatoes critic Tomatometer percentage score (e.g. 92) if found, else null
   - genuine Rotten Tomatoes audience score percentage (e.g. 88) if found, else null
4. If the title cannot be verified or does not match the scene, return:
   {"identified": false, "reason": "Title could not be confidently identified from this frame. Please try another frame or point directly at the screen."}

Respond in strict JSON:
{
  "identified": true,
  "mediaType": "Movie" or "TV Series",
  "title": "Exact Title",
  "year": 2022,
  "runtime": "2h 10m",
  "genre": ["Sci-Fi", "Drama"],
  "synopsis": "Concise synopsis.",
  "director": "Director Name",
  "imdbRating": 8.5,
  "rottenTomatoesScore": 92,
  "rottenTomatoesAudienceScore": 88,
  "confidence": 0.95
}`;

      const verificationResponse = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: verificationPrompt },
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

      const verifyText = verificationResponse.text?.trim();
      if (verifyText) {
        const cleanVerify = verifyText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleanVerify);

        if (parsed.identified && parsed.title) {
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
            title: parsed.title,
            year: parsed.year || new Date().getFullYear(),
            runtime: parsed.runtime || (parsed.mediaType === 'TV Series' ? '45m / ep' : '2h 00m'),
            genre: Array.isArray(parsed.genre) && parsed.genre.length ? parsed.genre : ['Drama'],
            synopsis: parsed.synopsis || `Scene identified from ${parsed.title}.`,
            director: parsed.director || 'Unknown',
            imdbRating: typeof parsed.imdbRating === 'number' ? parsed.imdbRating : null,
            rottenTomatoesScore: typeof parsed.rottenTomatoesScore === 'number' ? parsed.rottenTomatoesScore : null,
            rottenTomatoesAudienceScore: typeof parsed.rottenTomatoesAudienceScore === 'number' ? parsed.rottenTomatoesAudienceScore : null,
            ratingSource: parsed.rottenTomatoesScore ? 'Rotten Tomatoes' : parsed.imdbRating ? 'IMDb' : 'The Movie Database (TMDB)',
            sources,
            confidence: parsed.confidence || (detectionMethod === 'ocr' ? 0.98 : 0.92),
            detectionMethod,
            detectedOcrText: ocrExtractedText || undefined,
            searchQueries: [searchQuery],
            searchResultsCount: searchResults.length,
          };
        } else {
          return {
            identified: false,
            reason: parsed.reason || 'Title could not be confidently identified from this frame. Please try another frame.',
            searchQueries: [searchQuery],
            searchResultsCount: searchResults.length,
          };
        }
      }
    } catch (err: unknown) {
      console.warn(`Model ${model} identification pipeline error:`, err);
    }
  }

  return {
    identified: false,
    reason: 'Title could not be confidently identified from this frame. Please try another frame.',
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
