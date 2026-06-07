"use client";

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Check, MapPin, Phone, Mail, ArrowRight, ArrowUpRight,
  Wifi, Wind, Armchair, Droplets, ShieldCheck,
  Sparkles, Clock, Menu, X, Star, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COVER_IMAGE_URL = '/library.jpg';
const LOGO_URL = '/logo.png';

// --- The official four-colour Google Play triangle mark ------------------
function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <path d="M47 24.5C40 28.4 36 35.9 36 45.7v420.6c0 9.8 4 17.3 11 21.2l244-231.3L47 24.5z" fill="#00D2FF" />
      <path d="M376.6 180.5L291 256l85.6 75.5 73.6-41.9c11.8-6.7 11.8-23.5 0-30.2l-73.6-78.9z" fill="#FFCE00" />
      <path d="M47 24.5L291 256l85.6-75.5L86.4 16.1C73.6 9 58.3 13.4 47 24.5z" fill="#00F076" />
      <path d="M47 487.5c11.3 11.1 26.6 15.5 39.4 8.4l290.2-164.4L291 256 47 487.5z" fill="#FF3A44" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 *  Content-On-Demand inspired landing page for Taxshila Digital Library
 *  Palette : lilac #B1ABF4 · tomato #E34135 · ink #1D1D1D
 *            cream #FAF9F5 · sage #C2E29E · pink #F6D8CE
 *  Type    : Hanken Grotesk (display) · Space Mono (labels) · Fraunces (accent)
 * ------------------------------------------------------------------ */

// --- A spinning circular-text badge, the COD "sticker" signature ---------
function CircularBadge({ className }: { className?: string }) {
  const text = "TAXSHILA • NO DISTRACTIONS • JUST DEEP FOCUS • ";
  return (
    <div className={cn("relative h-28 w-28 md:h-32 md:w-32", className)}>
      <svg viewBox="0 0 200 200" className="h-full w-full animate-cod-spin">
        <defs>
          <path
            id="cod-badge-path"
            d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"
          />
        </defs>
        <circle cx="100" cy="100" r="98" fill="#C2E29E" />
        <text className="font-cod-mono" fill="#1D1D1D" fontSize="15" fontWeight="700" letterSpacing="1">
          <textPath href="#cod-badge-path" startOffset="0">{text}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Star className="h-8 w-8 fill-cod-ink text-cod-ink" strokeWidth={1.5} />
      </div>
    </div>
  );
}

// --- A rotated sticky-note sticker ---------------------------------------
function StickyNote({
  children, className, rotate = "-rotate-6", color = "bg-cod-pink",
}: { children: React.ReactNode; className?: string; rotate?: string; color?: string }) {
  return (
    <div
      className={cn(
        "select-none rounded-2xl border-2 border-cod-ink px-4 py-3 shadow-[4px_4px_0_0_#1D1D1D]",
        color, rotate, className
      )}
    >
      {children}
    </div>
  );
}

// --- Contact dialog body (reused everywhere a CTA opens) -----------------
function ContactDialogContent() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-cod text-2xl font-extrabold text-cod-ink">Reserve your seat</DialogTitle>
        <DialogDescription className="font-cod text-cod-ink/70">
          Call or write to us and we&apos;ll get you set up. Walk-ins welcome too.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 pt-4">
        <a href="tel:+916306343791" className="flex items-center rounded-2xl border-2 border-cod-ink bg-cod-sage/40 p-4 transition-all hover:bg-cod-sage hover:shadow-[4px_4px_0_0_#1D1D1D]">
          <div className="mr-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-cod-ink bg-cod-cream">
            <Phone className="h-5 w-5 text-cod-ink" />
          </div>
          <div>
            <p className="font-cod-mono text-xs uppercase tracking-wider text-cod-ink/60">Phone</p>
            <p className="font-cod font-bold text-cod-ink">+91 63063 43791</p>
          </div>
        </a>
        <a href="mailto:taxshiladigitallibrary@gmail.com" className="flex items-center rounded-2xl border-2 border-cod-ink bg-cod-lilac/40 p-4 transition-all hover:bg-cod-lilac hover:shadow-[4px_4px_0_0_#1D1D1D]">
          <div className="mr-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-cod-ink bg-cod-cream">
            <Mail className="h-5 w-5 text-cod-ink" />
          </div>
          <div>
            <p className="font-cod-mono text-xs uppercase tracking-wider text-cod-ink/60">Email</p>
            <p className="break-all font-cod font-bold text-cod-ink">taxshiladigitallibrary@gmail.com</p>
          </div>
        </a>
        <div className="relative mt-2 h-56 w-full overflow-hidden rounded-2xl border-2 border-cod-ink">
          <iframe title="Taxshila Digital Library location" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3605.5020189959014!2d83.00187507449463!3d25.35448622531363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398e2fedc194747f%3A0x571327385a60b22f!2sTaxshila%20Digital%20Library!5e0!3m2!1sen!2sin!4v1766080131645!5m2!1sen!2sin" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </>
  );
}

