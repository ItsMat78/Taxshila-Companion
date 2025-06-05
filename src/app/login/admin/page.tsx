
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

const loginFormSchema = z.object({
  identifier: z.string().min(1, { message: "Email or Phone Number is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// Update these paths to point to your images in the 'public' folder
const LOGO_URL = "/logo.png"; // Assumes logo.png is in public/
const LIBRARY_INTERIOR_URL = "/cover.png"; // Assumes cover.png is in public/

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--muted))] p-4">
        <div className="w-full max-w-sm md:max-w-4xl lg:max-w-5xl bg-card rounded-lg shadow-xl overflow-hidden md:grid md:grid-cols-2">
          {/* Image Section (Left Column on MD+) */}
          <div className="hidden md:flex flex-col items-center justify-center bg-primary/5 p-8 lg:p-12">
            <Image
              src={LOGO_URL}
              alt="Taxshila Companion Logo"
              width={200}
              height={67}
              className="object-contain mb-8 lg:mb-12"
              data-ai-hint="logo brand"
              priority
            />
            <Image
              src={LIBRARY_INTERIOR_URL}
              alt="Taxshila Study Hall Interior"
              width={360}
              height={270}
              className="object-cover rounded-lg shadow-md"
              data-ai-hint="library interior study"
              priority
            />
          </div>

          {/* Form Section (Right Column on MD+, Full width on SM) */}
          <div className="p-6 sm:p-8">
            {/* Logo for small screens */}
            <div className="md:hidden flex flex-col items-center mb-6">
              <Image
                src={LOGO_URL} 
                alt="Taxshila Companion Logo"
                width={150}
                height={50}
                className="object-contain"
                data-ai-hint="logo brand"
                priority
              />
            </div>

            <CardHeader className="text-center p-0 mb-6">
              <CardTitle className="text-2xl font-headline">Welcome Back!</CardTitle>
              <CardDescription>Login to Taxshila Companion.</CardDescription>
            </CardHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 p-0">
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or Phone Number</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Enter your email or phone" {...field} disabled={isSubmitting || showSuccessDialog} />
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting || showSuccessDialog} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-4 p-0 pt-6">
                  <Button type="submit" className="w-full" disabled={isSubmitting || showSuccessDialog}>
                    {isSubmitting || showSuccessDialog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    {isSubmitting && !showSuccessDialog ? 'Checking...' : (showSuccessDialog ? 'Logging in...' : 'Login')}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
