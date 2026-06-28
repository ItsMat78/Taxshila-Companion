"use client";

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, ScanLine, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsQR from 'jsqr';

// Minimal typings for the (non-standard) Shape Detection API.
type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> };
type BarcodeDetectorCtor = {
  new (opts?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

interface QrScannerOverlayProps {
  /** The exact string payload the QR code must contain. */
  expectedPayload: string;
  /** Called after a valid QR scan. Should throw if the check-in fails. */
  onSuccess: () => Promise<void>;
  /** Called when the user dismisses the overlay or camera errors. */
  onClose: () => void;
}

// jsQR fallback decodes a centred, downscaled crop — small enough to run every
// frame on the CPU, which is the whole point: html5-qrcode ground through the
// full 720p frame and took ages. The native BarcodeDetector path, when present,
// is faster still and runs on the full frame.
const DECODE_SIZE = 384;

/**
 * Fast, self-contained QR scanner. Owns its own getUserMedia stream (so nothing
 * silently restarts the camera mid-aim) and decodes with the hardware
 * BarcodeDetector when available, falling back to jsQR on a cropped+downscaled
 * canvas otherwise.
 */
export function QrScannerOverlay({ expectedPayload, onSuccess, onClose }: QrScannerOverlayProps) {
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const trackRef = React.useRef<MediaStreamTrack | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const [isReady, setIsReady] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);

  const hasDetected = React.useRef(false);
  const mountedRef = React.useRef(true);
  const lastWrongAt = React.useRef(0);

  // Keep the latest onSuccess without re-running the camera effect.
  const onSuccessRef = React.useRef(onSuccess);
  React.useEffect(() => { onSuccessRef.current = onSuccess; });

  const stopCamera = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
  }, []);

  const toggleTorch = React.useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      toast({ title: "Flash unavailable", description: "This device wouldn't let us toggle the torch.", variant: "destructive" });
    }
  }, [torchOn, toast]);

  React.useEffect(() => {
    mountedRef.current = true;
    hasDetected.current = false;

    let detector: BarcodeDetectorInstance | null = null;
    let decoding = false;

    const handleDecoded = async (text: string) => {
      if (!mountedRef.current || hasDetected.current) return;

      if (text !== expectedPayload) {
        const now = Date.now();
        if (now - lastWrongAt.current > 2500) {
          lastWrongAt.current = now;
          toast({ title: "Wrong QR Code", description: "Please scan the official library QR code.", variant: "destructive" });
        }
        return;
      }

      // Valid code: pause scanning, give haptic feedback, run the check-in.
      hasDetected.current = true;
      try { navigator.vibrate?.(90); } catch {}
      setIsProcessing(true);
      try {
        await onSuccessRef.current();
        stopCamera(); // success closes the overlay; release the camera now.
      } catch (err) {
        // Check-in failed — resume scanning so they can retry.
        toast({
          title: "Check-in Failed",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
        if (!mountedRef.current) return;
        setIsProcessing(false);
        hasDetected.current = false;
      }
    };

    const decodeFrame = async (video: HTMLVideoElement): Promise<string | null> => {
      if (detector) {
        try {
          const codes = await detector.detect(video);
          if (codes?.length) return codes[0].rawValue || null;
          return null;
        } catch {
          detector = null; // detector died — drop to jsQR for the rest of the session.
        }
      }
      const canvas = canvasRef.current;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!canvas || !vw || !vh) return null;
      const crop = Math.min(vw, vh); // centred square ≈ the viewfinder region
      const sx = (vw - crop) / 2;
      const sy = (vh - crop) / 2;
      canvas.width = DECODE_SIZE;
      canvas.height = DECODE_SIZE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(video, sx, sy, crop, crop, 0, 0, DECODE_SIZE, DECODE_SIZE);
      const { data, width, height } = ctx.getImageData(0, 0, DECODE_SIZE, DECODE_SIZE);
      const result = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
      return result?.data ?? null;
    };

    const tick = async () => {
      if (!mountedRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !hasDetected.current && !decoding) {
        decoding = true;
        try {
          const text = await decodeFrame(video);
          if (text) await handleDecoded(text);
        } catch { /* keep scanning */ }
        decoding = false;
      }
      if (mountedRef.current) rafRef.current = requestAnimationFrame(tick);
    };

    const tuneTrack = (track: MediaStreamTrack) => {
      if (typeof track.getCapabilities !== 'function') return;
      const caps = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean };
      if (caps.focusMode?.includes('continuous')) {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {});
      }
      if (caps.torch === true && mountedRef.current) setTorchSupported(true);
    };

    const init = async () => {
      try {
        const BD = (typeof window !== 'undefined' ? (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector : undefined);
        if (BD) {
          try {
            const formats: string[] | undefined = await BD.getSupportedFormats?.();
            if (!formats || formats.includes('qr_code')) detector = new BD({ formats: ['qr_code'] });
          } catch { detector = null; }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        tuneTrack(track);

        const video = videoRef.current;
        if (!video) { stopCamera(); return; }
        video.srcObject = stream;
        await video.play().catch(() => {});

        if (!mountedRef.current) { stopCamera(); return; }
        setIsReady(true);
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!mountedRef.current) return;
        const msg = String(err).toLowerCase();
        if (msg.includes('notallowed') || msg.includes('permission') || msg.includes('denied')) {
          setCameraError("Camera access denied. Enable camera permissions in your settings and try again.");
        } else if (msg.includes('notfound')) {
          setCameraError("No camera found on this device.");
        } else {
          setCameraError("Could not start the camera. Ensure no other app is using it and try again.");
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* UI overlay */}
      <div className="absolute inset-0 flex flex-col" style={{ pointerEvents: 'none' }}>

        {/* Top bar */}
        <div
          className="flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-4 pb-8 pt-10"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center gap-2 text-white">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold tracking-wide">Scan QR Code</span>
            {isReady && !isProcessing && !cameraError && (
              <span className="ml-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Scanning
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {torchSupported && (
              <button
                onClick={toggleTorch}
                disabled={isProcessing}
                aria-label={torchOn ? "Turn off flash" : "Turn on flash"}
                aria-pressed={torchOn}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                  torchOn
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-white/20 bg-white/10 text-white hover:bg-white/25 active:bg-white/30'
                }`}
              >
                {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Close scanner"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/25 active:bg-white/30 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder */}
        <div className="flex flex-1 items-center justify-center">
          <div
            className="relative rounded"
            style={{ width: 256, height: 256, boxShadow: '0 0 0 9999px rgba(0,0,0,0.58)' }}
          >
            <span className="absolute left-0 top-0 h-7 w-7 rounded-tl border-l-[3px] border-t-[3px] border-white" />
            <span className="absolute right-0 top-0 h-7 w-7 rounded-tr border-r-[3px] border-t-[3px] border-white" />
            <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl border-b-[3px] border-l-[3px] border-white" />
            <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br border-b-[3px] border-r-[3px] border-white" />

            {isReady && !isProcessing && (
              <div className="absolute inset-x-2 h-0.5 animate-scanner-line bg-gradient-to-r from-transparent via-primary to-transparent" />
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <span className="text-xs font-medium uppercase tracking-widest text-white">Checking in…</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div
          className="flex flex-col items-center gap-4 bg-gradient-to-t from-black/75 to-transparent px-6 pb-10 pt-8"
          style={{ pointerEvents: 'auto' }}
        >
          {cameraError ? (
            <p className="max-w-xs text-center text-sm leading-relaxed text-red-400">{cameraError}</p>
          ) : !isReady ? (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Starting camera…</span>
            </div>
          ) : (
            <p className="text-center text-sm text-white/70">
              Point your camera at the QR code at the library desk
            </p>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full max-w-xs border-white/25 bg-white/10 text-white hover:bg-white/20 active:bg-white/30"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
