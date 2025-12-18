
"use client";

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, MapPin, Phone, Mail, ArrowRight, Wifi, Wind, Thermometer, Droplets, ShieldCheck, UserCircle, Locate, Loader2 } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { getFeeStructureForHomepage, type FeeStructure } from '@/services/student-service';
import { cn } from '@/lib/utils';

const COVER_IMAGE_URL = '/cover.png';
const LOGO_URL = '/logo.png';

// --- Header Component ---
function HomePageHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/home" className="mr-6 flex items-center space-x-2">
             <Image
                src={LOGO_URL}
                alt="Taxshila Companion Logo"
                width={32}
                height={32}
                className="h-8 w-auto object-contain"
              />
            <span className="font-bold text-lg ml-2">Taxshila Companion</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Contact Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost">Contact</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Contact Us</DialogTitle>
                <DialogDescription>
                  We're here to help. Reach out to us with any questions.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <span>+91 9450953683</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <span>taxshilacompanion@gmail.com</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Locate Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost">Locate</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Our Location</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                  <span>
                    3rd Floor, Near Taksal, Opp. Kanya Pathshala, Main Road, Naya Bazar, Lakhimpur-Kheri, 262701
                  </span>
                </div>
                <div className="relative h-48 md:h-64 w-full rounded-lg overflow-hidden shadow-inner border">
                   <Image
                      src={placeholderImages.homePage.map.src}
                      alt={placeholderImages.homePage.map.alt}
                      fill
                      className="object-cover"
                      data-ai-hint={placeholderImages.homePage.map.aiHint}
                    />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Login Button */}
          <Link href="/login" passHref>
            <Button>
              <UserCircle className="mr-2 h-4 w-4"/>
              Login
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

const featureList = [
  {
    icon: Wifi,
    title: "High-Speed Wi-Fi",
    description: "Seamless internet access for research and online learning."
  },
  {
    icon: Wind,
    title: "Air-Conditioned",
    description: "A comfortable and cool environment, no matter the weather outside."
  },
  {
    icon: Thermometer,
    title: "Comfortable Seating",
    description: "Ergonomic chairs and spacious desks for long study sessions."
  },
  {
    icon: Droplets,
    title: "Purified Drinking Water",
    description: "Stay hydrated with clean and safe drinking water available."
  },
  {
    icon: ShieldCheck,
    title: "24/7 Security",
    description: "A safe and secure environment with constant surveillance."
  }
];

const shiftVectors = {
    morning: (
        <svg viewBox="0 0 100 60" className="w-full h-auto object-cover" preserveAspectRatio="xMidYMid slice">
          <path d="M-5,65 l25,-20 l15,10 l25,-20 l15,10 l25,-20 v25 h-105 z" fill="hsl(var(--primary)/0.1)" />
          <path d="M-5,65 l30,-25 l15,10 l20,-15 l15,10 l25,-20 v25 h-105 z" fill="hsl(var(--primary)/0.2)" />
          <circle cx="80" cy="15" r="8" fill="hsl(var(--accent))" />
        </svg>
      ),
      evening: (
        <svg viewBox="0 0 100 60" className="w-full h-auto object-cover" preserveAspectRatio="xMidYMid slice">
          <path d="M-5,65 l15,-40 l15,40 z" fill="hsl(var(--primary)/0.1)" />
          <path d="M15,65 l15,-35 l15,35 z" fill="hsl(var(--primary)/0.2)" />
          <path d="M35,65 l15,-45 l15,45 z" fill="hsl(var(--primary)/0.15)" />
          <circle cx="85" cy="15" r="8" fill="hsl(var(--background))" />
          <circle cx="20" cy="10" r="1.5" fill="hsl(var(--background))" />
          <circle cx="45" cy="20" r="1" fill="hsl(var(--background))" />
        </svg>
      ),
      fullday: (
         <svg viewBox="0 0 100 60" className="w-full h-auto object-cover" preserveAspectRatio="xMidYMid slice">
          <path d="M-5,35 C30,50 70,50 105,35 V65 H-5 z" fill="hsl(var(--accent)/0.1)" />
          <path d="M-5,40 C30,55 70,55 105,40 V65 H-5 z" fill="hsl(var(--accent)/0.2)" />
          <circle cx="20" cy="20" r="10" fill="hsl(var(--primary))" />
        </svg>
      ),
}

