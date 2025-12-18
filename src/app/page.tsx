
"use client";

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, MapPin, Phone, Mail, ArrowRight, Wifi, Wind, Thermometer, Droplets, ShieldCheck, UserCircle, Loader2 } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { getFeeStructureForHomepage, type FeeStructure } from '@/services/student-service';
import { cn } from '@/lib/utils';

const COVER_IMAGE_URL = '/cover.png';
const LOGO_URL = '/logo.png';

// --- Header Component ---
function HomePageHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/home" className="flex items-center space-x-2">
          <Image
            src={LOGO_URL}
            alt="Taxshila Companion Logo"
            width={32}
            height={32}
            className="h-8 w-auto object-contain"
          />
          <span className="font-bold text-lg hidden sm:inline-block">Taxshila Companion</span>
        </Link>
        <div className="flex items-center space-x-1 sm:space-x-2">
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
              </div>
            </DialogContent>
          </Dialog>

          <Link href="/login" passHref>
            <Button>
              <UserCircle className="mr-2 h-4 w-4" />
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
        gradient: 'from-orange-50 to-sky-100 dark:from-orange-900/10 dark:to-sky-900/20'
    },
    {
        name: "Evening Shift",
        price: `Rs. ${feeStructure.eveningFee}`,
        period: "/ month",
        description: "Perfect for students and professionals working late.",
        features: ["2 PM - 9:30 PM access", "All standard amenities included"],
        gradient: 'from-indigo-100 to-slate-200 dark:from-indigo-900/20 dark:to-slate-900/30'
    },
    {
        name: "Full Day",
        price: `Rs. ${feeStructure.fullDayFee}`,
        period: "/ month",
        description: "For the most dedicated, providing access throughout the day.",
        features: ["7 AM - 9:30 PM access", "All standard amenities included", "Priority seat selection"],
        gradient: 'from-yellow-50 to-amber-100 dark:from-yellow-900/10 dark:to-amber-900/20'
    }
  ] : [];

  return (
    <div className="bg-background text-foreground">
      <HomePageHeader />

      <main>
        {/* Hero Section */}
        <section className="relative h-[60vh] min-h-[400px] w-full flex items-center justify-center text-center text-white">
          <Image
            src={COVER_IMAGE_URL}
            alt="A modern and quiet library interior, perfect for studying."
            fill
            className="object-cover"
            data-ai-hint="library interior"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 p-4 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight drop-shadow-md">
              Your Modern Study Sanctuary
            </h1>
            <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-sm">
              Discover a peaceful, well-equipped space designed to help you focus, learn, and achieve your academic goals.
            </p>
            <Link href="/login" passHref>
              <Button size="lg" className="mt-8 text-lg">
                Join Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16 md:py-24 space-y-16 md:space-y-24">
          {/* Why Choose Us Section */}
          <section id="features">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-semibold">Why Choose Taxshila?</h2>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                We provide everything you need for an uninterrupted and productive study session.
              </p>
            </div>
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featureList.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="text-center shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                        <Icon className="h-8 w-8" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Shifts and Prices Section */}
          <section id="pricing">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-semibold">Membership Plans</h2>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
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
                  <Card key={tier.name} className="flex flex-col overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className={cn("p-8 flex flex-col flex-grow bg-gradient-to-br", tier.gradient)}>
                      <h3 className="text-2xl font-bold font-headline">{tier.name}</h3>
                      <div className="mt-4 flex items-baseline">
                          <span className="text-5xl font-bold tracking-tight">{tier.price}</span>
                          <span className="ml-1 text-xl font-semibold text-muted-foreground">{tier.period}</span>
                      </div>
                      <p className="mt-6 text-muted-foreground">{tier.description}</p>
                    </div>
                    <div className="p-8 bg-card flex flex-col flex-grow">
                      <ul role="list" className="space-y-4 mb-8 flex-grow">
                          {tier.features.map((feature) => (
                          <li key={feature} className="flex items-center">
                              <Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0" />
                              <span>{feature}</span>
                          </li>
                          ))}
                      </ul>
                      <Link href="/login" passHref className="w-full mt-auto">
                          <Button className="w-full" size="lg">Select Plan</Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Locate Section */}
          <section id="locate">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center bg-muted p-8 md:p-12 rounded-lg">
              <div>
                <h2 className="text-3xl font-headline font-semibold">Visit Us</h2>
                <p className="mt-3 text-lg text-muted-foreground">
                  Ready to start? Find us at the location below or get in touch.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start">
                    <MapPin className="h-6 w-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Address</h4>
                      <p className="text-muted-foreground">
                        3rd Floor, Near Taksal, Opp. Kanya Pathshala, Main Road, Naya Bazar, Lakhimpur-Kheri, 262701
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className="h-6 w-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Phone</h4>
                      <p className="text-muted-foreground">+91 9450953683</p>
                    </div>
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

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Taxshila Companion. All rights reserved.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <Link href="/login/admin" className="hover:text-primary">Admin Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
