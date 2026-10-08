import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Monitor, Volume2, VolumeX } from 'lucide-react';
import { ScreenType, Movie } from './types';
import { SAMPLE_MOVIES } from './data/movies';
import { HomeScreen } from './components/HomeScreen';
import { ScanningScreen } from './components/ScanningScreen';
import { IdentifiedScreen } from './components/IdentifiedScreen';
import { RatingsScreen } from './components/RatingsScreen';
import { MovieDetailsScreen } from './components/MovieDetailsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { sound } from './utils/sound';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [currentMovie, setCurrentMovie] = useState<Movie>(SAMPLE_MOVIES[0]);
  const [historyMovies, setHistoryMovies] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem('moviesnap_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });
  const [isMobileFrameView, setIsMobileFrameView] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('moviesnap_history', JSON.stringify(historyMovies));
    } catch {
      // Ignore
    }
  }, [historyMovies]);

  // Handlers
  const handleStartScan = () => {
    if (audioEnabled) sound.tap();
    setCurrentScreen('scanning');
  };

  const handleIdentified = (movie: Movie) => {
    if (audioEnabled) {
      sound.snap();
      setTimeout(() => sound.success(), 150);
    }
    setCurrentMovie(movie);
    // Add to history at top if not existing, or update timestamp
    setHistoryMovies((prev) => {
      const filtered = prev.filter((m) => m.id !== movie.id);
      return [{ ...movie, scannedAt: 'Just now' }, ...filtered];
    });
    setCurrentScreen('identified');
  };

  const handleSelectMovie = (movie: Movie) => {
    if (audioEnabled) sound.tap();
    setCurrentMovie(movie);
    setCurrentScreen('identified');
  };

  const handleViewDetails = () => {
    if (audioEnabled) sound.tap();
    setCurrentScreen('details');
  };

  const handleViewRatings = () => {
    if (audioEnabled) sound.tap();
    setCurrentScreen('ratings');
  };

  const handleScanAnother = () => {
    if (audioEnabled) sound.tap();
    setCurrentScreen('scanning');
  };

  const handleOpenHistory = () => {
    if (audioEnabled) sound.tap();
    setCurrentScreen('history');
  };

  const handleBackToHome = () => {
    if (audioEnabled) sound.tap();
    setCurrentScreen('home');
  };

  return (
    <div className="min-h-screen bg-[#070709] text-neutral-100 flex flex-col items-center justify-center relative overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Background ambient light effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top Desktop Utility Bar (hidden on small viewports) */}
      <header className="hidden md:flex fixed top-3 inset-x-0 z-40 items-center justify-between px-6 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-surface text-xs text-neutral-400">
          <span className="font-extrabold text-white">MOVIESNAP</span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-300">Snap a movie. Know its score.</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2 rounded-full glass-surface text-neutral-400 hover:text-white transition-colors"
            title={audioEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Viewport frame toggle */}
          <button
            onClick={() => setIsMobileFrameView(!isMobileFrameView)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-surface text-xs font-medium text-neutral-300 hover:text-white transition-colors"
          >
            {isMobileFrameView ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-rose-400" />
                <span>Expand View</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                <span>Mobile Device Frame</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* App Container: Mobile Screen or Centered Device Frame */}
      <div
        className={`w-full transition-all duration-300 relative z-10 ${
          isMobileFrameView
            ? 'max-w-[420px] my-0 md:my-8 rounded-none md:rounded-[44px] shadow-2xl md:border md:border-white/15 bg-neutral-950 overflow-hidden ring-1 ring-white/5'
            : 'max-w-2xl min-h-screen md:min-h-0 md:my-10 rounded-none md:rounded-3xl glass-surface overflow-hidden'
        }`}
        style={{
          minHeight: isMobileFrameView ? '844px' : 'auto',
          height: isMobileFrameView ? 'min(880px, 100vh)' : 'auto',
        }}
      >
        {/* Mobile Device Status Bar simulation (shown in frame mode) */}
        {isMobileFrameView && (
          <div className="hidden md:flex items-center justify-between px-7 pt-3 pb-1 text-[11px] font-semibold text-neutral-400 select-none bg-neutral-950/60 backdrop-blur-md relative z-30">
            <span>9:41</span>
            {/* Dynamic Island pill */}
            <div className="w-24 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-900 border border-neutral-700" />
              <span className="w-2 h-2 rounded-full bg-neutral-900 border border-neutral-700" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 rounded-xs border border-neutral-400 p-0.5 flex items-center">
                <div className="w-full h-full bg-neutral-300 rounded-[1px]" />
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Screen Container */}
        <div className="relative w-full h-full flex flex-col overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            {currentScreen === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex-1"
              >
                <HomeScreen
                  onStartScan={handleStartScan}
                  onOpenHistory={handleOpenHistory}
                  onSelectMovie={handleSelectMovie}
                  popularMovies={SAMPLE_MOVIES}
                  historyCount={historyMovies.length}
                />
              </motion.div>
            )}

            {currentScreen === 'scanning' && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.25 }}
                className="flex-1 h-full min-h-screen"
              >
                <ScanningScreen
                  onIdentified={handleIdentified}
                  onCancel={handleBackToHome}
                  popularMovies={SAMPLE_MOVIES}
                />
              </motion.div>
            )}

            {currentScreen === 'identified' && (
              <motion.div
                key="identified"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex-1"
              >
                <IdentifiedScreen
                  movie={currentMovie}
                  onViewDetails={handleViewDetails}
                  onViewRatings={handleViewRatings}
                  onScanAnother={handleScanAnother}
                />
              </motion.div>
            )}

            {currentScreen === 'ratings' && (
              <motion.div
                key="ratings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex-1"
              >
                <RatingsScreen
                  movie={currentMovie}
                  onBack={() => setCurrentScreen('identified')}
                  onViewDetails={handleViewDetails}
                  onScanAnother={handleScanAnother}
                />
              </motion.div>
            )}

            {currentScreen === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex-1"
              >
                <MovieDetailsScreen
                  movie={currentMovie}
                  onBack={() => setCurrentScreen('identified')}
                  onViewRatings={handleViewRatings}
                  onScanAnother={handleScanAnother}
                />
              </motion.div>
            )}

            {currentScreen === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex-1"
              >
                <HistoryScreen
                  movies={historyMovies}
                  onSelectMovie={handleSelectMovie}
                  onScanAnother={handleScanAnother}
                  onBack={handleBackToHome}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
