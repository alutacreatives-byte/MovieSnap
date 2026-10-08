import React from 'react';
import { ChevronLeft, Share2, Sparkles, Film, ArrowRight, RotateCcw } from 'lucide-react';
import { Movie } from '../types';
import { TomatoIcon, PopcornIcon, ImdbBadge } from './RatingBadges';

interface IdentifiedScreenProps {
  movie: Movie;
  onViewDetails: () => void;
  onViewRatings: () => void;
  onScanAnother: () => void;
}

export const IdentifiedScreen: React.FC<IdentifiedScreenProps> = ({
  movie,
  onViewDetails,
  onViewRatings,
  onScanAnother,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const text = `I just snapped ${movie.title} (${movie.year}) on MovieSnap! Rotten Tomatoes: ${movie.rottenTomatoesScore}% | IMDb: ${movie.imdbRating}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `MovieSnap - ${movie.title}`,
          text,
          url: window.location.href,
        });
      } catch {
        // user cancelled share
      }
    } else {
      navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative flex flex-col min-h-full pb-8 overflow-hidden">
      {/* Background Ambient Poster Blur */}
      <div className="absolute top-0 inset-x-0 h-96 overflow-hidden pointer-events-none z-0">
        <img
          src={movie.backdrop || movie.poster}
          alt=""
          className="w-full h-full object-cover blur-3xl opacity-30 scale-125 brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-neutral-950/80 to-neutral-950" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 px-5 pt-6 pb-2 flex items-center justify-between">
        <button
          onClick={onScanAnother}
          className="glass-surface p-2.5 rounded-full text-neutral-300 hover:text-white transition-all active:scale-90"
          aria-label="Scan again"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>MOVIE IDENTIFIED</span>
        </div>

        <button
          onClick={handleShare}
          className="glass-surface p-2.5 rounded-full text-neutral-300 hover:text-white transition-all active:scale-90 relative"
          aria-label="Share movie"
        >
          <Share2 className="w-4 h-4" />
          {copied && (
            <span className="absolute -bottom-8 right-0 text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold whitespace-nowrap shadow-md">
              Copied!
            </span>
          )}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 px-5 pt-2 flex flex-col justify-between space-y-6">
        {/* Prominent Movie Poster & Title Section */}
        <div className="flex flex-col items-center text-center">
          {/* Prominent Floating Glass Poster Card */}
          <div className="relative w-44 aspect-[2/3] rounded-2xl glass-surface p-1.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-white/20 mb-4 group">
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover rounded-xl shadow-lg"
            />
            {/* Specular glass reflection bar */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Movie Title */}
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
            {movie.title}
          </h1>

          {/* Meta line: Year · Runtime · MPAA */}
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400 mt-1">
            <span>{movie.year}</span>
            <span aria-hidden="true">•</span>
            <span>{movie.runtime}</span>
            <span aria-hidden="true">•</span>
            <span>{movie.mpaaRating}</span>
          </div>

          {/* Genre list */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center text-xs text-neutral-300">
            {movie.genre.map((g, i) => (
              <span key={g} className="flex items-center">
                <span className="text-neutral-300 font-medium">{g}</span>
                {i < movie.genre.length - 1 && <span className="mx-1 text-neutral-600">/</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Hero Ratings Section: Rotten Tomatoes has STRONGEST visual hierarchy */}
        <section className="space-y-3">
          {/* HERO: Rotten Tomatoes Score Card */}
          <div
            onClick={onViewRatings}
            className="cursor-pointer relative overflow-hidden rounded-3xl glass-surface p-5 border border-rose-500/30 shadow-[0_20px_50px_-10px_rgba(250,50,10,0.3)] group hover:border-rose-500/50 transition-all active:scale-[0.99]"
          >
            {/* Ambient crimson glow */}
            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              {/* Tomato Icon + Score */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <TomatoIcon status={movie.rottenTomatoesStatus} size="xl" />
                  <div className="absolute inset-0 rounded-full bg-rose-500/30 blur-md pointer-events-none" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white tracking-tight font-sans">
                      {movie.rottenTomatoesScore}%
                    </span>
                  </div>
                  <div className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                    <span>ROTTEN TOMATOES</span>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      • {movie.rottenTomatoesStatus === 'certified-fresh' ? 'Certified Fresh' : 'Fresh'}
                    </span>
                  </div>
                </div>
              </div>

              {/* View breakdown chevron */}
              <div className="glass-pill-badge px-2.5 py-1 rounded-full text-[11px] font-semibold text-neutral-300 group-hover:text-white flex items-center gap-1">
                <span>Score Breakdown</span>
                <ArrowRight className="w-3 h-3 text-rose-400" />
              </div>
            </div>

            {/* Critics consensus preview quote */}
            <p className="mt-3 text-xs text-neutral-300/90 italic line-clamp-2 leading-relaxed border-t border-white/10 pt-2.5">
              "{movie.criticsConsensus}"
            </p>
          </div>

          {/* Secondary Ratings Row: Audience Score & IMDb */}
          <div className="grid grid-cols-2 gap-3">
            {/* Audience Score */}
            <div 
              onClick={onViewRatings}
              className="glass-surface-interactive rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer"
            >
              <PopcornIcon status={movie.audienceStatus} size="lg" />
              <div>
                <div className="text-2xl font-black text-white tracking-tight">
                  {movie.rottenTomatoesAudienceScore}%
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                  AUDIENCE SCORE
                </div>
              </div>
            </div>

            {/* IMDb Rating */}
            <div 
              onClick={onViewRatings}
              className="glass-surface-interactive rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer"
            >
              <ImdbBadge size="lg" />
              <div>
                <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-0.5">
                  <span>{movie.imdbRating}</span>
                  <span className="text-xs text-neutral-400 font-medium">/10</span>
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-300">
                  IMDb RATING
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <footer className="space-y-2.5 pt-2">
          {/* Primary Action: VIEW MOVIE DETAILS */}
          <button
            onClick={onViewDetails}
            className="w-full glass-button-primary py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-white font-extrabold text-sm tracking-wider uppercase cursor-pointer"
          >
            <span>VIEW MOVIE DETAILS</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Secondary Action: SCAN ANOTHER MOVIE */}
          <button
            onClick={onScanAnother}
            className="w-full glass-button-secondary py-3 px-6 rounded-2xl flex items-center justify-center gap-2 text-neutral-300 hover:text-white font-bold text-xs tracking-wider uppercase cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>SCAN ANOTHER MOVIE</span>
          </button>
        </footer>
      </main>
    </div>
  );
};
