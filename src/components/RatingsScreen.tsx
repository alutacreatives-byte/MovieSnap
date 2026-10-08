import React from 'react';
import { ChevronLeft, ArrowRight, RotateCcw, ThumbsUp, Star, Users } from 'lucide-react';
import { Movie } from '../types';
import { TomatoIcon, PopcornIcon, ImdbBadge } from './RatingBadges';

interface RatingsScreenProps {
  movie: Movie;
  onBack: () => void;
  onViewDetails: () => void;
  onScanAnother: () => void;
}

export const RatingsScreen: React.FC<RatingsScreenProps> = ({
  movie,
  onBack,
  onViewDetails,
  onScanAnother,
}) => {
  return (
    <div className="flex flex-col min-h-full pb-8 overflow-y-auto no-scrollbar">
      {/* Top Header */}
      <header className="px-5 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-neutral-950/80 backdrop-blur-xl z-20 border-b border-white/5">
        <button
          onClick={onBack}
          className="glass-surface p-2.5 rounded-full text-neutral-300 hover:text-white transition-all active:scale-90"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Ratings Overview
          </h2>
          <p className="text-sm font-extrabold text-white truncate max-w-[200px]">
            {movie.title}
          </p>
        </div>

        <button
          onClick={onScanAnother}
          className="glass-surface p-2.5 rounded-full text-neutral-300 hover:text-white transition-all active:scale-90"
          aria-label="Scan another"
        >
          <RotateCcw className="w-4 h-4 text-rose-400" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 pt-4 space-y-4">
        {/* 1. HERO RATING: 85% ROTTEN TOMATOES */}
        <section className="relative rounded-3xl glass-surface p-6 overflow-hidden border border-rose-500/35 shadow-[0_20px_50px_rgba(250,50,10,0.25)]">
          {/* Ambient red projector glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-600/25 rounded-full blur-3xl pointer-events-none" />

          {/* Top Tag & Tomato Icon */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TomatoIcon status={movie.rottenTomatoesStatus} size="lg" />
              <span className="text-xs font-extrabold tracking-widest uppercase text-rose-400">
                TOMATOMETER
              </span>
            </div>
            <span className="glass-pill-badge px-3 py-1 rounded-full text-[11px] font-bold text-amber-300 border-amber-400/30">
              {movie.rottenTomatoesStatus === 'certified-fresh' ? '★ Certified Fresh' : 'Fresh'}
            </span>
          </div>

          {/* Hero Numbers */}
          <div className="flex items-baseline gap-2 my-2">
            <span className="text-6xl font-black text-white tracking-tight font-sans">
              {movie.rottenTomatoesScore}%
            </span>
          </div>

          <div className="text-sm font-black uppercase tracking-wider text-rose-400 mb-4">
            ROTTEN TOMATOES
          </div>

          {/* Critic Consensus */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Critics Consensus
            </span>
            <p className="text-xs text-neutral-200 leading-relaxed italic bg-white/[0.03] p-3 rounded-xl border border-white/5">
              "{movie.criticsConsensus}"
            </p>
          </div>

          {/* Review Stats Bar */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <span className="text-neutral-400 text-[11px] block">Total Reviews</span>
              <span className="text-sm font-bold text-white font-mono">{movie.reviewsCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <span className="text-neutral-400 text-[11px] block">Approval</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {Math.round((movie.rottenTomatoesScore / 100) * movie.reviewsCount)} Fresh
              </span>
            </div>
          </div>
        </section>

        {/* 2. AUDIENCE SCORE: 87% AUDIENCE SCORE */}
        <section className="rounded-3xl glass-surface p-5 border border-amber-500/25 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PopcornIcon status={movie.audienceStatus} size="lg" />
              <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400">
                POPCORNMETER
              </span>
            </div>
            <span className="text-[11px] font-bold text-neutral-400">
              Verified Audience
            </span>
          </div>

          {/* Audience Score */}
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-5xl font-black text-white tracking-tight">
              {movie.rottenTomatoesAudienceScore}%
            </span>
          </div>

          <div className="text-xs font-black uppercase tracking-wider text-amber-400 mb-3">
            AUDIENCE SCORE
          </div>

          <div className="border-t border-white/10 pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Audience Consensus
            </span>
            <p className="text-xs text-neutral-300 leading-relaxed italic">
              "{movie.audienceConsensus}"
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-2 font-medium">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{movie.audienceCount} verified user ratings</span>
            </div>
          </div>
        </section>

        {/* 3. IMDb: 7.8 IMDb */}
        <section className="rounded-3xl glass-surface p-5 border border-yellow-500/25 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ImdbBadge size="lg" />
              <span className="text-xs font-extrabold tracking-widest uppercase text-yellow-400">
                IMDb RATING
              </span>
            </div>
            <span className="text-[11px] font-bold text-neutral-400">
              {movie.imdbVotes} votes
            </span>
          </div>

          {/* IMDb Score */}
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-5xl font-black text-white tracking-tight">
              {movie.imdbRating}
            </span>
            <span className="text-xl font-bold text-neutral-400">/10</span>
          </div>

          <div className="text-xs font-black uppercase tracking-wider text-yellow-400 mb-3">
            IMDb
          </div>

          {/* IMDb Star distribution bar */}
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-yellow-400 h-full rounded-full" 
              style={{ width: `${(movie.imdbRating / 10) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-neutral-400 mt-2 flex items-center justify-between">
            <span>Weighted average rating</span>
            <span className="font-semibold text-neutral-300">Top Rated Candidate</span>
          </p>
        </section>

        {/* Bottom CTAs */}
        <div className="pt-2 space-y-2.5">
          <button
            onClick={onViewDetails}
            className="w-full glass-button-primary py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-white font-extrabold text-sm tracking-wider uppercase cursor-pointer"
          >
            <span>VIEW MOVIE DETAILS</span>
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
