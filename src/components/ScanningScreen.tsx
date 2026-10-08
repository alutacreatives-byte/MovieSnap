import React, { useEffect, useState, useRef } from 'react';
import { 
  X, Zap, ZapOff, Camera, RefreshCw, Radio, Image as ImageIcon, 
  AlertCircle, Key, CheckCircle, RotateCcw, Sparkles 
} from 'lucide-react';
import { Movie } from '../types';
import { sound } from '../utils/sound';
import { identifyMovieFromImage, IdentificationResult } from '../services/movieIdentification';

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
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [identificationError, setIdentificationError] = useState<IdentificationResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Open device camera immediately on mount
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      setIdentificationError(null);
      setCapturedPhoto(null);

      // Clean up any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not supported on this browser or device.');
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
        // Fallback to basic video input if facingMode constraint is unsupported
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
      console.warn('Camera initialization error:', err);
      const msg = err instanceof Error ? err.message : 'Camera permission was denied or device has no camera.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      // Clean up camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Flip camera between environment and user
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Toggle torch / flashlight
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

  // 2. Capture a photo from the live video feed
  const capturePhoto = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // 3. Process captured image & 4. Identify movie
  const processAndIdentify = async (photoDataUrl: string) => {
    sound.snap();
    setCapturedPhoto(photoDataUrl);
    setIsProcessing(true);
    setIdentificationError(null);
    setProcessStep('CAPTURING PHOTO FRAME...');

    // Pause video to show frozen capture
    if (videoRef.current) {
      videoRef.current.pause();
    }

    // Step 2: Processing visual data
    await new Promise((r) => setTimeout(r, 450));
    setProcessStep('ANALYZING VISUAL SIGNATURES...');

    // Step 3: Querying identification service
    await new Promise((r) => setTimeout(r, 600));
    setProcessStep('IDENTIFYING MOVIE...');

    // Real identification call (NO fake hardcoding)
    const result = await identifyMovieFromImage(photoDataUrl, popularMovies);

    setIsProcessing(false);

    if (result.success && result.movie) {
      // 5. Display identified movie
      sound.success();
      // Stop camera stream cleanly
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      onIdentified(result.movie);
    } else {
      // Real result: movie was NOT identified or API is required
      setIdentificationError(result);
    }
  };

  // Handle Shutter Button tap
  const handleShutterTap = () => {
    if (isProcessing) return;
    const photo = capturePhoto();
    if (photo) {
      processAndIdentify(photo);
    } else {
      setCameraError('Could not capture frame from camera stream. Please try again.');
    }
  };

  // Handle manual photo upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          processAndIdentify(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Retake photo / reset scanner
  const handleRetake = () => {
    setCapturedPhoto(null);
    setIdentificationError(null);
    setIsProcessing(false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Allow testing verified movie flow if API is missing
  const handleTestDemoScan = (demoMovie: Movie) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    onIdentified(demoMovie);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* Background Camera Feed / Captured Photo */}
      <div className="absolute inset-0 z-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
        {capturedPhoto ? (
          /* Frozen Captured Photo View */
          <img
            src={capturedPhoto}
            alt="Captured movie frame"
            className="w-full h-full object-cover brightness-90 contrast-110"
          />
        ) : cameraActive ? (
          /* Live Device Camera Stream */
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          /* Fallback when camera permission is denied */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center z-10">
            {cameraError ? (
              <div className="glass-surface max-w-xs p-6 rounded-3xl border border-rose-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Camera Access Needed</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Please allow camera access in your browser to scan movies playing on your TV or screen.
                </p>
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="w-full glass-button-primary py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                  >
                    Enable Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full glass-button-secondary py-2 px-4 rounded-xl text-xs font-semibold text-neutral-300 cursor-pointer"
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
          </div>
        )}

        {/* Ambient Dark Vignette */}
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

        {/* Status Pill Badge */}
        <div className="glass-pill-badge px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-rose-500/30">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="text-xs font-extrabold tracking-widest text-white uppercase font-sans">
            {isProcessing ? processStep : capturedPhoto ? 'PHOTO CAPTURED' : 'IDENTIFYING MOVIE'}
          </span>
        </div>

        {/* Torch / Flashlight Toggle */}
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

      {/* Center Cinematic Glass Scanning Reticle & Results Area */}
      <div className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center">
        {/* If identification failed or API is required, show genuine diagnostic card */}
        {identificationError ? (
          <div className="glass-surface w-full max-w-sm rounded-3xl p-5 border border-white/20 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {identificationError.errorType === 'api_required' ? (
              /* Clearly identify what API service is required */
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-amber-400">
                  <Key className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm font-extrabold tracking-wide uppercase">
                    Movie Identification API Required
                  </h3>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Real-time visual movie recognition from arbitrary TV captures requires connecting a visual AI service.
                </p>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-neutral-400">Required Service:</span>
                    <span className="font-bold text-white">Google Gemini Vision API</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-neutral-400">Environment Variable:</span>
                    <span className="font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">GEMINI_API_KEY</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-neutral-400">Alternative:</span>
                    <span className="text-neutral-300 font-medium">The Movie Database (TMDB) API</span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400">
                  MovieSnap does not generate fake scan results. You can retake a photo or test the identification flow with a verified movie:
                </p>

                {/* Test with popular movies */}
                <div className="pt-1 flex gap-2 overflow-x-auto no-scrollbar">
                  {popularMovies.slice(0, 3).map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => handleTestDemoScan(movie)}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 whitespace-nowrap cursor-pointer"
                    >
                      Test: {movie.title}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRetake}
                  className="w-full glass-button-primary py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Scan Another Photo</span>
                </button>
              </div>
            ) : (
              /* Genuine "No Movie Detected" response */
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No Movie Recognized</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {identificationError.errorMessage ||
                    'Could not detect a recognized movie playing on the TV or a movie poster in the captured photo.'}
                </p>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleRetake}
                    className="flex-1 glass-button-primary py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    onClick={onCancel}
                    className="px-4 glass-button-secondary rounded-xl text-xs font-semibold text-neutral-300 cursor-pointer"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active Holographic TV Scanning Frame */
          <div className="relative aspect-[16/10] w-full max-w-sm rounded-3xl glass-surface border border-white/30 shadow-[0_0_50px_rgba(250,50,10,0.25)] overflow-hidden flex flex-col justify-between p-4">
            {/* Subtle inner grid lines */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Sweeping Laser Line (Active while scanning) */}
            {!capturedPhoto && (
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
                <span>{capturedPhoto ? 'FRAME LOCKED' : cameraActive ? 'LIVE CAMERA' : 'STANDBY'}</span>
              </span>
              <span>{isProcessing ? 'ANALYZING' : capturedPhoto ? 'READY' : 'ALIGNED'}</span>
            </div>

            {/* Center Crosshairs */}
            <div className="self-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              </div>
              <p className="text-[11px] font-bold text-white mt-2 tracking-wide drop-shadow-md">
                {capturedPhoto ? 'Processing photo...' : 'Align movie screen or poster'}
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
              <span className="text-neutral-300 font-mono text-[10px]">
                {capturedPhoto ? 'ANALYZING PIXELS' : 'TAP SHUTTER TO CAPTURE'}
              </span>
            </div>
          </div>
        )}

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="w-full max-w-sm mt-4">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
              <div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 animate-pulse shadow-[0_0_12px_#FA320A] w-full" />
            </div>
            <p className="text-center text-xs text-rose-400 font-bold mt-2 animate-pulse tracking-wide">
              {processStep}
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
            disabled={isProcessing}
            className="glass-surface p-3 rounded-2xl text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
            title="Upload Photo or Poster"
          >
            <ImageIcon className="w-5 h-5 text-rose-400" />
            <span className="text-[10px] font-medium text-neutral-400">Photo</span>
          </button>

          {/* Primary Tactile Shutter Button */}
          <button
            onClick={handleShutterTap}
            disabled={isProcessing || !cameraActive}
            className="w-18 h-18 rounded-full p-1.5 border-3 border-white/50 hover:border-white transition-all active:scale-95 group cursor-pointer shadow-2xl shadow-rose-950/80 disabled:opacity-50"
            aria-label="Capture Movie Photo"
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

        <p className="text-[11px] text-neutral-400 font-medium text-center">
          Tap the shutter button to capture a movie frame from your TV or poster
        </p>
      </footer>
    </div>
  );
};
