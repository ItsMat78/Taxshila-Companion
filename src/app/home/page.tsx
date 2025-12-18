
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';

const featureList = [
  "High-Speed Wi-Fi",
  "Comfortable Seating",
  "Fully Air-Conditioned",
  "Dedicated Discussion Area",
  "Daily Newspaper & Magazines",
  "Locker Facility",
  "Purified Drinking Water",
  "24/7 Security"
];

const pricingTiers = [
  {
    name: "Morning Shift",
    price: "₹600",
    period: "/ month",
    description: "Ideal for early birds who are most productive in the morning.",
    features: ["7 AM - 2 PM access", "All standard amenities included"],
  },
  {
    name: "Evening Shift",
    price: "₹600",
    period: "/ month",
    description: "Perfect for students and professionals working late.",
    features: ["2 PM - 9:30 PM access", "All standard amenities included"],
  },
  {
    name: "Full Day",
    price: "₹1000",
    period: "/ month",
    description: "For the most dedicated, providing access throughout the day.",
    features: ["7 AM - 9:30 PM access", "All standard amenities included", "Priority seat selection"],
  }
];

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] w-full flex items-center justify-center text-center text-white overflow-hidden">
        <Image
          src={placeholderImages.homePage.hero.src}
          alt={placeholderImages.homePage.hero.alt}
          fill
          className="object-cover"
          data-ai-hint={placeholderImages.homePage.hero.aiHint}
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 p-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight drop-shadow-md">
            Your Modern Study Sanctuary
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-xl mx-auto text-white/90 drop-shadow-sm">
            Discover a peaceful, well-equipped space designed to help you focus, learn, and achieve your academic goals.
          </p>
          <Link href="/login" passHref>
            <Button size="lg" className="mt-8 text-lg">
              Join Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {featureList.map((feature, index) => (
              <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-3">
                    <Check className="h-6 w-6" />
                  </div>
                  <p className="font-semibold text-sm sm:text-base">{feature}</p>
                </CardContent>
              </Card>
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <Card key={tier.name} className="flex flex-col shadow-lg hover:scale-105 transition-transform duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="ml-1 text-muted-foreground">{tier.period}</span>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-2">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Select Plan</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
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
            <Link href="/login" className="hover:text-primary">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