// --- A little 8-bit smiley sticker, the COD "wink" -----------------------
function PixelFace({ className, color = "#FAF9F5" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" shapeRendering="crispEdges">
      <rect x="1" y="1" width="14" height="14" rx="3" fill={color} stroke="#1D1D1D" strokeWidth="1" />
      <rect x="5" y="5" width="2" height="3" fill="#1D1D1D" />
      <rect x="9" y="5" width="2" height="3" fill="#1D1D1D" />
      <rect x="4" y="10" width="1" height="1" fill="#1D1D1D" />
      <rect x="5" y="11" width="1" height="1" fill="#1D1D1D" />
      <rect x="6" y="11" width="4" height="1" fill="#1D1D1D" />
      <rect x="10" y="11" width="1" height="1" fill="#1D1D1D" />
      <rect x="11" y="10" width="1" height="1" fill="#1D1D1D" />
    </svg>
  );
}

// --- One collapsible FAQ row --------------------------------------------
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-cod-cream/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 py-5 text-left transition-colors hover:text-cod-lilac"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 text-cod-lilac transition-transform duration-300",
            open && "rotate-180"
          )}
        />
        <span className="flex-1 font-cod text-lg font-bold leading-snug text-cod-cream md:text-xl">{q}</span>
      </button>
      <div className={cn("grid transition-all duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <p className="pb-5 pl-9 font-cod leading-relaxed text-cod-cream/65">{a}</p>
        </div>
      </div>
    </div>
  );
}

// --- "Book a free demo day" panel — our creative take on a newsletter ----
function DemoDayPanel() {
  const [name, setName] = React.useState("");
  const [shift, setShift] = React.useState("");

  const waMessage = `Hello Taxshila Library, my name is ${name.trim() || "[your name]"} and I'd like to book my free demo day${shift ? ` for the ${shift} shift` : ""}.`;
  const waHref = `https://wa.me/916306343791?text=${encodeURIComponent(waMessage)}`;

  const panelNav = [
    { label: "Amenities", href: "#amenities" },
    { label: "Pricing", href: "#pricing" },
    { label: "Reviews", href: "#reviews" },
    { label: "FAQs", href: "#faqs" },
    { label: "Rules", href: "/rules" },
  ];

  const fieldClass =
    "h-12 w-full rounded-full border-2 border-cod-ink bg-cod-cream px-5 font-cod text-cod-ink placeholder:text-cod-ink/40 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-cod-tomato focus:ring-offset-2 focus:ring-offset-cod-lilac";

  return (
    <div className="rounded-[2rem] border-2 border-cod-ink bg-cod-lilac p-8 shadow-[8px_8px_0_0_#1D1D1D] md:p-12">
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        {/* Left — brand + nav + say hi */}
        <div className="flex flex-col">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {panelNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink/80 transition-colors hover:text-cod-tomato"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <h2 className="mt-7 font-cod text-3xl font-black leading-[0.95] tracking-tight text-cod-ink md:text-4xl">
            Came for the prep,{" "}
            <span className="relative inline-block">
              <span className="font-cod-serif font-semibold italic text-cod-tomato">stayed for the glow-up.</span>
              <Sparkles className="absolute -right-6 -top-3 h-5 w-5 text-cod-ink" />
            </span>
          </h2>

          <div className="mt-auto pt-8">
            <p className="mb-3 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink/60">Come, say hi</p>
            <div className="flex items-center gap-3">
              <a href="tel:+916306343791" aria-label="Call us" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-cod-ink bg-cod-cream text-cod-ink transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#1D1D1D]">
                <Phone className="h-5 w-5" />
              </a>
              <a href="mailto:taxshiladigitallibrary@gmail.com" aria-label="Email us" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-cod-ink bg-cod-cream text-cod-ink transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#1D1D1D]">
                <Mail className="h-5 w-5" />
              </a>
              <a href="https://maps.app.goo.gl/uuPLxxcGidztjttq6" target="_blank" rel="noopener noreferrer" aria-label="Find us on the map" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-cod-ink bg-cod-cream text-cod-ink transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#1D1D1D]">
                <MapPin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right — free demo day "form" that hops to WhatsApp */}
        <div className="rounded-3xl border-2 border-cod-ink bg-cod-lilac-soft/60 p-6 md:p-7">
          <p className="font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-tomato">Your first day is on us</p>
          <h3 className="mt-2 font-cod text-2xl font-extrabold leading-tight text-cod-ink">Book a free demo day</h3>
          <p className="mt-1 font-cod text-sm text-cod-ink/70">Tell us your name and when you&apos;d like to drop by — we&apos;ll keep a desk warm.</p>

          <div className="mt-5 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={fieldClass}
              aria-label="Full name"
            />
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className={cn(fieldClass, "appearance-none bg-[length:18px] bg-[right_1.25rem_center] bg-no-repeat", !shift && "text-cod-ink/40")}
              aria-label="Preferred shift"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%231D1D1D' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
            >
              <option value="">Preferred shift…</option>
              <option value="Morning">Morning · 7:00 AM–2 PM</option>
              <option value="Full Day">Full Day · 7:00 AM–9 PM</option>
              <option value="Evening">Evening · 2 PM–9 PM</option>
            </select>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(pillBase, "w-full bg-cod-tomato px-7 py-4 text-cod-cream shadow-[4px_4px_0_0_#1D1D1D] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#1D1D1D]")}
            >
              Book my free day
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-3 text-center font-cod-mono text-[10px] uppercase tracking-widest text-cod-ink/50">Opens WhatsApp · no spam, promise</p>
        </div>
      </div>
    </div>
  );
}

