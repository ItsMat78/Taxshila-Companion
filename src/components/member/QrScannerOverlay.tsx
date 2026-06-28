"use client";

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, ScanLine, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const QR_FEED_ID = "qr-scanner-fullscreen-feed";

interface QrScannerOverlayProps {
  /** The exact string payload the QR code must contain. */
  expectedPayload: string;
  /** Called after a valid QR scan. Should throw if the check-in fails. */
  onSuccess: () => Promise<void>;
  /** Called when the user dismisses the overlay or camera errors. */
  onClose: () => void;
}

export function QrScannerOverlay({ expectedPayload, onSuccess, onClose }: QrScannerOverlayProps) {
  const { toast } = useToast();
  const scannerRef = React.useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);
  const hasDetected = React.useRef(false);
  const mountedRef = React.useRef(true);

  // Coax the live camera track into the state a desk QR scan needs: a sharp,
  // well-exposed image. html5-qrcode never sets these, so by default Android
  // WebViews often hover at a hunting/fixed focus at ~20-30cm and decode a
  // blurry frame — the #1 reason a clearly-visible QR "scans only rarely".
  // Everything is best-effort and capability-gated: unsupported keys throw an
  // OverconstrainedError which we swallow, so this only ever helps.
  const tuneCameraTrack = React.useCallback(async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') return;
    const caps = track.getCapabilities() as MediaTrackCapabilities & {
      focusMode?: string[];
      exposureMode?: string[];
      torch?: boolean;
    };
    const advanced: MediaTrackConstraintSet[] = [];
    if (caps.focusMode?.includes('continuous')) {
      advanced.push({ focusMode: 'continuous' } as MediaTrackConstraintSet);
    }
    if (caps.exposureMode?.includes('continuous')) {
      advanced.push({ exposureMode: 'continuous' } as MediaTrackConstraintSet);
    }
    if (advanced.length) {
      try { await track.applyConstraints({ advanced }); } catch {}
    }
    if (mountedRef.current && caps.torch === true) setTorchSupported(true);
  }, []);

  const toggleTorch = React.useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      toast({ title: "Flash unavailable", description: "This device wouldn't let us toggle the torch.", variant: "destructive" });
    }
  }, [torchOn, toast]);

  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      s.stop().catch(() => {}).finally(() => { try { s.clear(); } catch {} });
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mountedRef.current) return;

        const scanner = new Html5Qrcode(QR_FEED_ID) as any;
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            // Use the browser's native BarcodeDetector when available (modern
            // Android Chrome): it's hardware-accelerated and decodes the full frame
            // near-instantly, whereas the ZXing WASM/JS fallback grinds through
            // every pixel on the CPU. html5-qrcode falls back to ZXing automatically
            // where the native API is missing, so this only ever helps.
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
            // QR codes are never mirrored at the desk. By default html5-qrcode
            // re-decodes a horizontally-flipped copy of every frame that misses,
            // doubling the per-frame cost for nothing — turn it off.
            disableFlip: true,
            // Resolution/orientation hints MUST go through `videoConstraints`: the
            // first argument only accepts `facingMode`/`deviceId` and throws on any
            // other key — passing width/height there is what stopped the camera from
            // opening. Keep a *portrait* rear stream so the sensor isn't aggressively
            // zoom-cropped by the fullscreen `object-fit: cover` preview, but only
            // 720p-class: plenty of detail for a QR code and far cheaper to decode
            // than 1080p. `ideal` constraints never fail, so this degrades gracefully.
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 720 },
              height: { ideal: 1280 },
            },
            // No `qrbox`: scan the full camera frame. html5-qrcode maps the qrbox
            // into the source frame using videoWidth/clientWidth and
            // videoHeight/clientHeight *independently*, which is only correct while
            // the video keeps its natural aspect ratio. Under `object-fit: cover`
            // those ratios diverge, so a fixed qrbox sampled a distorted, off-centre
            // region (the "weird crop") and the library also drew its own misaligned
            // shaded overlay. Full-frame scanning maps the whole frame 1:1 and lets
            // our custom viewfinder be the only guide — and with the native detector
            // above, scanning the full frame is fast, so a qrbox buys us nothing.
          },
          async (decodedText: string) => {
            if (!mountedRef.current || hasDetected.current) return;
            hasDetected.current = true;

            if (decodedText === expectedPayload) {
              if (!mountedRef.current) return;
              setIsProcessing(true);
              try {
                stopCamera();
                await onSuccess();
              } catch (err) {
                toast({
                  title: "Check-in Failed",
                  description: err instanceof Error ? err.message : "Please try again.",
                  variant: "destructive",
                });
                if (!mountedRef.current) return;
                setIsProcessing(false);
                hasDetected.current = false;
              }
            } else {
              toast({
                title: "Wrong QR Code",
                description: "Please scan the official library QR code.",
                variant: "destructive",
              });
              await new Promise<void>(r => setTimeout(r, 700));
              if (!mountedRef.current) return;
              hasDetected.current = false;
            }
          },
          (error: unknown) => {
            const msg = String(error).toLowerCase();
            const isFatal =
              msg.includes('permission') ||
              msg.includes('notallowederror') ||
              msg.includes('notfounderror') ||
              msg.includes('aborterror');
            if (isFatal && mountedRef.current) {
              setCameraError("Camera access denied. Enable camera permissions in your browser settings and try again.");
            }
            // "No QR code found" is fired on every frame — silently ignore it.
          }
        );

        if (mountedRef.current) {
          const videoEl = document.getElementById(QR_FEED_ID)?.querySelector('video');
          if (videoEl?.srcObject) {
            const stream = videoEl.srcObject as MediaStream;
            streamRef.current = stream;
            // Capabilities aren't always populated the instant the track goes
            // live, so tune immediately and once more shortly after.
            tuneCameraTrack(stream);
            setTimeout(() => {
              if (mountedRef.current && streamRef.current) tuneCameraTrack(streamRef.current);
            }, 800);
          }
          setIsReady(true);
        }
      } catch {
        if (mountedRef.current) {
          setCameraError("Could not start camera. Ensure no other app is using it and try again.");
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
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Force Html5Qrcode's injected <video> to fill the container */}
      <style>{`
        /* html5-qrcode sets the container to inline position:relative and the
           <video> to a fixed px width with auto height, collapsing the feed to the
           camera's natural aspect (a band at the top with black below). Force both
           to fill the viewport — !important is required to beat the library's inline
           styles — so object-fit:cover actually has a height to cover. */
        #${QR_FEED_ID} { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; }
        #${QR_FEED_ID} video { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 0 !important; }
        #${QR_FEED_ID} > div { width: 100% !important; height: 100% !important; padding: 0 !important; border: none !important; }
        /* We render our own viewfinder; hide html5-qrcode's built-in shaded overlay. */
        #${QR_FEED_ID} #qr-shaded-region, #qr-shaded-region { display: none !important; }
      `}</style>

      {/* Camera feed — Html5Qrcode renders <video> here */}
      <div id={QR_FEED_ID} />

      {/* UI overlay — sits above the camera feed */}
      <div className="absolute inset-0 flex flex-col" style={{ pointerEvents: 'none' }}>

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 pt-10 pb-8 bg-gradient-to-b from-black/75 to-transparent"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center gap-2 text-white">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-wide text-sm">Scan QR Code</span>
          </div>
          <div className="flex items-center gap-2">
            {torchSupported && (
              <button
                onClick={toggleTorch}
                disabled={isProcessing}
                aria-label={torchOn ? "Turn off flash" : "Turn on flash"}
                aria-pressed={torchOn}
                className={`h-9 w-9 rounded-full border flex items-center justify-center transition-colors disabled:opacity-40 ${
                  torchOn
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/25 active:bg-white/30'
                }`}
              >
                {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Close scanner"
              className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 active:bg-white/30 transition-colors disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder — centered vertically in the remaining space */}
        <div className="flex-1 flex items-center justify-center">
          {/*
            box-shadow with a huge spread casts a dark tint over the entire screen
            *except* the box itself, creating the classic scanner "punch-through" effect.
          */}
          <div
            className="relative rounded"
            style={{
              width: 256,
              height: 256,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.58)',
            }}
          >
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white rounded-tl" />
            <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white rounded-tr" />
            <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white rounded-bl" />
            <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white rounded-br" />

            {/* Animated scan line */}
            {isReady && !isProcessing && (
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scanner-line" />
            )}

            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 rounded">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
                <span className="text-white text-xs font-medium tracking-widest uppercase">Checking in…</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom — instructions + cancel */}
        <div
          className="flex flex-col items-center gap-4 px-6 pt-8 pb-10 bg-gradient-to-t from-black/75 to-transparent"
          style={{ pointerEvents: 'auto' }}
        >
          {cameraError ? (
            <p className="text-red-400 text-sm text-center max-w-xs leading-relaxed">{cameraError}</p>
          ) : !isReady ? (
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Starting camera…</span>
            </div>
          ) : (
            <p className="text-white/70 text-sm text-center">
              Point your camera at the QR code at the library desk
            </p>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full max-w-xs bg-white/10 border-white/25 text-white hover:bg-white/20 active:bg-white/30"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
