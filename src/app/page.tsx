
"use client";

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Download, Smartphone, Home } from 'lucide-react';
import { LoggingInDialog } from '@/components/shared/logging-in-dialog';
import { useToast } from '@/hooks/use-toast';

const COVER_IMAGE_URL = '/cover.png';
const LOGO_URL = '/logo.png';

const loginFormSchema = z.object({
  identifier: z.string().min(1, { message: "Email or Phone Number is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// --- PWA Install Logic ---
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function RootLoginPage() {
  const router = useRouter();
  const { login, user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [showLoggingInDialog, setShowLoggingInDialog] = React.useState(false);

  // --- PWA Install State ---
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [canInstallPWA, setCanInstallPWA] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthLoading && user) {
        const destination = user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard';
        router.replace(destination);
    }
  }, [user, isAuthLoading, router]);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstallPWA(true); // Show the install button
      console.log("beforeinstallprompt event fired and captured.");
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log("Deferred prompt not available.");
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation');
      toast({ title: "App Installed!", description: "Taxshila Companion has been added to your device." });
    } else {
      console.log('User dismissed the PWA installation');
    }
    // We've used the prompt, and can't use it again, disable the button
    setDeferredPrompt(null);
    setCanInstallPWA(false);
  };

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await login(data.identifier, data.password);
      if (loggedInUser) {
        setShowLoggingInDialog(true);
        // The useEffect hook will handle the redirect
      } else {
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoggingIn(false);
    }
  }
  
  if (isAuthLoading && !user) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Initializing...</p>
        </div>
    );
  }

  return (
    <>
      <div
        style={{ backgroundImage: `url(${COVER_IMAGE_URL})` }}
        className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center p-4 gap-6"
      >
        <Card className="w-full max-w-md md:max-w-3xl shadow-xl bg-background/70 backdrop-blur-md rounded-lg flex flex-col md:flex-row max-h-[calc(100vh_-_theme(space.8))] overflow-y-auto">
          <div className="flex flex-col items-center justify-center px-4 pt-4 pb-0 sm:p-6 sm:pb-2 md:pb-6 md:w-1/3 md:border-r md:border-border/30 md:p-4">
            <div className="relative w-16 h-auto sm:w-24 md:w-28 mb-2 sm:mb-4 md:mb-0">
              <Image
                src={LOGO_URL}
                alt="Taxshila Companion Logo"
                width={150}
                height={150}
                className="w-full h-auto object-contain"
                data-ai-hint="logo brand"
                priority
              />
            </div>
          </div>

          <div className="flex flex-col flex-grow md:w-2/3">
            <CardHeader className="text-center px-4 pb-4 pt-0 sm:pt-6 sm:px-6 md:px-4 md:pt-4 md:pb-2">
              <CardTitle className="text-base sm:text-lg md:text-xl font-headline text-foreground">Welcome Back!</CardTitle>
              <CardDescription className="text-xs sm:text-xs md:text-sm text-foreground/80">Login to Taxshila Companion.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 md:px-4 md:pt-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Email or Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email or phone" {...field} className="text-xs sm:text-sm" disabled={isLoggingIn} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} className="text-xs sm:text-sm" disabled={isLoggingIn} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="sm" disabled={isLoggingIn}>
                    {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoggingIn ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </div>
        </Card>
        
        <Link href="/home">
          <Button variant="outline" className="bg-background/70 backdrop-blur-md">
            <Home className="mr-2 h-4 w-4" /> Go to Home Page
          </Button>
        </Link>


        {/* --- PWA Install Button --- */}
        {canInstallPWA && deferredPrompt && (
          <Card className="w-full max-w-md md:max-w-sm shadow-xl bg-background/80 backdrop-blur-md rounded-lg">
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Install Taxshila Companion App?
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Get faster access and an optimized experience by installing the app on your device.
              </p>
              <Button onClick={handleInstallClick} className="w-full" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <LoggingInDialog isOpen={showLoggingInDialog} />
    </>
  )
}