// --- Feature data ---------------------------------------------------------
const amenities = [
  { icon: Wifi, title: "Gigabit Wi-Fi", description: "Excitel fiber. No buffering, no excuses.", color: "bg-cod-lilac" },
  { icon: Wind, title: "Air Conditioned", description: "Fully climate-controlled, summer or not.", color: "bg-cod-sage" },
  { icon: Armchair, title: "Ergonomic Desks", description: "Wide 2.5 × 2 ft tables built for long hauls.", color: "bg-cod-pink" },
  { icon: Droplets, title: "RO Water", description: "Pure, chilled hydration on every floor.", color: "bg-cod-butter" },
  { icon: ShieldCheck, title: "24/7 CCTV", description: "Secure, monitored, locked-down peace of mind.", color: "bg-cod-lilac-soft" },
  { icon: Sparkles, title: "Spotless Space", description: "Daily-sanitised desks and a dead-quiet room.", color: "bg-cod-cream" },
];

const strip = [
  "GIGABIT WI-FI", "AIR CONDITIONED", "RO DRINKING WATER", "24/7 CCTV",
  "ERGONOMIC DESKS", "DAILY SANITISED", "POWER AT EVERY SEAT", "ZERO NOISE",
];

const audience = [
  "UPSC & State PCS aspirants",
  "NEET / JEE droppers",
  "College & university students",
  "Working professionals",
  "CA · CS · Banking prep",
];

const pricingTiers = [
  { name: "Morning", price: 600, time: "7:30 AM - 2:00 PM", description: "For early birds who do their best thinking before lunch.", highlight: false, color: "bg-cod-sage" },
  { name: "Full Day", price: 1000, time: "7:30 AM - 9:00 PM", description: "Unrestricted access for aspirants who want maximum hours.", highlight: true, color: "bg-white", tag: "Most Popular" },
  { name: "Evening", price: 600, time: "2:00 PM - 9:00 PM", description: "Ideal for students and professionals who peak after noon.", highlight: false, color: "bg-cod-pink" },
];

// Real Google reviews (lightly trimmed for length, attributed by first name).
const testimonials = [
  { quote: "A fantastic study haven! Peaceful, inspiring atmosphere with ample space, comfortable seating and excellent lighting — perfect for focused, deep work.", name: "Aniket R.", tag: "bg-cod-lilac text-cod-ink" },
  { quote: "Highly spacious tables! I love the atmosphere of the halls, unlike other libraries around my area. Absolutely loving it!", name: "Shreyash R.", tag: "bg-cod-sage text-cod-ink" },
  { quote: "This library is amazing! The desk is very large and well-organised, and the atmosphere is so peaceful and conducive to studying. Highly recommend!", name: "Nagendra P.", tag: "bg-cod-pink text-cod-ink" },
  { quote: "One of the best libraries in the Paharia region. A peaceful environment with a spacious desk is a rare combination — one of the best places for self-study.", name: "Utsav S.", tag: "bg-cod-butter text-cod-ink" },
  { quote: "Best library in Varanasi — separate girls' and boys' rows, no distractions, good ambience, and no deficiency in facilities like others.", name: "Anup S.", tag: "bg-cod-tomato text-cod-cream" },
  { quote: "Sincere appreciation for the beautiful reading room. The natural lighting and comfortable chairs make it my favourite place to study. Thank you!", name: "Prince P.", tag: "bg-cod-lilac text-cod-ink" },
];

