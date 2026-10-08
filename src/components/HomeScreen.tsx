import React from 'react';
import { Camera, History, Tv, Sparkles, ChevronRight, TrendingUp } from 'lucide-react';
import { Movie } from '../types';
import { TomatoIcon } from './RatingBadges';

interface HomeScreenProps {
  onStartScan: () => void;
  onOpenHistory: () => void;
  onSelectMovie: (movie: Movie) => void;
  popularMovies: Movie[];
  historyCount: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartScan,
  onOpenHistory,
  onSelectMovie,
  popularMovies,
  historyCount,
}) => {
  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Top Navigation Bar */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/30 shadow-[0_4px_16px_rgba(250,50,10,0.35)]">
            <TomatoIcon status="certified-fresh" size="sm" className="relative z-10" />
            <div className="absolute inset-0 rounded-xl bg-rose-500/10 blur-sm" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white font-sans flex items-center gap-1.5">
              <span>MOVIE</span>
              <span className="text-rose-500">SNAP</span>
            </h1>
            <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
              Snap a movie. Know its score.
            </p>
          </div>
        </div>

        {/* History button */}
        <button
          onClick={onOpenHistory}
          className="glass-pill-badge flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-300 hover:text-white transition-all active:scale-95"
          aria-label="View scan history"
        >
          <History className="w-3.5 h-3.5 text-rose-400" />
          <span>History</span>
          {historyCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-300 text-[10px] flex items-center justify-center font-bold">
              {historyCount}
            </span>
          )}
        </button>
      </header>

      {/* Main Focus: Camera Scanning Experience */}
      <main className="flex-1 px-5 flex flex-col justify-between space-y-6">
        {/* TV Viewfinder & Instruction Glass Card */}
        <div className="relative rounded-3xl glass-surface p-4 overflow-hidden group">
          {/* Ambient colored backdrop glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Living Room TV Scene Viewport */}
          <div 
            onClick={onStartScan}
            className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden cursor-pointer border border-white/10 shadow-2xl bg-neutral-950 flex flex-col items-center justify-center group-hover:border-white/25 transition-all"
          >
            {/* Living Room Television Scene */}
            <img
              src="https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&auto=format&fit=crop&q=80"
              alt="Movie playing on TV"
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out brightness-90 contrast-110"
            />
            {/* Subtle television bezel and screen vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/60" />
            <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]" />

            {/* Corner Alignment Reticle */}
            <div className="absolute inset-6 pointer-events-none">
              {/* Top-Left */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl-lg" />
              {/* Top-Right */}
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr-lg" />
              {/* Bottom-Left */}
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl-lg" />
              {/* Bottom-Right */}
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br-lg" />

              {/* Center Crosshair / Scanning Hint */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border border-rose-500/60 flex items-center justify-center bg-rose-500/15 backdrop-blur-xs shadow-[0_0_20px_rgba(250,50,10,0.4)]">
                  <Camera className="w-6 h-6 text-rose-400 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Viewfinder Caption */}
            <div className="relative z-10 text-center px-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs font-semibold text-white mb-2 shadow-lg">
                <Tv className="w-3.5 h-3.5 text-rose-400" />
                <span>Instant Movie Recognition</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
                Point your phone at your TV.
              </h2>
              <p className="text-xs text-neutral-300 font-medium mt-1 drop-shadow">
                Instant Rotten Tomatoes score & movie details
              </p>
            </div>

            {/* Ready to scan banner */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[11px] text-neutral-300">
              <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Camera Ready
              </span>
              <span className="font-semibold text-rose-400 flex items-center gap-1">
                Tap to Scan TV <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* The One Obvious Primary Action: SCAN MOVIE */}
        <div>
          <button
            onClick={onStartScan}
            className="w-full glass-button-primary py-4 px-6 rounded-2xl flex items-center justify-center gap-3 group text-white font-bold text-base tracking-wide cursor-pointer shadow-xl shadow-rose-950/40"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg uppercase tracking-wider font-extrabold">SCAN MOVIE</span>
          </button>
          <p className="text-center text-[11px] text-neutral-500 mt-2 font-medium">
            Opens camera to scan movies playing on your TV or screen
          </p>
        </div>

        {/* Popular Movies Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Popular Movies
              </h3>
            </div>
            <span className="text-[11px] text-neutral-500 font-medium">
              Top Rated Scores
            </span>
          </div>

          {/* Horizontal scroll cards */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-5 px-5">
            {popularMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => onSelectMovie(movie)}
                className="shrink-0 w-36 glass-surface-interactive rounded-2xl p-2 cursor-pointer group flex flex-col justify-between"
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-neutral-900 border border-white/10 mb-2">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* RT Tomatometer Badge on top of poster */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-white/15 text-[11px] font-extrabold text-white shadow-md">
                    <TomatoIcon status={movie.rottenTomatoesStatus} size="sm" />
                    <span>{movie.rottenTomatoesScore}%</span>
                  </div>
                </div>

                {/* Info */}
                <div className="px-1">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                    {movie.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-0.5">
                    <span>{movie.year}</span>
                    <span>{movie.runtime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
