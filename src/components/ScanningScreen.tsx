import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  ChevronLeft, Zap, ZapOff, Camera, RefreshCw, Radio, 
  RotateCcw, EyeOff, Upload, Sparkles, Home
} from 'lucide-react';
import { Movie } from '../types';
import { sound } from '../utils/sound';
import { identifyMovieFromImage, IdentificationResult } from '../services/movieIdentification';

interface ScanningScreenProps {
  onIdentified: (movie: Movie) => void;
  onCancel: () => void;
  popularMovies: Movie[];
  initialImage?: string | null;
  initialMode?: 'live' | 'photo';
}

export const ScanningScreen: React.FC<ScanningScreenProps> = ({
  onIdentified,
  onCancel,
  popularMovies,
  initialImage,
  initialMode = 'live',
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  
  
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(initialImage || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false);
  const [identificationFailure, setIdentificationFailure] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveScanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef(false);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (liveScanIntervalRef.current) {
      clearInterval(liveScanIntervalRef.current);
      liveScanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // 1. Open device camera
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    try {
      
      
      setIdentificationFailure(null);
      setCapturedPhoto(null);
      setIsProcessing(false);

      stopCamera();

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser. Use HTTPS or a modern browser.');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        
        try {
          await videoRef.current.play();
          setCameraActive(true);
        } catch (playErr) {
          console.warn('Video play deferred:', playErr);
          setCameraActive(true);
        }
      }
    } catch (err: unknown) {
      console.warn('Camera request error:', err);
      
      
      
      
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Mount effect: handle initialImage or start camera
  useEffect(() => {
    if (initialImage) {
      // If user uploaded an image from home screen, process it immediately
      processImageDirectly(initialImage);
    } else {
      startCamera(facingMode);
    }

    return () => {
      stopCamera();
    };
  }, [initialImage]);

  // Capture current frame from <video> onto canvas
  const captureFrame = (quality = 0.9): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    if (vWidth === 0 || vHeight === 0) return null;

    const maxDim = 1920;
    let canvasWidth = vWidth;
    let canvasHeight = vHeight;

    if (vWidth > maxDim || vHeight > maxDim) {
      if (vWidth >= vHeight) {
        canvasWidth = maxDim;
        canvasHeight = Math.round((vHeight * maxDim) / vWidth);
      } else {
        canvasHeight = maxDim;
        canvasWidth = Math.round((vWidth * maxDim) / vHeight);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
    return canvas.toDataURL("image/jpeg", quality);
  };

  // Process any image directly (from upload or capture)
  const processImageDirectly = async (dataUrl: string) => {
    sound.snap();
    setCapturedPhoto(dataUrl);
    setIsProcessing(true);
    setIdentificationFailure(null);

    if (videoRef.current) {
      videoRef.current.pause();
    }

    try {
      const result: IdentificationResult = await identifyMovieFromImage(dataUrl, popularMovies);
      setIsProcessing(false);

      if (result.identified && result.movie) {
        sound.success();
        stopCamera();
        onIdentified(result.movie);
      } else {
        setIdentificationFailure(
          result.reason || 'Movie not identified. Could not recognize any movie in this image.'
        );
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      setIsProcessing(false);
      setIdentificationFailure('Movie not identified. Error analyzing image. Please try again.');
    }
  };

  // 1. Live Continuous Scanning: periodically sample live camera frames
  useEffect(() => {
    if (!cameraActive || capturedPhoto || isProcessing || identificationFailure || initialMode === 'photo') {
      if (liveScanIntervalRef.current) {
        clearInterval(liveScanIntervalRef.current);
        liveScanIntervalRef.current = null;
      }
      return;
    }

    // Run continuous frame evaluation every 1.8 seconds
    liveScanIntervalRef.current = setInterval(async () => {
      if (isAnalyzingRef.current || !videoRef.current || videoRef.current.paused) return;

      const frameDataUrl = captureFrame(0.7);
      if (!frameDataUrl) return;

      try {
        isAnalyzingRef.current = true;
        setIsLiveAnalyzing(true);

        const result: IdentificationResult = await identifyMovieFromImage(frameDataUrl, popularMovies, { isLiveScan: true });

        if (result.identified && result.movie) {
          // Movie identified live without taking photo!
          sound.success();
          stopCamera();
          onIdentified(result.movie);
        }
      } catch (err) {
        console.warn('Live frame analysis check:', err);
      } finally {
        isAnalyzingRef.current = false;
        setIsLiveAnalyzing(false);
      }
    }, 1800);

    return () => {
      if (liveScanIntervalRef.current) {
        clearInterval(liveScanIntervalRef.current);
        liveScanIntervalRef.current = null;
      }
    };
  }, [cameraActive, capturedPhoto, isProcessing, identificationFailure, initialMode, popularMovies, onIdentified, stopCamera]);

  // 2. Take a photo & analyze captured image
  const handleCapturePhoto = () => {
    if (isProcessing) return;
    const photoDataUrl = captureFrame(0.9);
    if (!photoDataUrl) {
      
      return;
    }
    processImageDirectly(photoDataUrl);
  };

  // 3. Upload an image from device & analyze
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          processImageDirectly(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Back arrow returns to MovieSnap homepage
  const handleBackToHome = () => {
    stopCamera();
    onCancel();
  };

  // Retake photo or resume live camera
  const handleRetake = () => {
    setCapturedPhoto(null);
    setIdentificationFailure(null);
    setIsProcessing(false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else {
      startCamera(facingMode);
    }
  };

  // Toggle front/back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Toggle Torch / Flashlight
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

  return (
    <div className="relative w-full h-full min-h-screen bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* Live Video / Captured Photo Viewport */}
      <div className="absolute inset-0 z-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
        {/* Live Camera Video (permanently mounted) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive && !capturedPhoto ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Frozen Photo View (active when photo captured or uploaded) */}
        {capturedPhoto && (
          <img
            src={capturedPhoto}
            alt="Captured movie frame"
            className="absolute inset-0 w-full h-full object-cover brightness-90 contrast-110"
          />
        )}

        {/* Ambient Dark Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/80 pointer-events-none" />
      </div>

      {/* Top Floating Controls */}
      <header className="relative z-20 px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 2. Back arrow returns to MovieSnap homepage */}
          <button
            onClick={handleBackToHome}
            className="glass-surface p-2.5 rounded-full text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer"
            aria-label="Back to homepage"
            title="Back to MovieSnap"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 1. Clearly visible Home button */}
          <button
            onClick={handleBackToHome}
            className="glass-pill-badge flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-200 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Return to MovieSnap homepage"
          >
            <Home className="w-3.5 h-3.5 text-rose-400" />
            <span>Home</span>
          </button>
        </div>

        {/* Status Pill Badge */}
        <div className="glass-pill-badge px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-rose-500/30">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="text-xs font-extrabold tracking-widest text-white uppercase font-sans flex items-center gap-1">
            {isProcessing
              ? 'SEARCHING WEB...'
              : capturedPhoto
              ? 'PHOTO CAPTURED'
              : isLiveAnalyzing
              ? 'AUTO-SCANNING...'
              : cameraActive
              ? 'LIVE SCANNING'
              : 'STANDBY'}
          </span>
        </div>

        {/* Torch toggle */}
        <button
          onClick={handleToggleTorch}
          disabled={!cameraActive}
          className={`glass-surface p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            torchOn ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Toggle flashlight"
        >
          {torchOn ? <Zap className="w-5 h-5 fill-amber-400" /> : <ZapOff className="w-5 h-5" />}
        </button>
      </header>

      {/* Center Reticle & Results Area */}
      <div className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center">
        {/* Minimal Cinematic No-Results State */}
        {identificationFailure ? (
          <div className="glass-surface w-full max-w-sm rounded-3xl p-6 border border-white/15 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-md">
              <EyeOff className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Scene Not Identified
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed px-2">
                {identificationFailure || 'Could not recognize a movie or TV series from this scene.'}
              </p>
            </div>

            {/* Clear Actions: Scan Again, Take a Photo, Upload Image */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleRetake}
                className="w-full glass-button-primary py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Scan Again</span>
              </button>

              <button
                onClick={handleCapturePhoto}
                className="w-full glass-surface-interactive py-2.5 rounded-xl text-xs font-semibold text-neutral-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer border border-white/10"
              >
                <Camera className="w-4 h-4 text-rose-400" />
                <span>Take a Photo</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full glass-surface-interactive py-2.5 rounded-xl text-xs font-semibold text-neutral-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer border border-white/10"
              >
                <Upload className="w-4 h-4 text-rose-400" />
                <span>Upload Image</span>
              </button>

              <button
                onClick={handleBackToHome}
                className="w-full py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </div>
        ) : (
          /* Live Holographic Glass Scanning Reticle */
          <div className="relative aspect-[16/10] w-full max-w-sm rounded-3xl glass-surface border border-white/30 shadow-[0_0_50px_rgba(250,50,10,0.25)] overflow-hidden flex flex-col justify-between p-4">
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Sweeping Laser Line (Active while camera is scanning) */}
            {!capturedPhoto && cameraActive && (
              <div className="absolute inset-x-0 scanning-laser-line pointer-events-none z-10">
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_#FA320A,0_0_5px_#FFF]" />
                <div className="h-12 w-full bg-gradient-to-b from-rose-500/20 to-transparent" />
              </div>
            )}

            {/* Precision 3D Reticle Corners */}
            <div className="absolute top-3 left-3 w-7 h-7 border-t-3 border-l-3 border-rose-500 rounded-tl-xl shadow-[0_0_10px_rgba(250,50,10,0.6)]" />
            <div className="absolute top-3 right-3 w-7 h-7 border-t-3 border-r-3 border-rose-500 rounded-tr-xl shadow-[0_0_10px_rgba(250,50,10,0.6)]" />
            <div className="absolute bottom-3 left-3 w-7 h-7 border-b-3 border-l-3 border-rose-500 rounded-bl-xl shadow-[0_0_10px_rgba(250,50,10,0.6)]" />
            <div className="absolute bottom-3 right-3 w-7 h-7 border-b-3 border-r-3 border-rose-500 rounded-br-xl shadow-[0_0_10px_rgba(250,50,10,0.6)]" />

            {/* Top Tag inside frame */}
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono tracking-wider">
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>{cameraActive ? 'TV FRAME LOCKED' : 'STANDBY'}</span>
              </span>
              <span className="flex items-center gap-1 text-neutral-300">
                <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>{isLiveAnalyzing ? 'ANALYZING LIVE...' : 'AUTO-SCAN ON'}</span>
              </span>
            </div>

            {/* Center Crosshairs */}
            <div className="self-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              </div>
              <p className="text-[11px] font-bold text-white mt-2 tracking-wide drop-shadow-md text-center">
                {isProcessing
                  ? 'Analyzing scene & searching the web...'
                  : capturedPhoto
                  ? 'Processing image...'
                  : 'Point at TV screen or movie poster'}
              </p>
            </div>

            {/* Bottom frequency bars */}
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
              
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="w-full max-w-sm mt-4 text-center">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
              <div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 animate-pulse shadow-[0_0_12px_#FA320A] w-full" />
            </div>
            <p className="text-xs text-rose-400 font-bold mt-2 animate-pulse tracking-wide">
              Analyzing movie visual features...
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Picker Input for uploading images from device */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Bottom Camera Controls Bar */}
      <footer className="relative z-20 px-6 pb-8 pt-3 flex flex-col items-center space-y-4">
        {/* Controls Row */}
        <div className="w-full flex items-center justify-between max-w-sm">
          {/* 3. Upload an Image Button: Select image from device */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="glass-surface p-3 rounded-2xl text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
            title="Upload Movie Image from Device"
          >
            <Upload className="w-5 h-5 text-rose-400" />
            <span className="text-[10px] font-medium text-neutral-400">Upload</span>
          </button>

          {/* 2. Primary Tactile Shutter Button: Take a photo manually */}
          <button
            onClick={handleCapturePhoto}
            disabled={isProcessing || !cameraActive}
            className="w-18 h-18 rounded-full p-1.5 border-3 border-white/50 hover:border-white transition-all active:scale-95 group cursor-pointer shadow-2xl shadow-rose-950/80 disabled:opacity-50"
            aria-label="Take Photo"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-red-500 group-hover:scale-95 transition-transform shadow-[0_0_25px_rgba(250,50,10,0.7)] flex items-center justify-center">
              <Camera className="w-7 h-7 text-white" />
            </div>
          </button>

          {/* Flip Camera Button */}
          <button
            onClick={handleToggleFacingMode}
            disabled={isProcessing || !cameraActive}
            className="glass-surface p-3 rounded-2xl text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
            title="Flip Camera"
          >
            <RefreshCw className="w-5 h-5 text-rose-400" />
            <span className="text-[10px] font-medium text-neutral-400">Flip</span>
          </button>
        </div>

        {/* Instant Test Sample Scenes bar for testing */}
        <div className="w-full max-w-sm flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold shrink-0">Test Scene:</span>
          {popularMovies.slice(0, 3).map((m) => (
            <button
              key={m.id}
              onClick={() => processImageDirectly(m.poster)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white transition-colors border border-white/15 shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>{m.title}</span>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-neutral-400 font-medium text-center">
          Auto-scans live TV feed, or tap shutter to take photo, or tap Upload to select an image
        </p>
      </footer>
    </div>
  );
};
