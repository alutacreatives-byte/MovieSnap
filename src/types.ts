export type ScreenType = 'home' | 'scanning' | 'identified' | 'ratings' | 'details' | 'history';

export interface CastMember {
  name: string;
  role: string;
  image: string;
}

export interface StreamingPlatform {
  name: string;
  logo: string;
  type: 'Stream' | 'Rent' | 'Buy';
  quality?: string;
}

export interface Movie {
  id: string;
  title: string;
  tagline: string;
  year: number;
  runtime: string;
  genre: string[];
  mpaaRating: string;
  synopsis: string;
  director: string;
  cast: CastMember[];
  poster: string;
  backdrop: string;
  tvStill: string; // The scene on TV when user scans
  rottenTomatoesScore: number;
  rottenTomatoesAudienceScore: number;
  rottenTomatoesStatus: 'certified-fresh' | 'fresh' | 'rotten';
  audienceStatus: 'fresh' | 'spilled';
  imdbRating: number;
  imdbVotes: string;
  criticsConsensus: string;
  audienceConsensus: string;
  reviewsCount: number;
  audienceCount: string;
  trailerYoutubeId: string;
  trailerTitle: string;
  streamingPlatforms: StreamingPlatform[];
  scannedAt: string;
}
