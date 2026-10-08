import React, { useState } from 'react';
import { ChevronLeft, Search, Camera, Home } from 'lucide-react';
import { Movie } from '../types';
import { TomatoIcon, ImdbBadge } from './RatingBadges';

interface HistoryScreenProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onScanAnother: () => void;
  onBackToHome: () => void;
  onClearHistory?: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  movies,
  onSelectMovie,
  onScanAnother,
  onBackToHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.genre.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative flex flex-col min-h-full pb-24 overflow-y-auto no-scrollbar">
      {/* Top Header */}
      <header className="px-5 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-neutral-950/80 backdrop-blur-xl z-20 border-b border-white/5">
        {/* 2. Back arrow returns to homepage */}
        <button
          onClick={onBackToHome}
          className="glass-surface p-2.5 rounded-full text-neutral-300 hover:text-white transition-all active:scale-90 cursor-pointer"
          aria-label="Back to home"
          title="Return to homepage"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-base font-extrabold text-white tracking-tight">
            Scan History
          </h1>
          <p className="text-[11px] text-neutral-400 font-medium">
            {movies.length} {movies.length === 1 ? 'movie' : 'movies'} identified
          </p>
        </div>

        {/* 1. Clearly visible Home button */}
        <button
          onClick={onBackToHome}
          className="glass-pill-badge flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-200 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="Return to homepage"
        >
          <Home className="w-3.5 h-3.5 text-rose-400" />
          <span>Home</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="px-5 pt-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your scanned movies..."
            className="w-full bg-white/[0.05] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 backdrop-blur-md"
          />
        </div>

        {/* List of previously scanned movies */}
        <div className="space-y-3">
          {filteredMovies.length === 0 ? (
            <div className="glass-surface rounded-3xl p-8 text-center text-neutral-400 mt-6 border border-white/5">
              <Camera className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">
                {movies.length === 0 ? 'No movies scanned yet' : 'No matching scans found'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {movies.length === 0
                  ? 'Tap Scan Movie on the homepage to identify a film from your TV, screen or poster.'
                  : 'Try searching with a different title or keyword.'}
              </p>
            </div>
          ) : (
            filteredMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => onSelectMovie(movie)}
                className="glass-surface-interactive rounded-2xl p-3 flex items-center gap-3.5 cursor-pointer group border border-white/10"
              >
                {/* Poster Thumbnail */}
                <div className="shrink-0 w-16 aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/15 relative">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                    {movie.title}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {movie.year} • {movie.runtime}
                  </p>

                  {/* Ratings Row */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <TomatoIcon status={movie.rottenTomatoesStatus} size="sm" />
                      <span className="text-xs font-extrabold text-white">
                        {movie.rottenTomatoesScore}%
                      </span>
                    </div>
                    <span className="text-neutral-600">|</span>
                    <div className="flex items-center gap-1">
                      <ImdbBadge size="sm" />
                      <span className="text-[11px] font-bold text-white">
                        {movie.imdbRating}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scanned Time Tag */}
                <div className="text-[10px] text-neutral-500 font-medium shrink-0 self-start">
                  {movie.scannedAt}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