export default function HomePage() {
  const [feeStructure, setFeeStructure] = React.useState<FeeStructure | null>(null);
  const [isLoadingFees, setIsLoadingFees] = React.useState(true);
  
  React.useEffect(() => {
    async function fetchFees() {
      try {
        const fees = await getFeeStructureForHomepage();
        setFeeStructure(fees);
      } catch (error) {
        console.error("Failed to fetch fee structure for homepage:", error);
      } finally {
        setIsLoadingFees(false);
      }
    }
    fetchFees();
  }, []);

  const pricingTiers = feeStructure ? [
    {
        name: "Morning Shift",
        price: `Rs. ${feeStructure.morningFee}`,
        period: "/ month",
        description: "Ideal for early birds who are most productive in the morning.",
        features: ["7 AM - 2 PM access", "All standard amenities included"],
        vector: shiftVectors.morning,
        gradient: 'from-orange-50 to-sky-100 dark:from-orange-900/10 dark:to-sky-900/20'
    },
    {
        name: "Evening Shift",
        price: `Rs. ${feeStructure.eveningFee}`,
        period: "/ month",
        description: "Perfect for students and professionals working late.",
        features: ["2 PM - 9:30 PM access", "All standard amenities included"],
        vector: shiftVectors.evening,
        gradient: 'from-indigo-100 to-slate-200 dark:from-indigo-900/20 dark:to-slate-900/30'
    },
    {
        name: "Full Day",
        price: `Rs. ${feeStructure.fullDayFee}`,
        period: "/ month",
        description: "For the most dedicated, providing access throughout the day.",
        features: ["7 AM - 9:30 PM access", "All standard amenities included", "Priority seat selection"],
        vector: shiftVectors.fullday,
        gradient: 'from-yellow-50 to-amber-100 dark:from-yellow-900/10 dark:to-amber-900/20'
    }
  ] : [];

  return (
    <div className="bg-background text-foreground">
      <HomePageHeader />

      {/* Hero Section */}
       <section className="relative h-[60vh] min-h-[400px] w-full flex items-center justify-center text-center text-white overflow-hidden">
        <Image
          src={COVER_IMAGE_URL}
          alt="A modern and quiet library interior, perfect for studying."
          fill
          className="object-cover"
          data-ai-hint="library interior"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 p-4 max-w-4xl flex flex-col md:flex-row items-center gap-8 text-left">
          <Image
            src={LOGO_URL}
            alt="Taxshila Companion Logo"
            width={160}
            height={160}
            className="h-32 w-auto sm:h-40 object-contain drop-shadow-lg flex-shrink-0"
            data-ai-hint="logo brand"
          />
          <div>
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight drop-shadow-md">
              Your Modern Study Sanctuary
            </h1>
            <p className="mt-4 text-lg md:text-xl text-white/90 drop-shadow-sm">
              Discover a peaceful, well-equipped space designed to help you focus, learn, and achieve your academic goals.
            </p>
            <Link href="/login" passHref>
              <Button size="lg" className="mt-6 text-lg">
                Join Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 md:py-20">
        {/* Features Section */}
        <section id="features" className="mb-16 md:mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold">Why Choose Taxshila?</h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              We provide everything you need for an uninterrupted and productive study session.
            </p>
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {featureList.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold font-headline">{feature.title}</h3>
                    <p className="text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* Pricing Section */}
        <section id="pricing" className="mb-16 md:mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold">Membership Plans</h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Choose a plan that fits your schedule. Simple, affordable, and flexible.
            </p>
          </div>
          {isLoadingFees ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {pricingTiers.map((tier) => (
                <Card key={tier.name} className="overflow-hidden flex flex-col shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className={cn("relative p-4 h-24 w-full", tier.gradient)}>
                        {tier.vector}
                    </div>
                    <div className="p-6 flex flex-col flex-grow bg-card">
                        <CardHeader className="p-0">
                            <CardTitle className="text-2xl text-foreground">{tier.name}</CardTitle>
                            <div className="flex items-baseline">
                                <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                                <span className="ml-1 text-muted-foreground">{tier.period}</span>
                            </div>
                            <CardDescription className="pt-2 min-h-[40px]">{tier.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 pt-6 flex-grow">
                            <ul className="space-y-2">
                                {tier.features.map((feature) => (
                                <li key={feature} className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                    <span className="text-muted-foreground">{feature}</span>
                                </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter className="p-0 pt-6 mt-auto">
                            <Link href="/login" passHref className="w-full">
                                <Button className="w-full">Select Plan</Button>
                            </Link>
                        </CardFooter>
                    </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Gallery Section */}
        <section id="gallery" className="mb-16 md:mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold">Our Space</h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              A glimpse into the environment we've created for focused learning.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {placeholderImages.homePage.gallery.map((img) => (
              <div key={img.src} className="relative aspect-square rounded-lg overflow-hidden shadow-lg group">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  data-ai-hint={img.aiHint}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Contact/Location Section */}
        <section id="contact" className="bg-muted p-8 rounded-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-headline font-semibold">Visit Us</h2>
              <p className="mt-2 text-muted-foreground">
                Ready to start? Find us at the location below or get in touch with us.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                  <span>
                    3rd Floor, Near Taksal, Opp. Kanya Pathshala, Main Road, Naya Bazar, Lakhimpur-Kheri, 262701
                  </span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <span>+91 9450953683</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <span>taxshilacompanion@gmail.com</span>
                </div>
              </div>
            </div>
            <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden shadow-xl">
              <Image
                src={placeholderImages.homePage.map.src}
                alt={placeholderImages.homePage.map.alt}
                fill
                className="object-cover"
                data-ai-hint={placeholderImages.homePage.map.aiHint}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Taxshila Companion. All rights reserved.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <Link href="/login/admin" className="hover:text-primary">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
