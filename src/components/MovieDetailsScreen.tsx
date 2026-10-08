import React, { useState } from 'react';
import { ChevronLeft, Play, RotateCcw, Clapperboard, Star, Share2, Tv, Home } from 'lucide-react';
import { Movie } from '../types';
import { TomatoIcon, PopcornIcon, ImdbBadge } from './RatingBadges';
import { TrailerModal } from './TrailerModal';

interface MovieDetailsScreenProps {
  movie: Movie;
  onBackToHome: () => void;
  onViewRatings: () => void;
  onScanAnother: () => void;
}

export const MovieDetailsScreen: React.FC<MovieDetailsScreenProps> = ({
  movie,
  onBackToHome,
  onViewRatings,
  onScanAnother,
}) => {
  const [trailerOpen, setTrailerOpen] = useState(false);

  return (
    <div className="relative flex flex-col min-h-full pb-20 overflow-y-auto no-scrollbar">
      {/* Top Banner Backdrop */}
      <div className="relative w-full h-72 overflow-hidden">
        <img
          src={movie.backdrop || movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover brightness-60 contrast-110"
        />
        {/* Cinematic gradient fade to body */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />

        {/* Floating Top Navigation */}
        <header className="absolute top-0 inset-x-0 px-5 pt-6 flex items-center justify-between z-10">
          {/* 2. Back arrow returns to homepage */}
          <button
            onClick={onBackToHome}
            className="glass-surface p-2.5 rounded-full text-neutral-300 hover:text-white transition-all active:scale-90 cursor-pointer"
            aria-label="Back to home"
            title="Return to homepage"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 glass-pill-badge px-3 py-1 rounded-full">
            Movie Details
          </span>

          {/* 1. Clearly visible Home button */}
          <button
            onClick={onBackToHome}
            className="glass-pill-badge flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-200 hover:text-white transition-all active:scale-90 cursor-pointer"
            title="Return to homepage"
          >
            <Home className="w-3.5 h-3.5 text-rose-400" />
            <span>Home</span>
          </button>
        </header>

        {/* Play Trailer Floating Glass Button over Backdrop */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setTrailerOpen(true)}
            className="group flex items-center gap-2.5 px-5 py-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/25 text-white shadow-2xl transition-all active:scale-95 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Play Trailer</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-5 -mt-8 relative z-10 space-y-5">
        {/* Title & Key Specs Header Card */}
        <div className="glass-surface rounded-3xl p-5 border border-white/10 shadow-2xl space-y-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              {movie.tagline}
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
              {movie.title}
            </h1>
          </div>

          {/* Metadata badges row */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-300">
            <span className="px-2 py-0.5 rounded-md bg-white/10 font-bold text-neutral-200">
              {movie.mpaaRating}
            </span>
            <span>{movie.year}</span>
            <span>•</span>
            <span>{movie.runtime}</span>
            <span>•</span>
            <span className="text-neutral-400">Dir. {movie.director}</span>
          </div>

          {/* Quick Ratings Row */}
          <div 
            onClick={onViewRatings}
            className="pt-2 border-t border-white/10 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <TomatoIcon status={movie.rottenTomatoesStatus} size="sm" />
                <span className="text-sm font-extrabold text-white">{movie.rottenTomatoesScore}%</span>
                <span className="text-[10px] text-neutral-400 hidden sm:inline">(Rotten Tomatoes)</span>
              </div>
              <span className="text-neutral-600">|</span>
              <div className="flex items-center gap-1.5">
                <PopcornIcon status={movie.audienceStatus} size="sm" />
                <span className="text-sm font-extrabold text-white">{movie.rottenTomatoesAudienceScore}%</span>
              </div>
              <span className="text-neutral-600">|</span>
              <div className="flex items-center gap-1">
                <ImdbBadge size="sm" />
                <span className="text-xs font-bold text-white">{movie.imdbRating}</span>
              </div>
            </div>
            <span className="text-xs text-rose-400 group-hover:text-rose-300 font-bold flex items-center gap-0.5">
              Breakdown →
            </span>
          </div>
        </div>

        {/* Synopsis */}
        <section className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            Synopsis
          </h3>
          <p className="text-xs text-neutral-200 leading-relaxed glass-surface p-4 rounded-2xl border border-white/5">
            {movie.synopsis}
          </p>
        </section>

        {/* Cast & Crew */}
        <section className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            Top Cast
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
            {movie.cast.map((c) => (
              <div key={c.name} className="shrink-0 w-24 text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-1.5 border border-white/15 bg-neutral-900 shadow-md">
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-bold text-white truncate">{c.name}</p>
                <p className="text-[10px] text-neutral-400 truncate">{c.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Where to Watch / Streaming Platforms */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-rose-400" />
              <span>Where to Watch</span>
            </h3>
            <span className="text-[10px] text-neutral-500 font-medium">Updated today</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {movie.streamingPlatforms.map((platform) => (
              <div
                key={platform.name}
                className="glass-surface rounded-2xl p-3 text-center border border-white/5 space-y-1"
              >
                <div className="text-xl">{platform.logo}</div>
                <div className="text-xs font-bold text-white truncate">{platform.name}</div>
                <div className="text-[10px] text-neutral-400 font-medium">{platform.type}</div>
                {platform.quality && (
                  <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 font-bold">
                    {platform.quality}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Scan Another Movie Action */}
        <div className="pt-2">
          <button
            onClick={onScanAnother}
            className="w-full glass-button-secondary py-3 px-6 rounded-2xl flex items-center justify-center gap-2 text-neutral-300 hover:text-white font-bold text-xs tracking-wider uppercase cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>SCAN ANOTHER MOVIE</span>
          </button>
        </div>
      </main>

      {/* YouTube Trailer Modal */}
      <TrailerModal
        movie={movie}
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
      />
    </div>
  );
};
