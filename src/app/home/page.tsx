
"use client";

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Check, MapPin, Phone, Mail, ArrowRight, 
  Wifi, Wind, Thermometer, Droplets, ShieldCheck, 
  UserCircle, Sparkles, Clock, Crown
} from 'lucide-react';
import { getFeeStructureForHomepage, type FeeStructure } from '@/services/student-service';
import { cn } from '@/lib/utils';

const COVER_IMAGE_URL = '/cover.png';
const LOGO_URL = '/logo.png';


function ContactDialogContent() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Get in Touch</DialogTitle>
        <DialogDescription>
          We're here to help. Reach out to us or visit us at our location.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-4">
        <a href="tel:+919123520131" className="flex items-center p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p className="font-semibold">+91 9123520131</p>
          </div>
        </a>
        <a href="mailto:taxshiladigitallibrary@gmail.com" className="flex items-center p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="font-semibold">taxshiladigitallibrary@gmail.com</p>
          </div>
        </a>
        <div className="relative h-64 w-full rounded-2xl overflow-hidden transition-all duration-500 border border-border shadow-inner group mt-4">
          <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3605.5020189959014!2d83.00187507449463!3d25.35448622531363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398e2fedc194747f%3A0x571327385a60b22f!2sTaxshila%20Digital%20Library!5e0!3m2!1sen!2sin!4v1766080131645!5m2!1sen!2sin" width="100%" height="100%" style={{border:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors" />
          <div className="absolute bottom-3 right-3">
             <a href="https://www.google.com/maps/place/Taxshila+Digital+Library/@25.3544862,83.0018751,17z/data=!3m1!4b1!4m6!3m5!1s0x398e2fedc194747f:0x571327385a60b22f!8m2!3d25.3544814!4d83.0044447!16s%2Fg%2F11fyb_x1g9?entry=ttu" target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="backdrop-blur-md bg-white/10 border border-white/30 text-white hover:bg-white hover:text-black transition-all">
                    Get Directions
                </Button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}


function ModernHeader() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-background/80 backdrop-blur-xl border-b py-3 shadow-sm" : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between max-w-7xl">
        <Link href="/home" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-1.5 transition-transform group-hover:scale-105 backdrop-blur-sm border border-white/10 shadow-inner">
            <Image
              src={LOGO_URL}
              alt="Taxshila Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <span className={cn(
            "font-bold text-xl tracking-tight transition-colors hidden sm:inline-block",
            scrolled ? "text-foreground" : "text-white drop-shadow-md"
          )}>
            Taxshila Digital Library
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "hover:bg-white/10 transition-colors font-medium text-sm sm:text-base", 
                  !scrolled && "text-white hover:text-white"
                )}
              >
                Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ContactDialogContent />
            </DialogContent>
          </Dialog>

          <Link href="/" passHref>
            <Button className="rounded-full px-4 sm:px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 font-semibold text-sm sm:text-base">
              Login
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

