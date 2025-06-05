
"use client";

import * as React from 'react';
import Link from 'next/link';
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

const LOGIN_IMAGE_PLACEHOLDER = "https://placehold.co/600x300.png";
const LOGO_PLACEHOLDER = "https://placehold.co/150x50.png?text=Taxshila+Logo";

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
        <Card className="w-full max-w-md shadow-xl overflow-hidden">
          <div className="bg-primary/10 p-6 flex flex-col items-center justify-center">
            <Image 
              src={LOGO_PLACEHOLDER}
              alt="Taxshila Companion Logo"
              width={150}
              height={50}
              className="object-contain mb-6"
              data-ai-hint="logo brand"
            />
            <Image 
              src={LOGIN_IMAGE_PLACEHOLDER} 
              alt="Taxshila Study Hall Interior" 
              width={300} 
              height={150} 
              className="object-cover rounded-md shadow-md"
              data-ai-hint="library interior"
            />
          </div>
          <CardHeader className="text-center pt-6 pb-2">
            <CardTitle className="text-2xl font-headline">Welcome to Taxshila Companion</CardTitle>
            <CardDescription>Your dedicated portal for study hall activities.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4 px-6 pb-4">
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
              <CardFooter className="flex flex-col gap-4 p-6 pt-2">
                <Button type="submit" className="w-full" disabled={isSubmitting || showSuccessDialog}>
                  {isSubmitting || showSuccessDialog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  {isSubmitting && !showSuccessDialog ? 'Checking...' : (showSuccessDialog ? 'Logging in...' : 'Login')}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </>
  );
}
