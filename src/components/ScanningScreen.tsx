import React, { useEffect, useState, useRef } from 'react';
import { X, Zap, ZapOff, Camera, RefreshCw, Radio, Sparkles } from 'lucide-react';
import { Movie } from '../types';

interface ScanningScreenProps {
  movieToIdentify: Movie;
  onIdentified: (movie: Movie) => void;
  onCancel: () => void;
  allMovies: Movie[];
  onChangeMovie: (movie: Movie) => void;
}

export const ScanningScreen: React.FC<ScanningScreenProps> = ({
  movieToIdentify,
  onIdentified,
  onCancel,
  allMovies,
  onChangeMovie,
}) => {
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [soundWaveActive, setSoundWaveActive] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Progressive scan simulation: after ~2.4s, triggers onIdentified
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400; // 2.4s scanning sequence

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setScanProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        // Clean up camera stream if running
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        onIdentified(movieToIdentify);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [movieToIdentify, onIdentified]);

  // Handle switching to real camera if requested
  const handleToggleRealCamera = async () => {
    if (useRealCamera) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setUseRealCamera(false);
      return;
    }

    try {
      setCameraError(null);
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Camera access not supported on this device/browser. Using simulated TV feed.');
        setUseRealCamera(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setUseRealCamera(true);
    } catch (err) {
      console.warn('Real camera not available:', err);
      setCameraError('Camera access not granted. Using simulated TV feed.');
      setUseRealCamera(false);
    }
  };

  // Instant snap button
  const handleManualSnap = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    onIdentified(movieToIdentify);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* Background Live View: Either Camera Stream or Cinematic TV Living Room Scene */}
      <div className="absolute inset-0 z-0">
        {useRealCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="relative w-full h-full">
            {/* TV Living Room Ambience */}
            <img
              src={movieToIdentify.tvStill}
              alt="TV playing"
              className="w-full h-full object-cover brightness-75 contrast-125 scale-105"
            />
            {/* Dark vignette to focus eyes on center TV reticle */}
            <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/85" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70" />
          </div>
        )}
      </div>

      {/* Top Floating Controls */}
      <header className="relative z-20 px-5 pt-6 pb-2 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="glass-surface p-2.5 rounded-full text-white/80 hover:text-white transition-all active:scale-90"
          aria-label="Back to home"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Pill Badge: "IDENTIFYING MOVIE" */}
        <div className="glass-pill-badge px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-rose-500/30">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="text-xs font-extrabold tracking-widest text-white uppercase font-sans">
            IDENTIFYING MOVIE
          </span>
        </div>

        {/* Torch / Light toggle */}
        <button
          onClick={() => setTorchOn(!torchOn)}
          className={`glass-surface p-2.5 rounded-full transition-all active:scale-90 ${
            torchOn ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Toggle flashlight"
        >
          {torchOn ? <Zap className="w-5 h-5 fill-amber-400" /> : <ZapOff className="w-5 h-5" />}
        </button>
      </header>

      {/* Center Cinematic Glass Scanning Reticle */}
      <div className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center">
        {/* Holographic TV Scanning Frame */}
        <div className="relative aspect-[16/10] w-full max-w-sm rounded-3xl glass-surface border border-white/30 shadow-[0_0_50px_rgba(250,50,10,0.25)] overflow-hidden flex flex-col justify-between p-4">
          {/* Subtle inner grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Sweeping Laser Line */}
          <div className="absolute inset-x-0 scanning-laser-line pointer-events-none z-10">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_#FA320A,0_0_5px_#FFF]" />
            <div className="h-12 w-full bg-gradient-to-b from-rose-500/20 to-transparent" />
          </div>

          {/* Precision 3D Reticle Corners */}
          <div className="absolute top-3 left-3 w-7 h-7 border-t-3 border-l-3 border-rose-500 rounded-tl-xl shadow-[0_0_10px_rgba(250,50,10,0.6)]" />
          <div className="absolute top-3 right-3 w-7 h-7 border-t-3 border-r-3 border-rose-500 rounded-tr-xl shadow-[0_0_10px_rgba(250,50,10,0.6)]" />
          <div className="absolute bottom-3 left-3 w-7 h-7 border-b-3 border-l-3 border-rose-500 rounded-bl-xl shadow-[0_0_10px_rgba(250,50,10,0.6)]" />
          <div className="absolute bottom-3 right-3 w-7 h-7 border-b-3 border-r-3 border-rose-500 rounded-br-xl shadow-[0_0_10px_rgba(250,50,10,0.6)]" />

          {/* Top Tag inside frame */}
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono tracking-wider">
            <span className="flex items-center gap-1 text-rose-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>TV FRAME LOCKED</span>
            </span>
            <span>{scanProgress}%</span>
          </div>

          {/* Center Crosshairs */}
          <div className="self-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            </div>
            <p className="text-[11px] font-semibold text-neutral-300 mt-2 tracking-wide drop-shadow">
              Align TV screen within frame
            </p>
          </div>

          {/* Bottom audio/visual fingerprint frequency bars */}
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <div className="flex items-end gap-1 h-3">
              {[40, 75, 55, 90, 60, 100, 45, 80].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-rose-500/80 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 120}ms`,
                    animationDuration: '600ms',
                  }}
                />
              ))}
            </div>
            <span className="text-neutral-400 font-mono">MATCHING AUDIO-VISUAL</span>
          </div>
        </div>

        {/* Scan progress bar */}
        <div className="w-full max-w-sm mt-5">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-100 ease-out shadow-[0_0_8px_#FA320A]"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 px-1">
            <span>Analyzing scene features...</span>
            <span className="font-mono text-white">{scanProgress}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <footer className="relative z-20 px-6 pb-8 pt-3 flex flex-col items-center space-y-4">
        {/* Switch Movie selector chip for easy demo testing */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full px-2 py-1 glass-surface rounded-full border border-white/10">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider pl-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-rose-400" /> TV:
          </span>
          {allMovies.map((m) => (
            <button
              key={m.id}
              onClick={() => onChangeMovie(m)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                movieToIdentify.id === m.id
                  ? 'bg-rose-500 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {m.title}
            </button>
          ))}
        </div>

        {/* Bottom Shutter & Mode switch */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={handleToggleRealCamera}
            className="glass-surface-interactive px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-1.5"
            title="Switch between physical webcam and simulated TV screen"
          >
            <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
            <span>{useRealCamera ? 'Use Simulated TV' : 'Use Camera'}</span>
          </button>

          {/* Shutter Button */}
          <button
            onClick={handleManualSnap}
            className="w-16 h-16 rounded-full p-1.5 border-2 border-white/40 hover:border-white transition-all active:scale-95 group cursor-pointer"
            aria-label="Snap Movie Now"
          >
            <div className="w-full h-full rounded-full bg-rose-600 group-hover:bg-rose-500 transition-colors shadow-[0_0_20px_rgba(250,50,10,0.6)] flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>

          <button
            onClick={onCancel}
            className="glass-surface-interactive px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white"
          >
            Cancel
          </button>
        </div>

        {cameraError && (
          <p className="text-[11px] text-amber-400/90 text-center font-medium">
            {cameraError}
          </p>
        )}
      </footer>
    </div>
  );
};
