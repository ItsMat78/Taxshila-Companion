"use client";

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, Volume2, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const libraryRules = [
  "Library Timings 7am to 2pm (Morning shift) & 2pm to 9:30 pm (Evening shift) through Monday to Saturday.",
  "Timings for sunday are 7am to 2pm only, and members from any shift are allowed to come before this time.",
  "Attendance is mandatory. Fill out your own attendance only.",
  "Girls will be seated separately.",
  "Single Shift fee Rs. 600. Both Shifts fee Rs. 1000. Subjected to change according to season.",
  "Demo will be given only for 1 day.",
  "Remove shoes outside on the shoe rack. Do not litter.",
  "Payment of fee due shall be made within 5 days after due date.",
  "First time visitors are prohibited from sitting in the library without informing at the reception.",
  "Maintain silence in all study areas. Mobile phones should be on silent mode.",
  "Adhere to your allocated shift timings to ensure fair access for all members.",
  "Misconduct or violation of library rules may result in suspension of membership.",
  "Report any issues or concerns to the library staff immediately or through the feedback option in the app.",
];

// Accent palette cycled across the numbered rule badges for that sticker-book feel.
const accentCycle = [
  "bg-cod-tomato text-cod-cream",
  "bg-cod-sage text-cod-ink",
  "bg-cod-lilac text-cod-ink",
  "bg-cod-butter text-cod-ink",
  "bg-cod-pink text-cod-ink",
];

const cardTilt = ["md:-rotate-1", "md:rotate-1", "md:rotate-0"];

const pillBase =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-cod-ink font-cod-mono text-xs font-bold uppercase tracking-widest transition-all duration-200";

export default function RulesPage() {
  const { user } = useAuth();

  const getBackPath = () => {
    if (!user) return "/home";
    if (user.role === 'admin') return "/admin/dashboard";
    return "/member/dashboard";
  };

  return (
    <div className="min-h-screen bg-cod-cream font-cod text-cod-ink">
      {/* ---------------------------- TOP BAR --------------------------- */}
      <header className="sticky top-0 z-30 border-b-2 border-cod-ink bg-cod-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-10">
          <Link
            href={getBackPath()}
            className={cn(pillBase, "bg-cod-cream px-5 py-2.5 text-cod-ink hover:bg-cod-ink hover:text-cod-cream")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="font-cod-mono text-[10px] font-bold uppercase tracking-widest text-cod-ink/50 md:text-xs">
            Taxshila · House Rules
          </span>
        </div>
      </header>

      {/* ----------------------------- HERO ----------------------------- */}
      <section className="relative overflow-hidden border-b-2 border-cod-ink bg-cod-lilac py-16 md:py-24">
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-cod-lilac-soft opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-cod-pink opacity-50 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-5 md:px-10">
          <p className="mb-4 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-tomato">
            Read before you sit
          </p>
          <h1 className="font-cod text-5xl font-black leading-[0.92] tracking-tight text-cod-ink md:text-7xl">
            The Code of{" "}
            <span className="font-cod-serif font-semibold italic text-cod-tomato">Conduct.</span>
          </h1>
          <p className="mt-6 max-w-2xl font-cod text-lg text-cod-ink/70 md:text-xl">
            A quiet, fair, focused room only works when all 200 of us are in. Here is everything
            you agreed to when you joined the library.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-cod-ink bg-cod-cream px-4 py-2 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink">
              <Clock className="h-4 w-4 text-cod-tomato" /> Mon–Sat · 7AM–9:30PM
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-cod-ink bg-cod-cream px-4 py-2 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink">
              <Volume2 className="h-4 w-4 text-cod-tomato" /> Pin-drop silence
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-cod-ink bg-cod-cream px-4 py-2 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink">
              <ShieldCheck className="h-4 w-4 text-cod-tomato" /> 24/7 monitored
            </span>
          </div>
        </div>
      </section>

      {/* ----------------------------- RULES ---------------------------- */}
      <section className="bg-cod-cream py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-5 md:px-10">
          <div className="mb-10 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-cod-tomato" />
            <h2 className="font-cod text-2xl font-black tracking-tight text-cod-ink md:text-3xl">
              The thirteen rules
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {libraryRules.map((rule, index) => (
              <div
                key={index}
                className={cn(
                  "group flex items-start gap-4 rounded-2xl border-2 border-cod-ink bg-white p-5 transition-all duration-200",
                  "shadow-[5px_5px_0_0_#1D1D1D] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#1D1D1D]",
                  cardTilt[index % cardTilt.length],
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-cod-ink font-cod text-lg font-black",
                    accentCycle[index % accentCycle.length],
                  )}
                >
                  {index + 1}
                </div>
                <p className="pt-1 font-cod text-[15px] font-medium leading-relaxed text-cod-ink/85">
                  {rule}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- BOTTOM CTA -------------------------- */}
      <section className="bg-cod-cream pb-20 md:pb-28">
        <div className="mx-auto max-w-5xl px-5 md:px-10">
          <div className="flex flex-col items-center gap-6 rounded-3xl border-2 border-cod-ink bg-cod-butter p-8 text-center shadow-[8px_8px_0_0_#1D1D1D] md:flex-row md:justify-between md:p-12 md:text-left">
            <div className="max-w-xl">
              <p className="mb-3 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink/60">
                Questions?
              </p>
              <h2 className="font-cod text-3xl font-black leading-tight tracking-tight text-cod-ink md:text-4xl">
                Anything unclear, just{" "}
                <span className="font-cod-serif font-semibold italic">ask the desk.</span>
              </h2>
              <p className="mt-3 font-cod text-base text-cod-ink/70">
                The reception team is happy to walk you through any of these before your first sit-down.
              </p>
            </div>
            <Link
              href={getBackPath()}
              className={cn(pillBase, "shrink-0 bg-cod-tomato px-7 py-4 text-sm text-cod-cream shadow-[4px_4px_0_0_#1D1D1D] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#1D1D1D]")}
            >
              Got it, take me back
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
