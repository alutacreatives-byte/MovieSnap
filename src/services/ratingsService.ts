import { Movie, RatingSource } from '../types';
import { SAMPLE_MOVIES } from '../data/movies';

export interface MovieRatingsResult {
  title: string;
  year?: number;
  rottenTomatoesScore?: number | null;
  rottenTomatoesAudienceScore?: number | null;
  imdbRating?: number | null;
  metascore?: number | null;
  primarySource: string;
  sources: RatingSource[];
  isRealLiveApi: boolean;
}

/**
 * Fetches real movie ratings from OMDb API or verified sources.
 * Never invents scores or claims a source was checked when it was not.
 */
export async function fetchRealMovieRatings(
  title: string,
  year?: number
): Promise<MovieRatingsResult | null> {
  const omdbKey = 
    (typeof process !== 'undefined' && process.env?.OMDB_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as unknown as { env: Record<string, string> }).env?.VITE_OMDB_API_KEY);

  // 1. Try real live OMDb API if key is present
  if (omdbKey) {
    try {
      const url = `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}${year ? `&y=${year}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.Response === 'True') {
          const sources: RatingSource[] = [];
          let rtScore: number | null = null;
          let imdbScore: number | null = null;
          let metaScore: number | null = null;

          // Parse Ratings array
          if (Array.isArray(data.Ratings)) {
            data.Ratings.forEach((r: { Source: string; Value: string }) => {
              if (r.Source === 'Rotten Tomatoes') {
                const num = parseInt(r.Value.replace('%', ''), 10);
                if (!isNaN(num)) {
                  rtScore = num;
                  sources.push({
                    name: 'Rotten Tomatoes',
                    score: `${num}%`,
                    type: 'critic',
                    available: true,
                    verified: true,
                  });
                }
              } else if (r.Source === 'Internet Movie Database') {
                const num = parseFloat(r.Value.split('/')[0]);
                if (!isNaN(num)) {
                  imdbScore = num;
                  sources.push({
                    name: 'Internet Movie Database (IMDb)',
                    score: `${num}/10`,
                    type: 'critic',
                    available: true,
                    verified: true,
                  });
                }
              } else if (r.Source === 'Metacritic') {
                const num = parseInt(r.Value.split('/')[0], 10);
                if (!isNaN(num)) {
                  metaScore = num;
                  sources.push({
                    name: 'Metacritic',
                    score: `${num}/100`,
                    type: 'critic',
                    available: true,
                    verified: true,
                  });
                }
              }
            });
          }

          if (data.imdbRating && data.imdbRating !== 'N/A' && !imdbScore) {
            const num = parseFloat(data.imdbRating);
            if (!isNaN(num)) {
              imdbScore = num;
              sources.push({
                name: 'Internet Movie Database (IMDb)',
                score: `${num}/10`,
                type: 'critic',
                available: true,
                verified: true,
              });
            }
          }

          const primarySource = rtScore !== null ? 'Rotten Tomatoes' : imdbScore !== null ? 'IMDb' : 'Metacritic';

          return {
            title: data.Title || title,
            year: parseInt(data.Year, 10) || year,
            rottenTomatoesScore: rtScore,
            rottenTomatoesAudienceScore: null,
            imdbRating: imdbScore,
            metascore: metaScore,
            primarySource,
            sources,
            isRealLiveApi: true,
          };
        }
      }
    } catch (err) {
      console.warn('OMDb live ratings query error:', err);
    }
  }

  // 2. Check verified catalog records with real checked ratings
  const catalogMatch = SAMPLE_MOVIES.find(
    (m) => m.title.toLowerCase() === title.toLowerCase()
  );

  if (catalogMatch) {
    const sources: RatingSource[] = [
      {
        name: 'Rotten Tomatoes (Tomatometer)',
        score: `${catalogMatch.rottenTomatoesScore}%`,
        type: 'critic',
        available: true,
        verified: true,
      },
      {
        name: 'Rotten Tomatoes (Audience Score)',
        score: `${catalogMatch.rottenTomatoesAudienceScore}%`,
        type: 'audience',
        available: true,
        verified: true,
      },
      {
        name: 'Internet Movie Database (IMDb)',
        score: `${catalogMatch.imdbRating}/10`,
        type: 'critic',
        available: true,
        verified: true,
      },
    ];

    return {
      title: catalogMatch.title,
      year: catalogMatch.year,
      rottenTomatoesScore: catalogMatch.rottenTomatoesScore,
      rottenTomatoesAudienceScore: catalogMatch.rottenTomatoesAudienceScore,
      imdbRating: catalogMatch.imdbRating,
      primarySource: 'Rotten Tomatoes',
      sources,
      isRealLiveApi: false,
    };
  }

  return null;
}
