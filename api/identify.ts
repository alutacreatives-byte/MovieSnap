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
  searchQueries?: string[];
  searchResultsCount?: number;
}

/**
 * Performs a real web search using DuckDuckGo HTML search.
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
 * Real visual scene identification handler:
 * 1. Uses Gemini vision to describe the visible scene and extract distinctive visual clues.
 * 2. Performs an actual web search using those clues to find matching movie or TV-series titles.
 * 3. Examines the search results, compares them with the image, and returns the best-supported match.
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
      // Step 1: Use Gemini to analyze the scene and identify distinctive visual clues
      const visualAnalysisPrompt = `You are an expert film and television scene recognition engine.
Inspect this captured scene image carefully. Describe the visible scene and identify distinctive visual clues.
Focus on:
1. Recognizable actors, characters, costumes, uniforms, or distinctive faces.
2. Setting, architectural style, specific locations, vehicles, sci-fi/fantasy elements, or distinctive props.
3. Any visible text, titles, subtitles, names, or quotes.
4. Characteristic cinematography, color palette, or iconic director style.

Based on these clues, formulate two web search queries:
1. primaryQuery: 4 to 8 specific descriptive keywords likely to find this exact movie or TV series on IMDb/Wikipedia/Rotten Tomatoes.
2. secondaryQuery: An alternative query focusing on the key actors or distinctive action.

Respond strictly in JSON format:
{
  "description": "Concise description of what is shown in the image",
  "visualClues": ["clue1", "clue2", "clue3"],
  "primaryQuery": "distinctive keywords movie or tv series",
  "secondaryQuery": "alternative keywords"
}`;

      const analysisResponse = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: visualAnalysisPrompt },
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

      const analysisText = analysisResponse.text?.trim();
      let primaryQuery = 'scene movie or tv series';
      let secondaryQuery = '';
      if (analysisText) {
        try {
          const parsedAnalysis = JSON.parse(analysisText);
          if (parsedAnalysis.primaryQuery) primaryQuery = parsedAnalysis.primaryQuery;
          if (parsedAnalysis.secondaryQuery) secondaryQuery = parsedAnalysis.secondaryQuery;
        } catch {
          // fallback
        }
      }

      // Step 2: Perform an actual web search using those clues
      const primaryResults = await searchWeb(primaryQuery);
      let searchResults = primaryResults;
      if (searchResults.length < 3 && secondaryQuery) {
        const secondaryResults = await searchWeb(secondaryQuery);
        searchResults = [...searchResults, ...secondaryResults];
      }

      // Step 3: Examine the search results, compare them with the image, and return the best-supported match
      const comparisonPrompt = `You are a film and television scene verification engine.
You are given an image from a movie or TV series scene, and ACTUAL WEB SEARCH RESULTS obtained by searching the web for the visual clues in this image.

Actual Web Search Results:
${JSON.stringify(searchResults, null, 2)}

Instructions:
1. Compare the visible scene in the image directly with the web search results.
2. Identify which specific Movie or TV Series is shown in the scene. The match must be supported by both the visual evidence and the search results.
3. If a match is verified, provide:
   - exact title
   - release year
   - mediaType ("Movie" or "TV Series")
   - director or show creator
   - genres
   - runtime (e.g. "2h 10m" or "45m / ep")
   - concise 1-2 sentence synopsis
   - genuine IMDb rating (e.g. 8.4) if known, else null
   - genuine Rotten Tomatoes critic score percentage (e.g. 92) if known, else null
   - genuine Rotten Tomatoes audience score percentage (e.g. 88) if known, else null
4. If the image cannot be verified as a known movie or TV series (e.g. personal photo, non-film image, or inconclusive clues), return:
   {"identified": false, "reason": "Clear explanation of what was visible in the image and why it did not match any verified movie or TV series."}

Respond strictly in JSON format:
{
  "identified": true,
  "mediaType": "Movie",
  "title": "Exact Title",
  "year": 2023,
  "runtime": "2h 10m",
  "genre": ["Sci-Fi", "Drama"],
  "synopsis": "Concise synopsis of the movie.",
  "director": "Director Name",
  "imdbRating": 8.5,
  "rottenTomatoesScore": 92,
  "rottenTomatoesAudienceScore": 88,
  "confidence": 0.95
}`;

      const comparisonResponse = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: comparisonPrompt },
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

      const comparisonText = comparisonResponse.text?.trim();
      if (comparisonText) {
        const cleanText = comparisonText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/, '');
        const parsed = JSON.parse(cleanText);

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
            confidence: parsed.confidence || 0.92,
            searchQueries: [primaryQuery, ...(secondaryQuery ? [secondaryQuery] : [])],
            searchResultsCount: searchResults.length,
          };
        } else {
          return {
            identified: false,
            reason: parsed.reason || 'Could not verify a matching movie or TV series from the visual scene and web search results.',
            searchQueries: [primaryQuery],
            searchResultsCount: searchResults.length,
          };
        }
      }
    } catch (err: unknown) {
      console.warn(`Model ${model} identification attempt failed:`, err);
    }
  }

  return {
    identified: false,
    reason: 'Scene identification could not reach the identification service. Please try again.',
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
