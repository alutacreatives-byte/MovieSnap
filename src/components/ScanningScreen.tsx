import React, { useEffect, useState, useRef } from 'react';
import { 
  ChevronLeft, Zap, ZapOff, Camera, RefreshCw, Radio, 
  AlertCircle, RotateCcw, HelpCircle, EyeOff
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
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identificationFailure, setIdentificationFailure] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // 1 & 8. Open device camera with robust error and permission handling
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      setPermissionDenied(false);
      setIdentificationFailure(null);
      setCapturedPhoto(null);

      // Stop existing tracks before starting a new one
      stopCamera();

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser. Use HTTPS or a modern browser.');
      }

      let stream: MediaStream;
      try {
        // Attempt back camera first for TV scanning
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any available video input (e.g. desktop webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      // 2. Attach stream directly to always-mounted video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        
        try {
          await videoRef.current.play();
          setCameraActive(true);
        } catch (playErr) {
          console.warn('Video play deferred, waiting for interaction:', playErr);
          setCameraActive(true);
        }
      }
    } catch (err: unknown) {
      console.warn('Camera request error:', err);
      const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setPermissionDenied(isDenied);
      const msg = isDenied 
        ? 'Camera permission was not granted. Please allow camera access in your browser settings to scan movies.'
        : err instanceof Error ? err.message : 'Could not start camera feed.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  // Mount effect
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, []);

  // 7. Back arrow returns to MovieSnap homepage
  const handleBackToHome = () => {
    stopCamera();
    onCancel();
  };

  // Flip front/back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Torch toggle
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

  // 4. Capture photo from active camera
  const capturePhotoFromVideo = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    
    // Fallback dimensions if video metadata not yet loaded
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // 5 & 6. Process captured image without fake guessing or hardcoded Batman
  const handleCaptureAndIdentify = async () => {
    if (isProcessing) return;

    const photoDataUrl = capturePhotoFromVideo();
    if (!photoDataUrl) {
      setCameraError('Unable to capture frame from camera. Ensure the camera is active and try again.');
      return;
    }

    // Play camera snap sound & freeze frame
    sound.snap();
    setCapturedPhoto(photoDataUrl);
    setIsProcessing(true);
    setIdentificationFailure(null);

    // Pause video while processing
    if (videoRef.current) {
      videoRef.current.pause();
    }

    try {
      // Real movie identification from the captured photo
      const result: IdentificationResult = await identifyMovieFromImage(photoDataUrl, popularMovies);

      setIsProcessing(false);

      if (result.identified && result.movie) {
        sound.success();
        stopCamera();
        onIdentified(result.movie);
      } else {
        // 6. Show clear "Movie not identified" result instead of guessing
        setIdentificationFailure(
          result.reason || 'Movie not identified. Could not recognize any movie scene or poster in the captured photo.'
        );
      }
    } catch (err) {
      console.error('Identification error:', err);
      setIsProcessing(false);
      setIdentificationFailure('Movie not identified. Error analyzing image. Please retake the photo.');
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    setIdentificationFailure(null);
    setIsProcessing(false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // File picker fallback for testing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setCapturedPhoto(dataUrl);
          setIsProcessing(true);
          setIdentificationFailure(null);
          
          const result = await identifyMovieFromImage(dataUrl, popularMovies);
          setIsProcessing(false);

          if (result.identified && result.movie) {
            sound.success();
            stopCamera();
            onIdentified(result.movie);
          } else {
            setIdentificationFailure(
              result.reason || 'Movie not identified from selected image.'
            );
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* 2. Video element is ALWAYS mounted to guarantee the live stream displays immediately */}
      <div className="absolute inset-0 z-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive && !capturedPhoto ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Frozen photo overlay when photo is captured */}
        {capturedPhoto && (
          <img
            src={capturedPhoto}
            alt="Captured movie frame"
            className="absolute inset-0 w-full h-full object-cover brightness-90 contrast-110"
          />
        )}

        {/* 3. Clear option to allow camera access if permission has not been granted */}
        {!cameraActive && !capturedPhoto && (
          <div className="relative z-10 p-6 max-w-xs text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/50">
              <Camera className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Camera Access Needed
              </h2>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                {permissionDenied
                  ? 'Camera permission was denied. Please allow camera access in your browser or address bar settings to scan your TV.'
                  : 'MovieSnap uses your device camera to identify movies playing on your TV screen or posters.'}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => startCamera(facingMode)}
                className="w-full glass-button-primary py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-xl cursor-pointer"
              >
                Allow Camera Access
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full glass-button-secondary py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Select Movie Photo
              </button>
            </div>
          </div>
        )}

        {/* Ambient Dark Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/80 pointer-events-none" />
      </div>

      {/* Top Floating Controls */}
      <header className="relative z-20 px-5 pt-6 pb-2 flex items-center justify-between">
        {/* 7. The Back arrow on the scanning screen must return to the MovieSnap homepage */}
        <button
          onClick={handleBackToHome}
          className="glass-surface p-2.5 rounded-full text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer"
          aria-label="Back to homepage"
          title="Back to MovieSnap"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Status Pill Badge */}
        <div className="glass-pill-badge px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-rose-500/30">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="text-xs font-extrabold tracking-widest text-white uppercase font-sans">
            {isProcessing
              ? 'IDENTIFYING...'
              : capturedPhoto
              ? 'PHOTO CAPTURED'
              : cameraActive
              ? 'LIVE CAMERA'
              : 'READY TO SCAN'}
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

      {/* Center Reticle & Results Container */}
      <div className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center">
        {/* 6. Clear "Movie not identified" result instead of guessing or returning Batman */}
        {identificationFailure ? (
          <div className="glass-surface w-full max-w-sm rounded-3xl p-6 border border-rose-500/30 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-md">
              <EyeOff className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Movie Not Identified
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed px-2">
                {identificationFailure}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-[11px] text-neutral-400 text-left space-y-1">
              <p className="font-semibold text-neutral-300">Tips for a successful scan:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Align the TV screen or movie poster inside the frame</li>
                <li>Avoid heavy glare or extreme viewing angles</li>
                <li>Ensure adequate room lighting</li>
              </ul>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleRetake}
                className="flex-1 glass-button-primary py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Photo</span>
              </button>
              
              <button
                onClick={handleBackToHome}
                className="px-4 glass-button-secondary rounded-xl text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>
        ) : (
          /* Live Holographic Glass Scanning Reticle */
          <div className="relative aspect-[16/10] w-full max-w-sm rounded-3xl glass-surface border border-white/30 shadow-[0_0_50px_rgba(250,50,10,0.25)] overflow-hidden flex flex-col justify-between p-4">
            {/* Subtle inner grid lines */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Sweeping Laser Line (Active while camera is live) */}
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
                <span>{cameraActive ? 'TV FRAME LOCKED' : 'CAMERA STANDBY'}</span>
              </span>
              <span>{isProcessing ? 'ANALYZING' : capturedPhoto ? 'FROZEN' : 'ALIGNED'}</span>
            </div>

            {/* Center Crosshairs */}
            <div className="self-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              </div>
              <p className="text-[11px] font-bold text-white mt-2 tracking-wide drop-shadow-md">
                {capturedPhoto ? 'Processing photo...' : 'Align TV screen or movie poster'}
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
                {capturedPhoto ? 'EXTRACTING SCENE' : 'TAP SHUTTER TO CAPTURE'}
              </span>
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
              Analyzing captured photo...
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
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Bottom Camera Controls Bar */}
      <footer className="relative z-20 px-6 pb-8 pt-3 flex flex-col items-center space-y-4">
        {/* Controls Row */}
        <div className="w-full flex items-center justify-between max-w-sm">
          {/* File Picker Option */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="glass-surface p-3 rounded-2xl text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
            title="Upload Photo or Poster"
          >
            <Camera className="w-5 h-5 text-rose-400" />
            <span className="text-[10px] font-medium text-neutral-400">Upload</span>
          </button>

          {/* 4. Primary Tactile Shutter Button: Captures photo using the camera */}
          <button
            onClick={handleCaptureAndIdentify}
            disabled={isProcessing || !cameraActive}
            className="w-18 h-18 rounded-full p-1.5 border-3 border-white/50 hover:border-white transition-all active:scale-95 group cursor-pointer shadow-2xl shadow-rose-950/80 disabled:opacity-50"
            aria-label="Capture Photo"
            title="Capture Photo"
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
          Tap the shutter button to take a photo of your TV or movie poster
        </p>
      </footer>
    </div>
  );
};
