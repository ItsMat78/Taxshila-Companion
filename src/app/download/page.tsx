"use client";

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, MonitorSmartphone, Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInstallPlatform } from '@/lib/device';
import { GooglePlayIcon, PLAY_STORE_URL } from '@/components/shared/google-play-icon';

const LOGO_URL = '/logo.png';

const pillBase = "inline-flex items-center justify-center gap-2 rounded-full border-2 border-cod-ink font-cod-mono text-xs font-bold uppercase tracking-widest transition-all duration-200";

export default function DownloadPage() {
  const router = useRouter();
  const [showDesktop, setShowDesktop] = React.useState(false);

  React.useEffect(() => {
    const platform = getInstallPlatform();

    if (platform === 'android') {
      window.location.replace(PLAY_STORE_URL);
      return;
    }

    if (platform === 'ios') {
      router.replace('/');
      return;
    }

    setShowDesktop(true);
  }, [router]);

  if (!showDesktop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cod-cream font-cod text-cod-ink">
        <Loader2 className="h-8 w-8 animate-spin text-cod-tomato" />
        <p className="font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink/60">
          Finding the best way to get you the app…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cod-cream font-cod text-cod-ink">
      <header className="border-b-2 border-cod-ink bg-cod-cream">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 md:px-10">
          <Link href="/home" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border-2 border-cod-ink bg-cod-cream">
              <Image src={LOGO_URL} alt="Taxshila logo" width={36} height={36} className="h-full w-full object-contain p-0.5" />
            </div>
            <span className="font-cod text-lg font-extrabold tracking-tight text-cod-ink">TAXSHILA</span>
          </Link>
          <span className="font-cod-mono text-[10px] font-bold uppercase tracking-widest text-cod-ink/50 md:text-xs">
            Get the app
          </span>
        </div>
      </header>

      <main className="relative flex flex-1 items-center overflow-hidden bg-cod-lilac py-16 md:py-24">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cod-lilac-soft opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cod-pink opacity-50 blur-3xl" />

        <div className="relative mx-auto w-full max-w-4xl px-5 md:px-10">
          <div className="mb-12 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-cod-ink bg-cod-cream px-4 py-1.5 font-cod-mono text-[11px] font-bold uppercase tracking-widest text-cod-ink">
              <MonitorSmartphone className="h-3.5 w-3.5 text-cod-tomato" />
              You&apos;re on a computer
            </span>
          </div>

          <h1 className="font-cod text-4xl font-black leading-[0.95] tracking-tight text-cod-ink md:text-6xl">
            Take Taxshila{" "}
            <span className="font-cod-serif font-semibold italic text-cod-tomato">anywhere.</span>
          </h1>
          <p className="mt-5 max-w-xl font-cod text-lg text-cod-ink/70">
            Scan the QR code with your phone next time and we&apos;ll route you straight to the right
            place — the Play Store on Android, or the installable web app on iPhone. From here, pick
            whichever works for you.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-3xl border-2 border-cod-ink bg-cod-ink p-7 text-cod-cream shadow-[6px_6px_0_0_#1D1D1D] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#1D1D1D]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-cod-cream/40 bg-cod-cream/10">
                <GooglePlayIcon className="h-6 w-6" />
              </div>
              <h2 className="font-cod text-xl font-extrabold">Android · Google Play</h2>
              <p className="mt-2 flex-1 font-cod text-sm text-cod-cream/70">
                Install the full app from the Play Store — the best experience on Android phones and tablets.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-butter">
                Open Play Store
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </a>

            <Link
              href="/"
              className="group flex flex-col rounded-3xl border-2 border-cod-ink bg-cod-cream p-7 text-cod-ink shadow-[6px_6px_0_0_#1D1D1D] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#1D1D1D]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-cod-ink bg-cod-sage">
                <Share className="h-5 w-5 text-cod-ink" />
              </div>
              <h2 className="font-cod text-xl font-extrabold">iPhone &amp; iPad</h2>
              <p className="mt-2 flex-1 font-cod text-sm text-cod-ink/70">
                Apple doesn&apos;t allow one-tap installs. Open the web app, tap Share, then{" "}
                <span className="font-bold">Add to Home Screen</span> — it behaves just like a native app.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-tomato">
                Open the web app
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>

          <div className="mt-10">
            <Link href="/" className={cn(pillBase, "bg-transparent px-6 py-3 text-cod-ink hover:bg-cod-ink hover:text-cod-cream")}>
              Or just log in on the web
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
