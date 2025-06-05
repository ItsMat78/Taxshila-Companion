
"use client";

import * as React from 'react';
import Image from 'next/image';
import { Metadata } from 'next/types'; // Keep for potential static metadata generation if needed, though "use client" makes it dynamic
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { LoggingInDialog } from '@/components/shared/logging-in-dialog';
import { useToast } from '@/hooks/use-toast';


const COVER_IMAGE_URL = '/cover.png'; 
const LOGO_URL = '/logo.png';

// Dynamic metadata can be set in the component if needed, but for client components,
// it's often handled differently or less critical for simple pages.
// export const metadata: Metadata = {
//   title: 'Admin Login',
//   description: 'Admin login page',
// }

const loginFormSchema = z.object({
  identifier: z.string().min(1, { message: "Email or Phone Number is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [showLoggingInDialog, setShowLoggingInDialog] = React.useState(false);

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
        setShowLoggingInDialog(true); // Show "Logging in..." dialog
        // Wait a brief moment for the dialog to be visible before redirecting
        setTimeout(() => {
          if (loggedInUser.role === 'admin') {
            router.replace('/');
          } else if (loggedInUser.role === 'member') {
            router.replace('/member/dashboard');
          } else {
            // Fallback, though role should always be defined
            router.replace('/');
          }
          // Dialog will disappear as page changes
        }, 700); 
      } else {
        // Login function in AuthContext already handles toasts for failed logins
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
    // Do not set setIsLoggingIn(false) here if successful, dialog handles visual state
  }

  return (
    <>
      <div
        style={{ backgroundImage: `url(${COVER_IMAGE_URL})` }}
        className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
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
           {/* Footer is implicitly part of CardContent or form structure if buttons are there */}
         </div>
        </Card>
      </div>
      <LoggingInDialog isOpen={showLoggingInDialog} />
    </>
  )
}
