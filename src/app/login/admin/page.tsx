
"use client";

import * as React from 'react';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { LoggingInDialog } from '@/components/shared/logging-in-dialog';

const LOGO_URL = "/logo.png";
const LIBRARY_INTERIOR_URL = "/cover.png";

const loginFormSchema = z.object({
  identifier: z.string().min(1, { message: "Email or Phone Number is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function AdminLoginPage() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    setShowSuccessDialog(false);
    try {
      const loggedInUser = await login(data.identifier, data.password);
      if (loggedInUser) {
        setShowSuccessDialog(true);
        setTimeout(() => {
          if (loggedInUser.role === 'admin') {
            router.push('/');
          } else if (loggedInUser.role === 'member') {
            router.push('/member/dashboard');
          } else {
            toast({ title: "Login Error", description: "Unexpected user role.", variant: "destructive" });
            router.push('/login/admin');
          }
        }, 700);
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Login submission error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <LoggingInDialog isOpen={showSuccessDialog} />
      <div
        style={{ backgroundImage: `url(${LIBRARY_INTERIOR_URL})` }}
        className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
      >
        <Card className="w-full max-w-md md:max-w-3xl shadow-xl bg-background/70 backdrop-blur-md rounded-lg flex flex-col md:flex-row max-h-[calc(100vh_-_theme(space.8))] overflow-y-auto">

          {/* Logo Section (Left Column on MD+) */}
          <div className="flex flex-col items-center justify-center px-4 pt-4 pb-0 sm:p-6 md:w-1/3 md:border-r md:border-border/30 md:p-0">
            <div className="relative w-16 h-auto sm:w-24 md:w-28 mb-2 md:mb-0">
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

          {/* Form Section (Right Column on MD+) */}
          <div className="flex flex-col flex-grow md:w-2/3">
            <CardHeader className="text-center px-4 pb-4 pt-0 sm:p-6 md:px-0 md:pt-0 md:pb-0">
              <CardTitle className="text-base sm:text-lg md:text-xl font-headline text-foreground pt-4 md:pt-6">Welcome Back!</CardTitle>
              <CardDescription className="text-xs sm:text-xs md:text-sm text-foreground/80 pb-2 md:pb-4">Login to Taxshila Companion.</CardDescription>
            </CardHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 px-4 sm:px-6 pt-0 md:px-6 md:pt-0">
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm text-foreground/90">Email or Phone Number</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Enter your email or phone" {...field} disabled={isSubmitting || showSuccessDialog} className="text-xs sm:text-sm" />
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
                        <FormLabel className="text-xs sm:text-sm text-foreground/90">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting || showSuccessDialog} className="text-xs sm:text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-4 px-4 pb-4 pt-0 sm:p-6 sm:pt-0 md:px-6 md:pt-4 md:pb-6">
                  <Button type="submit" className="w-full" disabled={isSubmitting || showSuccessDialog} size="sm">
                    {isSubmitting || showSuccessDialog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    {isSubmitting && !showSuccessDialog ? 'Checking...' : (showSuccessDialog ? 'Logging in...' : 'Login')}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </div>
        </Card>
      </div>
    </>
  );
}
