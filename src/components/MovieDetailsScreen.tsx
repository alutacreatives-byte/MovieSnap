import React, { useState } from 'react';
import { ChevronLeft, Play, RotateCcw, Clapperboard, Star, Share2, Tv } from 'lucide-react';
import { Movie } from '../types';
import { TomatoIcon, PopcornIcon, ImdbBadge } from './RatingBadges';
import { TrailerModal } from './TrailerModal';

interface MovieDetailsScreenProps {
  movie: Movie;
  onBack: () => void;
  onViewRatings: () => void;
  onScanAnother: () => void;
}

export const MovieDetailsScreen: React.FC<MovieDetailsScreenProps> = ({
  movie,
  onBack,
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
          <button
            onClick={onBack}
            className="glass-surface p-2.5 rounded-full text-neutral-300 hover:text-white transition-all active:scale-90"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 glass-pill-badge px-3 py-1 rounded-full">
            Movie Details
          </span>

          <button
            onClick={onScanAnother}
            className="glass-surface p-2.5 rounded-full text-neutral-300 hover:text-white transition-all active:scale-90"
            aria-label="Scan another"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </button>
        </header>

        {/* Play Trailer Floating Glass Button over Backdrop */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setTrailerOpen(true)}
            className="glass-pill-badge px-4 py-2 rounded-full flex items-center gap-2 group hover:bg-white/20 transition-all border border-white/30 shadow-2xl active:scale-95 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wider uppercase">
              Watch Trailer
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="px-5 -mt-14 relative z-10 space-y-5">
        {/* Poster & Header Info Card */}
        <div className="glass-surface rounded-3xl p-5 border border-white/15 shadow-2xl">
          <div className="flex gap-4">
            {/* Poster Thumbnail */}
            <div className="shrink-0 w-24 aspect-[2/3] rounded-xl overflow-hidden shadow-xl border border-white/20">
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h1 className="text-xl font-black text-white tracking-tight leading-tight">
                  {movie.title}
                </h1>
                <p className="text-xs text-rose-400 font-medium italic mt-0.5">
                  "{movie.tagline}"
                </p>

                {/* Meta details */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-2">
                  <span>{movie.year}</span>
                  <span>•</span>
                  <span>{movie.runtime}</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-neutral-300 font-semibold">
                    {movie.mpaaRating}
                  </span>
                </div>
              </div>

              {/* Genre badges */}
              <div className="flex flex-wrap gap-1 mt-2">
                {movie.genre.map((g) => (
                  <span
                    key={g}
                    className="text-[10px] font-semibold text-neutral-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Rotten Tomatoes Score Bar */}
          <div 
            onClick={onViewRatings}
            className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <TomatoIcon status={movie.rottenTomatoesStatus} size="lg" />
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white font-sans">
                    {movie.rottenTomatoesScore}%
                  </span>
                  <span className="text-[11px] font-extrabold uppercase text-rose-400">
                    Tomatometer
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  {movie.rottenTomatoesStatus === 'certified-fresh' ? 'Certified Fresh' : 'Fresh'} • {movie.reviewsCount} Reviews
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <PopcornIcon status={movie.audienceStatus} size="md" />
              <div className="text-right">
                <span className="text-lg font-black text-white">
                  {movie.rottenTomatoesAudienceScore}%
                </span>
                <span className="block text-[9px] font-extrabold uppercase text-amber-400">
                  Audience
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Synopsis Section */}
        <section className="glass-surface rounded-3xl p-5 border border-white/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Synopsis
          </h2>
          <p className="text-xs text-neutral-200 leading-relaxed font-normal">
            {movie.synopsis}
          </p>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-neutral-400">
            <span className="font-semibold text-neutral-300">Director:</span>
            <span>{movie.director}</span>
          </div>
        </section>

        {/* Cast Section */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Top Cast
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
            {movie.cast.map((actor) => (
              <div
                key={actor.name}
                className="shrink-0 w-28 glass-surface rounded-2xl p-2.5 flex flex-col items-center text-center border border-white/10"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden mb-2 border border-white/20 shadow-md">
                  <img
                    src={actor.image}
                    alt={actor.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-xs font-bold text-white truncate w-full">
                  {actor.name}
                </h4>
                <p className="text-[10px] text-neutral-400 truncate w-full mt-0.5">
                  {actor.role}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Where to Watch / Streaming Section */}
        <section className="glass-surface rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-rose-400" />
              <span>Where to Watch</span>
            </h2>
            <span className="text-[10px] text-neutral-500 font-medium">US Streaming</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {movie.streamingPlatforms.map((platform) => (
              <div
                key={platform.name}
                className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center flex flex-col items-center justify-center hover:bg-white/[0.08] transition-colors"
              >
                <span className="text-lg mb-1">{platform.logo}</span>
                <span className="text-xs font-bold text-white truncate max-w-full">
                  {platform.name}
                </span>
                <span className="text-[9px] font-semibold text-rose-400 uppercase mt-0.5">
                  {platform.type}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-30 flex justify-center">
        <div className="w-full max-w-md flex gap-2.5">
          <button
            onClick={() => setTrailerOpen(true)}
            className="flex-1 glass-button-secondary py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Watch Trailer</span>
          </button>

          <button
            onClick={onScanAnother}
            className="flex-1 glass-button-primary py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-white" />
            <span>Scan Another</span>
          </button>
        </div>
      </div>

      {/* Embedded Trailer Modal */}
      <TrailerModal
        movie={movie}
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
      />
    </div>
  );
};
