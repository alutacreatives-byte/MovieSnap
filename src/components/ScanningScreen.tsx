import React, { useEffect, useState, useRef } from 'react';
import { X, Zap, ZapOff, Camera, RefreshCw, Radio, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Movie } from '../types';
import { sound } from '../utils/sound';

interface ScanningScreenProps {
  onIdentified: (movie: Movie) => void;
  onCancel: () => void;
  popularMovies: Movie[];
}

export const ScanningScreen: React.FC<ScanningScreenProps> = ({
  onIdentified,
  onCancel,
  popularMovies,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState('ALIGNING');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start real device camera
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      // Clean up existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not available in this browser environment.');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any available video input if facingMode constraint fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      const message = err instanceof Error ? err.message : 'Camera permission denied or camera not found.';
      setCameraError(message);
      setCameraActive(false);
    }
  };

  // Mount effect: immediately open device camera
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      // Clean up camera on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Flip camera between front and back
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Toggle Torch if supported
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities?.() as { torch?: boolean };
        if (capabilities && capabilities.torch) {
          const nextState = !torchOn;
          await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
            advanced: [{ torch: nextState }],
          });
          setTorchOn(nextState);
        } else {
          setTorchOn(!torchOn);
        }
      } catch {
        setTorchOn(!torchOn);
      }
    }
  };

  // Capture frame and identify
  const handleCapture = () => {
    if (isAnalyzing) return;
    sound.snap();
    setIsAnalyzing(true);
    setAnalyzeStep('SCANNING SCENE...');

    // Simulate cinematic recognition pipeline
    setTimeout(() => {
      setAnalyzeStep('FINGERPRINTING MOVIE...');
    }, 600);

    setTimeout(() => {
      setAnalyzeStep('MATCHING TOMATOMETER...');
    }, 1200);

    setTimeout(() => {
      // Clean up camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      // Pick identified movie (default to The Batman with matching 85% score from specs)
      const matched = popularMovies[0] || popularMovies[0];
      onIdentified(matched);
    }, 1800);
  };

  // Handle image upload from file picker
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCapture();
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* Background Camera Viewport */}
      <div className="absolute inset-0 z-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          /* Fallback when camera permission denied or waiting for permission */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
            {cameraError ? (
              <div className="glass-surface max-w-xs p-6 rounded-3xl border border-rose-500/30 text-center space-y-3 z-10">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Camera Access Needed</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Please enable camera permission in your browser to scan movies playing on your TV or screen.
                </p>
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="w-full glass-button-primary py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white"
                  >
                    Enable Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full glass-button-secondary py-2 px-4 rounded-xl text-xs font-semibold text-neutral-300"
                  >
                    Upload Movie Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                <p className="text-xs font-semibold text-neutral-300">Opening device camera...</p>
              </div>
            )}
            {/* Subtle atmospheric backdrop */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80 pointer-events-none" />
          </div>
        )}

        {/* Ambient vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/25 to-black/85 pointer-events-none" />
      </div>

      {/* Top Floating Controls */}
      <header className="relative z-20 px-5 pt-6 pb-2 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="glass-surface p-2.5 rounded-full text-white/80 hover:text-white transition-all active:scale-90 cursor-pointer"
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
            {isAnalyzing ? analyzeStep : 'IDENTIFYING MOVIE'}
          </span>
        </div>

        {/* Torch / Flashlight toggle */}
        <button
          onClick={handleToggleTorch}
          className={`glass-surface p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            torchOn ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Toggle flashlight"
        >
          {torchOn ? <Zap className="w-5 h-5 fill-amber-400" /> : <ZapOff className="w-5 h-5" />}
        </button>
      </header>

      {/* Center Cinematic Glass Scanning Reticle */}
      <div 
        onClick={handleCapture}
        className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center cursor-pointer"
      >
        {/* Holographic TV & Poster Scanning Frame */}
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
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{cameraActive ? 'CAMERA LIVE' : 'AWAITING FEED'}</span>
            </span>
            <span>{isAnalyzing ? 'CAPTURED' : 'READY'}</span>
          </div>

          {/* Center Crosshairs */}
          <div className="self-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <p className="text-[11px] font-bold text-white mt-2 tracking-wide drop-shadow-md">
              Align movie screen, TV or poster
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
            <span className="text-neutral-300 font-mono text-[10px]">TAP SHUTTER TO IDENTIFY</span>
          </div>
        </div>

        {isAnalyzing && (
          <div className="w-full max-w-sm mt-4">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
              <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse shadow-[0_0_10px_#FA320A] w-full" />
            </div>
            <p className="text-center text-xs text-rose-400 font-semibold mt-2 animate-pulse">
              {analyzeStep}
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Picker Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Bottom Camera Controls Bar */}
      <footer className="relative z-20 px-6 pb-8 pt-3 flex flex-col items-center space-y-4">
        {/* Actions Row */}
        <div className="w-full flex items-center justify-between max-w-sm">
          {/* Upload Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="glass-surface p-3 rounded-2xl text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1"
            title="Upload Photo or Poster"
          >
            <ImageIcon className="w-5 h-5 text-rose-400" />
            <span className="text-[10px] font-medium text-neutral-400">Photo</span>
          </button>

          {/* Primary Tactile Shutter Button */}
          <button
            onClick={handleCapture}
            disabled={isAnalyzing}
            className="w-18 h-18 rounded-full p-1.5 border-3 border-white/50 hover:border-white transition-all active:scale-95 group cursor-pointer shadow-2xl shadow-rose-950/80 disabled:opacity-75"
            aria-label="Capture Movie"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-red-500 group-hover:scale-95 transition-transform shadow-[0_0_25px_rgba(250,50,10,0.7)] flex items-center justify-center">
              <Camera className="w-7 h-7 text-white" />
            </div>
          </button>

          {/* Flip Camera Button */}
          <button
            onClick={handleToggleFacingMode}
            className="glass-surface p-3 rounded-2xl text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1"
            title="Flip Camera"
          >
            <RefreshCw className="w-5 h-5 text-rose-400" />
            <span className="text-[10px] font-medium text-neutral-400">Flip</span>
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 font-medium text-center">
          Tap shutter to capture movie and view Rotten Tomatoes score
        </p>
      </footer>
    </div>
  );
};
