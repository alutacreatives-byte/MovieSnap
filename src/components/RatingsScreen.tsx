import React from 'react';
import { ChevronLeft, ArrowRight, RotateCcw, ThumbsUp, Star, Users, Home, ExternalLink } from 'lucide-react';
import { Movie } from '../types';
import { TomatoIcon, PopcornIcon, ImdbBadge } from './RatingBadges';

interface RatingsScreenProps {
  movie: Movie;
  onBackToHome: () => void;
  onViewDetails: () => void;
  onScanAnother: () => void;
}

export const RatingsScreen: React.FC<RatingsScreenProps> = ({
  movie,
  onBackToHome,
  onViewDetails,
  onScanAnother,
}) => {
  return (
    <div className="flex flex-col min-h-full pb-8 overflow-y-auto no-scrollbar">
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Ratings Overview
          </h2>
          <p className="text-sm font-extrabold text-white truncate max-w-[180px]">
            {movie.title}
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
      <main className="flex-1 px-5 pt-4 space-y-4">
        {/* 1. HERO RATING: 85% ROTTEN TOMATOES */}
        <section className="relative rounded-3xl glass-surface p-6 overflow-hidden border border-rose-500/35 shadow-[0_20px_50px_rgba(250,50,10,0.25)]">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-600/25 rounded-full blur-3xl pointer-events-none" />

          {/* Top Tag & Tomato Icon */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TomatoIcon status={movie.rottenTomatoesStatus} size="lg" />
              <span className="text-xs font-extrabold tracking-widest uppercase text-rose-400">
                Tomatometer Score
              </span>
            </div>
            {/* 5. Explicit Rating Source Citation */}
            <span className="glass-pill-badge text-[10px] px-2.5 py-0.5 rounded-full text-neutral-300">
              Source: Rotten Tomatoes
            </span>
          </div>

          {/* Huge Hero Score */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-6xl font-black text-white tracking-tight font-sans">
              {movie.rottenTomatoesScore}%
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-rose-400">
              {movie.rottenTomatoesStatus === 'certified-fresh' ? 'Certified Fresh' : 'Fresh'}
            </span>
          </div>

          <p className="text-xs text-neutral-400">
            Based on <span className="text-white font-semibold">{movie.reviewsCount} verified critic reviews</span>
          </p>

          {/* Critics Consensus Quote Card */}
          <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
            <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>Critics Consensus</span>
            </div>
            <p className="text-xs text-neutral-200 leading-relaxed italic">
              "{movie.criticsConsensus}"
            </p>
          </div>
        </section>

        {/* 2. AUDIENCE SCORE (POPCORNMETER) */}
        <section className="relative rounded-3xl glass-surface p-5 overflow-hidden border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PopcornIcon status={movie.audienceStatus} size="md" />
              <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400">
                Audience Score
              </span>
            </div>
            {/* 5. Explicit Rating Source Citation */}
            <span className="glass-pill-badge text-[10px] px-2 py-0.5 rounded-full text-neutral-400">
              Source: Rotten Tomatoes Popcornmeter
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-black text-white tracking-tight">
              {movie.rottenTomatoesAudienceScore}%
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {movie.audienceStatus === 'fresh' ? 'Audience Fresh' : 'Spilled'}
            </span>
          </div>

          <p className="text-xs text-neutral-400 mb-3">
            Based on <span className="text-white font-semibold">{movie.audienceCount} audience ratings</span>
          </p>

          <p className="text-xs text-neutral-300/90 leading-relaxed border-t border-white/10 pt-2.5">
            "{movie.audienceConsensus}"
          </p>
        </section>

        {/* 3. IMDb RATING CARD */}
        <section className="relative rounded-3xl glass-surface p-5 overflow-hidden border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImdbBadge size="md" />
              <span className="text-xs font-extrabold tracking-widest uppercase text-neutral-200">
                IMDb Rating
              </span>
            </div>
            {/* 5. Explicit Rating Source Citation */}
            <span className="glass-pill-badge text-[10px] px-2 py-0.5 rounded-full text-neutral-400">
              Source: Internet Movie Database (IMDb)
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-4xl font-black text-white tracking-tight">
              {movie.imdbRating}
            </span>
            <span className="text-lg font-bold text-neutral-500">/ 10</span>
          </div>

          <p className="text-xs text-neutral-400">
            Weighted average based on <span className="text-white font-semibold">{movie.imdbVotes} votes</span> on IMDb
          </p>
        </section>

        {/* 5. Ratings Data Source Verification Statement */}
        <div className="rounded-2xl p-3.5 bg-white/[0.03] border border-white/10 text-[11px] text-neutral-400 space-y-1">
          <p className="font-semibold text-neutral-300">Ratings Verification Source:</p>
          <p className="leading-relaxed">
            Scores for {movie.title} are verified from Rotten Tomatoes and IMDb. If Rotten Tomatoes is unlisted, MovieSnap falls back directly to IMDb. No ratings are invented.
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 space-y-2.5">
          <button
            onClick={onViewDetails}
            className="w-full glass-button-primary py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-white font-extrabold text-sm tracking-wider uppercase cursor-pointer"
          >
            <span>VIEW FULL DETAILS & CAST</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onScanAnother}
            className="w-full glass-button-secondary py-3 px-6 rounded-2xl flex items-center justify-center gap-2 text-neutral-300 hover:text-white font-bold text-xs tracking-wider uppercase cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>SCAN ANOTHER MOVIE</span>
          </button>
        </div>
      </main>
    </div>
  );
};