const featureList = [
  {
    icon: Wifi,
    title: "Gigabit Wi-Fi",
    description: "Fiber-optic speeds.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-500",
    border: "border-violet-200/50"
  },
  {
    icon: Wind,
    title: "Climate Control",
    description: "Always cool.",
    gradient: "from-cyan-500/20 to-blue-500/20",
    iconColor: "text-cyan-500",
    border: "border-cyan-200/50"
  },
  {
    icon: Thermometer,
    title: "Ergonomic",
    description: "Premium seating.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
    border: "border-amber-200/50"
  },
  {
    icon: Droplets,
    title: "RO Water",
    description: "Pure hydration.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
    border: "border-emerald-200/50"
  },
  {
    icon: ShieldCheck,
    title: "Secure",
    description: "24/7 CCTV.",
    gradient: "from-slate-500/20 to-gray-500/20",
    iconColor: "text-slate-500",
    border: "border-slate-200/50"
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
        console.error("Failed to fetch fee structure:", error);
      } finally {
        setIsLoadingFees(false);
      }
    }
    fetchFees();
  }, []);
  
  const pricingTiers = feeStructure ? [
    {
      name: "Morning",
      price: feeStructure.morningFee,
      time: "7:00 AM - 2:00 PM",
      description: "Perfect for early birds who are most productive at the start of the day.",
      highlight: false,
    },
    {
      name: "Full Day",
      price: feeStructure.fullDayFee,
      time: "7:00 AM - 9:30 PM",
      description: "Unrestricted access for dedicated aspirants who need maximum study time.",
      highlight: true,
      tag: "Most Popular",
    },
    {
      name: "Evening",
      price: feeStructure.eveningFee,
      time: "2:00 PM - 9:30 PM",
      description: "Ideal for students and professionals who study best in the later hours.",
      highlight: false,
    }
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <ModernHeader />

      <main className="relative flex-1">
        {/* --- Hero Section --- */}
        <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src={COVER_IMAGE_URL}
              alt="Library Interior"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-40" />
          </div>
          <div className="container relative z-10 px-6 md:px-12 lg:px-20 max-w-7xl pt-24 md:pt-24">
            <div className="max-w-3xl">
              <Badge 
                variant="outline" 
                className="mb-6 px-4 py-1.5 text-sm bg-white/5 text-white hover:bg-white/10 backdrop-blur-md border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all hover:scale-105 cursor-default"
              >
                <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-400 fill-amber-400" />
                Admissions Open for 2026
              </Badge>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-8 leading-[1.1] drop-shadow-2xl">
                Focus.<br />
                Learn.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-cyan-300">
                  Achieve.
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-200/90 mb-10 max-w-xl leading-relaxed drop-shadow-md font-medium">
                Taxshila Digital Library is a precision-engineered environment designed to amplify your focus. Join the most productive community in Varanasi.
              </p>
              
            </div>
          </div>
        </section>

        {/* --- Overlapping Logo --- */}
        <div className="absolute top-[calc(85vh-50px)] left-1/2 -translate-x-1/2 z-20 h-[100px] w-[100px] bg-background rounded-full p-2 shadow-xl border-4 border-background">
            <Image
                src={LOGO_URL}
                alt="Taxshila Digital Library Logo"
                width={100}
                height={100}
                className="object-contain"
            />
        </div>


        {/* --- Vibrant Bento Features --- */}
        <section className="pt-24 pb-24 bg-background relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
          
          <div className="container px-6 md:px-12 lg:px-20 max-w-7xl mx-auto relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Engineered for Efficiency</h2>
              <p className="text-muted-foreground text-lg md:text-xl">Premium infrastructure designed for serious aspirants.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
              {featureList.map((feature, idx) => (
                <Card 
                  key={idx} 
                  className={cn(
                    "relative overflow-hidden group border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br",
                    feature.gradient,
                    feature.border
                  )}
                >
                  <CardHeader className="relative z-10">
                    <div className={cn("h-12 w-12 rounded-xl bg-background/80 backdrop-blur-md border flex items-center justify-center mb-3 shadow-sm transition-transform group-hover:scale-110", feature.iconColor)}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-muted-foreground/80 font-medium">{feature.description}</p>
                  </CardContent>
                  
                  <div className="absolute -right-10 -bottom-10 h-32 w-32 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all duration-500 opacity-0 group-hover:opacity-100" />
                </Card>
              ))}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Card className="col-span-2 lg:col-span-2 bg-primary text-primary-foreground flex flex-col justify-center items-center text-center border-none relative overflow-hidden shadow-2xl shadow-primary/20 group cursor-pointer">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                    <div className="absolute -right-20 -bottom-20 opacity-10 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
                      <UserCircle className="w-64 h-64" />
                    </div>
                    <CardContent className="relative z-10 p-8 flex flex-col items-center">
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">Ready to join the elite?</h3>
                      <p className="text-primary-foreground/90 mb-6 text-lg max-w-md">Your best work happens here. Start your journey today.</p>
                      <Button variant="secondary" size="lg" className="rounded-full font-bold px-8 shadow-lg hover:shadow-xl hover:scale-105 transition-all w-full sm:w-auto">
                        Get Started Now
                      </Button>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <ContactDialogContent />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        {/* --- Premium Pricing Section --- */}
        <Dialog>
          <section className="py-24 bg-secondary/30 border-y relative">
            <div className="container px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6 relative z-0">
                <div className="flex-grow">
                  <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Select Your Shift</h2>
                  <p className="text-muted-foreground text-lg md:text-xl">Transparent pricing. Choose the slot that fits your biology.</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-background px-4 py-2 rounded-full border shadow-sm flex-shrink-0">
                  <Check className="h-4 w-4 text-green-500" /> Includes High-Speed Wi-Fi & AC
                </div>
              </div>

              {isLoadingFees ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[500px] rounded-3xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                  {pricingTiers.map((tier) => (
                    <div 
                      key={tier.name} 
                      className={cn(
                        "relative flex flex-col h-full transition-all duration-500",
                        tier.highlight && "md:scale-105 z-10"
                      )}
                    >
                      {tier.highlight && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                          <Badge className="bg-primary text-primary-foreground hover:bg-primary px-4 py-1.5 text-xs uppercase tracking-widest font-bold shadow-lg shadow-primary/30 flex items-center gap-2 border-2 border-background">
                            <Crown className="w-3.5 h-3.5 fill-current" />
                            {tier.tag}
                          </Badge>
                        </div>
                      )}
                      <div className={cn(
                        "flex-1 bg-card/60 p-8 rounded-3xl flex flex-col",
                        tier.highlight && "bg-card shadow-2xl shadow-primary/10 ring-2 ring-primary/50"
                      )}>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                          <p className="text-muted-foreground text-sm mb-6 flex items-center gap-2"><Clock className="w-3.5 h-3.5"/>{tier.time}</p>
                          <div className="flex items-baseline justify-start mb-4">
                            <span className="text-5xl font-black tracking-tighter">Rs. {tier.price}</span>
                            <span className="text-muted-foreground ml-2 font-medium">/month</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-6 h-12">{tier.description}</p>
                        </div>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full font-bold rounded-xl h-12 text-base shadow-md transition-all hover:scale-[1.02]"
                            variant={tier.highlight ? "default" : "outline"}
                          >
                            Choose Plan
                          </Button>
                        </DialogTrigger>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
          <DialogContent>
            <ContactDialogContent />
          </DialogContent>
        </Dialog>


        {/* --- Footer --- */}
        <footer className="bg-[#0f172a] text-white py-16">
          <div className="container px-6 md:px-12 lg:px-20 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                   <Image src={LOGO_URL} alt="Logo" width={32} height={32} />
                </div>
                <span className="text-2xl font-bold tracking-tight">Taxshila Digital Library</span>
              </div>
              
              <div className="space-y-5 text-gray-400">
                <div className="flex items-start gap-4 group cursor-pointer hover:text-white transition-colors">
                  <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <p className="leading-relaxed text-sm pt-2">Plot-79, Agrasen Nagar Colony, Paharia, Varanasi, Uttar Pradesh 221007</p>
                </div>
                <div className="flex items-center gap-4 group cursor-pointer hover:text-white transition-colors">
                   <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Phone className="h-5 w-5" />
                  </div>
                  <p className="text-sm">+91 9123520131</p>
                </div>
                <div className="flex items-center gap-4 group cursor-pointer hover:text-white transition-colors">
                   <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <p className="text-sm">taxshiladigitallibrary@gmail.com</p>
                </div>
              </div>
              
              <div className="pt-6 flex gap-6 text-xs text-gray-500 font-medium border-t border-white/10">
                <p>&copy; {new Date().getFullYear()} Taxshila Digital Library</p>
                <Link href="/privacy_policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </div>
            </div>

            <div className="relative h-64 w-full rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 shadow-2xl group">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3605.5020189959014!2d83.00187507449463!3d25.35448622531363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398e2fedc194747f%3A0x571327385a60b22f!2sTaxshila%20Digital%20Library!5e0!3m2!1sen!2sin!4v1766080131645!5m2!1sen!2sin" width="100%" height="100%" style={{border:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-5 right-5">
                 <a href="https://www.google.com/maps/place/Taxshila+Digital+Library/@25.3544862,83.0018751,17z/data=!3m1!4b1!4m6!3m5!1s0x398e2fedc194747f:0x571327385a60b22f!8m2!3d25.3544814!4d83.0044447!16s%2Fg%2F11fyb_x1g9?entry=ttu" target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="backdrop-blur-md bg-white/10 border border-white/30 text-white hover:bg-white hover:text-black transition-all">
                        Get Directions
                    </Button>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