const faqs = [
  { q: "Is there a free trial before I join?", a: "Yes — every new aspirant gets a free demo day so you can feel the space before committing. Just inform the reception when you arrive." },
  { q: "What are the timings and shifts?", a: "Morning is 7:00 AM–2:00 PM, Evening is 2:00 PM–9:00 PM, and Full Day runs 7:00 AM–9:00 PM, Monday to Saturday. Sundays are 7 AM–2 PM for all members." },
  { q: "What's included in the fee?", a: "Every seat comes with gigabit Wi-Fi, air-conditioning, RO drinking water and 24/7 CCTV — no hidden add-ons." },
  { q: "How much does a seat cost?", a: "A single shift (Morning or Evening) is ₹600/month and Full Day access is ₹1000/month. Prices may vary slightly by season." },
  { q: "Is there separate seating for girls?", a: "Yes. Girls are seated in separate rows to keep the environment comfortable and distraction-free for everyone." },
  { q: "How do I pay my fees, and what if I'm late?", a: "Pay at the reception, through Cash or UPI. Dues should be cleared within 5 days of the due date." },
  { q: "How do I reserve a seat?", a: "Tap 'Book my free day' below, call us, or simply walk in. First-time visitors should check in at the reception before sitting." },
];

// --- Shared pill button styles -------------------------------------------
const pillBase = "inline-flex items-center justify-center gap-2 rounded-full border-2 border-cod-ink font-cod-mono text-xs font-bold uppercase tracking-widest transition-all duration-200";
const pillTomato = cn(pillBase, "bg-cod-tomato text-cod-cream px-6 py-3 shadow-[4px_4px_0_0_#1D1D1D] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#1D1D1D]");
const pillSage = cn(pillBase, "bg-cod-sage text-cod-ink px-5 py-2.5 hover:bg-cod-sage-deep");
const pillGhost = cn(pillBase, "bg-transparent text-cod-ink px-6 py-3 hover:bg-cod-ink hover:text-cod-cream");

// --- Header ---------------------------------------------------------------
function CodHeader({ onContact }: { onContact: () => void }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: "Amenities", href: "#amenities" },
    { label: "Pricing", href: "#pricing" },
    { label: "Reviews", href: "#reviews" },
    { label: "FAQs", href: "#faqs" },
    { label: "Rules", href: "/rules" },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b-2 border-cod-ink bg-cod-cream py-3" : "border-b-2 border-transparent py-5"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 md:px-10">
        <Link href="/home" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border-2 border-cod-ink bg-cod-cream">
            <Image src={LOGO_URL} alt="Taxshila logo" width={36} height={36} className="h-full w-full object-contain p-0.5" />
          </div>
          <span className="font-cod text-lg font-extrabold tracking-tight text-cod-ink">
            TAXSHILA
            <span className="ml-1.5 hidden font-cod-mono text-[10px] font-normal uppercase tracking-widest text-cod-ink/60 sm:inline">
              Digital Library
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink/80 transition-colors hover:text-cod-tomato"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button onClick={onContact} className={cn(pillSage, "hidden sm:inline-flex")}>
            Contact
          </button>
          <Link href="/" className={cn(pillBase, "bg-cod-ink px-5 py-2.5 text-cod-cream hover:bg-cod-tomato")}>
            Login
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cod-ink bg-cod-cream text-cod-ink md:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mx-auto mt-3 max-w-7xl px-5 md:hidden">
          <div className="rounded-2xl border-2 border-cod-ink bg-cod-cream p-4 shadow-[4px_4px_0_0_#1D1D1D]">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 font-cod-mono text-sm font-bold uppercase tracking-widest text-cod-ink hover:bg-cod-lilac/40"
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => { setMenuOpen(false); onContact(); }}
                className="mt-1 rounded-lg px-3 py-2.5 text-left font-cod-mono text-sm font-bold uppercase tracking-widest text-cod-ink hover:bg-cod-lilac/40"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// --- Page -----------------------------------------------------------------
export default function HomePage() {
  const [contactOpen, setContactOpen] = React.useState(false);
  const openContact = React.useCallback(() => setContactOpen(true), []);

  return (
    <div className="min-h-screen bg-cod-cream font-cod text-cod-ink antialiased selection:bg-cod-tomato selection:text-cod-cream">
      <CodHeader onContact={openContact} />

      <main>
        {/* ============================== HERO ============================== */}
        <section className="relative overflow-hidden bg-cod-lilac pt-32 pb-20 md:pt-40 md:pb-28">
          {/* soft blobs */}
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cod-lilac-soft opacity-60 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cod-pink opacity-50 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 md:px-10">
            <div className="mb-7 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-cod-ink bg-cod-cream px-4 py-1.5 font-cod-mono text-[11px] font-bold uppercase tracking-widest text-cod-ink">
                <Sparkles className="h-3.5 w-3.5 fill-cod-tomato text-cod-tomato" />
                Varanasi · Admissions open 2026
              </span>
            </div>

            <div className="relative">
              <h1 className="font-cod text-[clamp(3.5rem,15vw,11rem)] font-black uppercase leading-[0.82] tracking-[-0.04em] text-cod-ink">
                Focus
                <br />
                On&nbsp;Demand
              </h1>

              {/* floating stickers */}
              <StickyNote className="absolute -top-6 right-2 hidden animate-cod-float md:block" rotate="rotate-6" color="bg-cod-cream">
                <p className="font-cod-mono text-[10px] uppercase tracking-widest text-cod-ink/60">Psst…</p>
                <p className="font-cod text-sm font-extrabold text-cod-ink">your seat<br />is waiting</p>
              </StickyNote>
              <CircularBadge className="absolute -bottom-4 right-6 hidden lg:block" />
            </div>

            <p className="mt-8 max-w-xl font-cod text-lg font-medium leading-relaxed text-cod-ink/80 md:text-xl">
              We take the chaos out of studying — premium seats, gigabit Wi-Fi and a
              dead-quiet room — so you can focus on the only thing that matters:{" "}
              <span className="font-cod-serif italic text-cod-tomato">cracking your goal.</span>
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button onClick={openContact} className={pillTomato}>
                Reserve your seat
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link href="#pricing" className={pillGhost}>
                See the shifts
              </Link>
            </div>

            {/* tilted polaroid card row */}
            <div className="mt-16 grid grid-cols-2 gap-4 md:mt-20 md:grid-cols-4 md:gap-6">
              <div className="group col-span-2 -rotate-2 overflow-hidden rounded-3xl border-2 border-cod-ink shadow-[6px_6px_0_0_#1D1D1D] transition-transform hover:rotate-0 md:col-span-2">
                <div className="relative aspect-[16/10] w-full">
                  <Image src={COVER_IMAGE_URL} alt="Inside Taxshila Digital Library" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" priority />
                  <span className="absolute bottom-3 left-3 rounded-full border-2 border-cod-ink bg-cod-cream px-3 py-1 font-cod-mono text-[10px] font-bold uppercase tracking-widest text-cod-ink">
                    The reading room
                  </span>
                </div>
              </div>

              <div className="flex rotate-2 flex-col justify-between rounded-3xl border-2 border-cod-ink bg-cod-sage p-5 shadow-[6px_6px_0_0_#1D1D1D] transition-transform hover:rotate-0">
                <p className="font-cod-mono text-[10px] font-bold uppercase tracking-widest text-cod-ink/60">Capacity</p>
                <p className="font-cod text-5xl font-black leading-none text-cod-ink">150<span className="text-cod-tomato">*</span></p>
                <p className="font-cod text-sm font-bold text-cod-ink">dedicated seats across shifts</p>
              </div>

              <div className="flex -rotate-1 flex-col justify-between rounded-3xl border-2 border-cod-ink bg-cod-tomato p-5 text-cod-cream shadow-[6px_6px_0_0_#1D1D1D] transition-transform hover:rotate-0">
                <p className="font-cod-mono text-[10px] font-bold uppercase tracking-widest text-cod-cream/70">Open daily</p>
                <p className="font-cod text-4xl font-black leading-none">14<span className="text-cod-butter"> hrs</span></p>
                <p className="font-cod text-sm font-bold">7:00 → 21:00</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================= MARQUEE STRIP ========================= */}
        <div className="overflow-hidden border-y-2 border-cod-ink bg-cod-ink py-4">
          <div className="flex w-max animate-cod-marquee">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
                {strip.map((item) => (
                  <span key={item} className="flex items-center font-cod-mono text-sm font-bold uppercase tracking-widest text-cod-cream">
                    {item}
                    <Star className="mx-5 h-3.5 w-3.5 shrink-0 fill-cod-sage text-cod-sage" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* =========================== AMENITIES =========================== */}
        <section id="amenities" className="scroll-mt-24 bg-cod-cream py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-10">
            <div className="mb-12 max-w-2xl md:mb-16">
              <p className="mb-4 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-tomato">Amenities</p>
              <h2 className="font-cod text-4xl font-black leading-[0.95] tracking-tight text-cod-ink md:text-6xl">
                Everything you need to{" "}
                <span className="font-cod-serif font-semibold italic text-cod-tomato">lock in.</span>
              </h2>
              <p className="mt-4 font-cod text-lg text-cod-ink/70">
                Premium infrastructure, obsessively maintained, so the only friction left is the syllabus.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.map((a) => (
                <div
                  key={a.title}
                  className={cn(
                    "group flex flex-col rounded-3xl border-2 border-cod-ink p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#1D1D1D]",
                    a.color
                  )}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-cod-ink bg-cod-cream transition-transform group-hover:-rotate-6">
                    <a.icon className="h-7 w-7 text-cod-ink" />
                  </div>
                  <h3 className="font-cod text-2xl font-extrabold text-cod-ink">{a.title}</h3>
                  <p className="mt-2 font-cod text-base font-medium text-cod-ink/70">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================== STAT / TOMATO ========================= */}
        <section className="border-y-2 border-cod-ink bg-cod-tomato py-20 text-cod-cream md:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2 md:px-10">
            <div>
              <p className="font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-cream/70">Every single day</p>
              <p className="mt-3 font-cod text-7xl font-black leading-none tracking-tight md:text-8xl">
                7:00<span className="text-cod-butter">→</span>21:00
              </p>
              <p className="mt-6 max-w-md font-cod text-xl font-medium leading-relaxed text-cod-cream/90">
                That&apos;s how long your seat stays yours. From first chai to last revision —{" "}
                <span className="font-cod-serif italic text-cod-butter">no clock-watching, no kicking you out (as long as you behave)</span>
              </p>
            </div>

            <div className="relative">
              <div className="rotate-2 rounded-3xl border-2 border-cod-ink bg-cod-cream p-7 text-cod-ink shadow-[8px_8px_0_0_#1D1D1D]">
                <p className="mb-5 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink/60">Who shows up here</p>
                <ul className="space-y-3.5">
                  {audience.map((who) => (
                    <li key={who} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-cod-ink bg-cod-sage">
                        <Check className="h-3.5 w-3.5 text-cod-ink" />
                      </span>
                      <span className="font-cod text-base font-semibold">{who}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============================= PRICING ============================ */}
        <section id="pricing" className="scroll-mt-24 bg-cod-lilac py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-10">
            <div className="mb-12 flex flex-col items-start justify-between gap-6 md:mb-16 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="mb-4 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-tomato">No hidden fees</p>
                <h2 className="font-cod text-4xl font-black leading-[0.95] tracking-tight text-cod-ink md:text-6xl">
                  Pick your{" "}
                  <span className="font-cod-serif font-semibold italic text-cod-tomato">shift.</span>
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-cod-ink bg-cod-cream px-4 py-2 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink">
                <Check className="h-4 w-4 text-cod-tomato" /> Wi-Fi · AC · RO water included
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={cn(
                    "relative flex flex-col rounded-3xl border-2 border-cod-ink p-7 transition-all duration-200",
                    tier.color,
                    tier.highlight
                      ? "shadow-[10px_10px_0_0_#1D1D1D] md:-translate-y-3"
                      : "shadow-[5px_5px_0_0_#1D1D1D] hover:-translate-y-1"
                  )}
                >
                  {tier.highlight && (
                    <StickyNote className="absolute -right-3 -top-4 z-10" rotate="rotate-6" color="bg-cod-sage">
                      <span className="font-cod-mono text-[10px] font-bold uppercase tracking-widest text-cod-ink">★ {tier.tag}</span>
                    </StickyNote>
                  )}
                  <h3 className="font-cod text-2xl font-extrabold text-cod-ink">{tier.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 font-cod-mono text-xs uppercase tracking-wider text-cod-ink/60">
                    <Clock className="h-3.5 w-3.5" /> {tier.time}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-cod text-2xl font-bold text-cod-ink">₹</span>
                    <span className="font-cod text-6xl font-black tracking-tighter text-cod-ink">{tier.price}</span>
                    <span className="font-cod-mono text-xs uppercase tracking-wider text-cod-ink/60">/mo</span>
                  </div>
                  <p className="mt-4 flex-1 font-cod text-sm font-medium text-cod-ink/70">{tier.description}</p>
                  <button
                    onClick={openContact}
                    className={cn(
                      pillBase, "mt-6 w-full px-6 py-3.5",
                      tier.highlight
                        ? "bg-cod-tomato text-cod-cream shadow-[4px_4px_0_0_#1D1D1D] hover:-translate-y-0.5"
                        : "bg-cod-ink text-cod-cream hover:bg-cod-tomato"
                    )}
                  >
                    Choose this shift
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================== RULES ============================= */}
        <section className="bg-cod-cream py-20 md:py-24">
          <div className="mx-auto max-w-5xl px-5 md:px-10">
            <div className="flex flex-col items-center gap-8 rounded-3xl border-2 border-cod-ink bg-cod-butter p-8 text-center shadow-[8px_8px_0_0_#1D1D1D] md:flex-row md:p-12 md:text-left">
              <div className="flex-1">
                <p className="mb-3 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink/60">House rules</p>
                <h2 className="font-cod text-3xl font-black leading-tight tracking-tight text-cod-ink md:text-4xl">
                  A quiet room only works if{" "}
                  <span className="font-cod-serif font-semibold italic">everyone&apos;s in.</span>
                </h2>
                <p className="mt-3 font-cod text-base text-cod-ink/70">
                  Two minutes of reading keeps the focus sacred for all 200 of us.
                </p>
              </div>
              <Link href="/rules" className={cn(pillTomato, "shrink-0 px-7 py-4 text-sm")}>
                Read the rules
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* =========================== TESTIMONIALS ======================== */}
        <section id="reviews" className="scroll-mt-24 overflow-hidden border-t-2 border-cod-ink bg-cod-sage py-20 md:py-28">
          <div className="mx-auto mb-12 max-w-7xl px-5 md:mb-16 md:px-10">
            <p className="mb-4 text-center font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-ink/60">
              4.7★ on Google · 60+ reviews
            </p>
            <h2 className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center font-cod text-4xl font-black leading-[0.95] tracking-tight text-cod-ink md:text-6xl">
              Praises? We&apos;ve collected a few
              <PixelFace className="h-10 w-10 md:h-14 md:w-14" />
            </h2>
          </div>

          <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 md:px-10 [-ms-overflow-style:none] [scrollbar-width:none]">
            {testimonials.map((t, i) => (
              <figure
                key={i}
                className="flex w-[290px] shrink-0 snap-center flex-col rounded-3xl border-2 border-cod-ink bg-cod-ink p-7 shadow-[6px_6px_0_0_#1D1D1D] md:w-[380px]"
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-cod-butter text-cod-butter" />
                  ))}
                </div>
                <blockquote className="flex-1 font-cod-mono text-sm leading-relaxed text-cod-cream/90 md:text-[15px]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption
                  className={cn(
                    "mt-6 inline-flex w-fit -rotate-2 items-center rounded-md border-2 border-cod-ink px-3 py-1 font-cod-mono text-[10px] font-bold uppercase tracking-wider",
                    t.tag
                  )}
                >
                  — {t.name}, Google review
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-6 text-center font-cod-mono text-[10px] uppercase tracking-widest text-cod-ink/45 md:hidden">
            ← Swipe for more →
          </p>
        </section>

        {/* ============================ GET THE APP ========================= */}
        <section className="border-t-2 border-cod-ink bg-cod-lilac py-20 md:py-24">
          <div className="mx-auto max-w-4xl px-5 text-center md:px-10">
            <h2 className="font-cod text-4xl font-black leading-[0.95] tracking-tight text-cod-ink md:text-5xl">
              Take Taxshila{" "}
              <span className="font-cod-serif font-semibold italic text-cod-tomato">anywhere.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-cod text-lg text-cod-ink/70">
              Track attendance, pay fees and check your seat from the Companion app — on Google Play or as a web app on any device.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="https://play.google.com/store/apps/details?id=co.median.android.yeeemel&pcampaignid=web_share"
                target="_blank" rel="noopener noreferrer"
                className="flex h-[60px] w-[230px] items-center justify-center gap-3 rounded-full border-2 border-cod-ink bg-cod-ink px-5 text-cod-cream transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1D1D1D]"
              >
                <GooglePlayIcon className="h-7 w-7" />
                <div className="text-left">
                  <span className="block font-cod-mono text-[10px] uppercase tracking-widest text-cod-cream/70">Get it on</span>
                  <span className="font-cod text-lg font-bold leading-none">Google Play</span>
                </div>
              </a>
              <Link
                href="/"
                className="flex h-[60px] w-[230px] items-center justify-center gap-3 rounded-full border-2 border-cod-ink bg-cod-cream px-5 text-cod-ink transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1D1D1D]"
              >
                <Image src={LOGO_URL} alt="" width={32} height={32} className="object-contain" />
                <div className="text-left">
                  <span className="block font-cod-mono text-[10px] uppercase tracking-widest text-cod-ink/60">Open the</span>
                  <span className="font-cod text-lg font-bold leading-none">Web App</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ========================= FREE DEMO DAY ========================= */}
        <section className="border-t-2 border-cod-ink bg-cod-cream py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-10">
            <DemoDayPanel />
          </div>
        </section>

        {/* =============================== FAQ ============================== */}
        <section id="faqs" className="scroll-mt-24 border-t-2 border-cod-ink bg-cod-ink py-20 text-cod-cream md:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-[0.85fr_1.15fr] md:gap-16 md:px-10">
            <div>
              <p className="mb-4 font-cod-mono text-xs font-bold uppercase tracking-widest text-cod-sage">FAQs</p>
              <h2 className="flex flex-wrap items-center gap-x-4 gap-y-2 font-cod text-4xl font-black leading-[0.95] tracking-tight md:text-5xl">
                Have more questions? We&apos;ve got you!
                <PixelFace className="h-10 w-10" color="#B1ABF4" />
              </h2>
              <p className="mt-5 max-w-sm font-cod text-cod-cream/55">
                Still unsure about something? Call the desk on{" "}
                <a href="tel:+916306343791" className="font-bold text-cod-cream underline decoration-cod-tomato decoration-2 underline-offset-4">+91 63063 43791</a>{" "}
                — real humans, quick answers.
              </p>
            </div>
            <div className="border-t border-cod-cream/20">
              {faqs.map((f, i) => (
                <FaqItem key={i} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ====================== MARQUEE STRIP (repeat) =================== */}
        <div className="overflow-hidden border-y-2 border-cod-cream/20 bg-cod-tomato py-4">
          <div className="flex w-max animate-cod-marquee">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
                {strip.map((item) => (
                  <span key={item} className="flex items-center font-cod-mono text-sm font-bold uppercase tracking-widest text-cod-cream">
                    {item}
                    <Star className="mx-5 h-3.5 w-3.5 shrink-0 fill-cod-cream text-cod-cream" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ============================== FOOTER =========================== */}
        <footer className="border-t-2 border-cod-ink bg-cod-ink py-16 text-cod-cream">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-2 md:px-10">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-cod-cream/30 bg-cod-cream/5">
                  <Image src={LOGO_URL} alt="Taxshila logo" width={32} height={32} className="object-contain" />
                </div>
                <div>
                  <span className="block font-cod text-2xl font-black tracking-tight">TAXSHILA</span>
                  <span className="font-cod-mono text-[10px] uppercase tracking-widest text-cod-cream/50">Digital Library · Varanasi</span>
                </div>
              </div>

              <div className="space-y-4">
                <a href="https://www.google.com/maps/place/Taxshila+Digital+Library/@25.3544862,83.0018751,17z" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-cod-cream/70 transition-colors hover:text-cod-cream">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cod-sage" />
                  <p className="font-cod text-sm leading-relaxed">Plot-79, Agrasen Nagar Colony, Paharia, Varanasi, Uttar Pradesh 221007</p>
                </a>
                <a href="tel:+916306343791" className="flex items-center gap-3 text-cod-cream/70 transition-colors hover:text-cod-cream">
                  <Phone className="h-5 w-5 shrink-0 text-cod-sage" />
                  <p className="font-cod text-sm">+91 63063 43791</p>
                </a>
                <a href="mailto:taxshiladigitallibrary@gmail.com" className="flex items-center gap-3 text-cod-cream/70 transition-colors hover:text-cod-cream">
                  <Mail className="h-5 w-5 shrink-0 text-cod-sage" />
                  <p className="break-all font-cod text-sm">taxshiladigitallibrary@gmail.com</p>
                </a>
              </div>

              <button onClick={openContact} className={cn(pillBase, "bg-cod-tomato px-6 py-3 text-cod-cream hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#FAF9F5]")}>
                Get in touch
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <div className="space-y-3 border-t border-cod-cream/15 pt-6 font-cod-mono text-xs text-cod-cream/50">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <p>© {new Date().getFullYear()} Taxshila Digital Library</p>
                  <Link href="/privacy_policy" className="uppercase tracking-widest transition-colors hover:text-cod-cream">Privacy Policy</Link>
                </div>
                <p>
                  Website by{" "}
                  <a
                    href="https://github.com/ItsMat78"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-cod-cream/80 underline decoration-cod-tomato decoration-2 underline-offset-4 transition-colors hover:text-cod-cream"
                  >
                    Shreyash Rai · @ItsMat78
                  </a>
                </p>
              </div>
            </div>

            <div className="relative h-72 w-full overflow-hidden rounded-3xl border-2 border-cod-cream/20 md:h-full">
              <iframe title="Taxshila Digital Library map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3605.5020189959014!2d83.00187507449463!3d25.35448622531363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398e2fedc194747f%3A0x571327385a60b22f!2sTaxshila%20Digital%20Library!5e0!3m2!1sen!2sin!4v1766080131645!5m2!1sen!2sin" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
            </div>
          </div>
        </footer>
      </main>

      {/* Single controlled contact dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="border-2 border-cod-ink bg-cod-cream">
          <ContactDialogContent />
        </DialogContent>
      </Dialog>
    </div>
  );
}
