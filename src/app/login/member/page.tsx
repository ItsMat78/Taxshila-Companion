
"use client";

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, LogIn, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { LoggingInDialog } from '@/components/shared/logging-in-dialog';

const loginFormSchema = z.object({
  identifier: z.string().min(1, { message: "Email or Phone Number is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function MemberLoginPage() {
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
    setShowSuccessDialog(false); // Ensure dialog isn't stuck from previous attempts
    try {
      const loggedInUser = await login(data.identifier, data.password);
      if (loggedInUser) {
        setShowSuccessDialog(true);
        // Short delay to allow dialog to render, then redirect
        setTimeout(() => {
          router.push('/member/dashboard'); // Redirect to member dashboard
        }, 500); // 500ms delay
      } else {
        // Toast for login failure is handled by AuthContext
        setIsSubmitting(false); // Re-enable button if login fails
      }
    } catch (error) {
      console.error("Member login submission error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false); // Re-enable button on error
    }
    // If login is successful, isSubmitting remains true and page redirects.
    // If login fails or error, isSubmitting is set to false.
  }

  return (
    <>
      <LoggingInDialog isOpen={showSuccessDialog} />
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-8 left-0 right-0 flex flex-col items-center gap-2 px-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open-check"><path d="M8 3H2v15h7c1.7 0 3 1.3 3 3V7c0-2.2-1.8-4-4-4Z"/><path d="m16 12 2 2 4-4"/><path d="M22 6V3h-6c-2.2 0-4 1.8-4 4v14c0-1.7 1.3-3 3-3h7v-2.3"/></svg>
              <h1 className="text-2xl font-headline font-semibold text-primary">Taxshila Companion</h1>
            </div>
             <p className="text-center text-sm text-muted-foreground">
              Your dedicated study hall assistant.
            </p>
        </div>

        <Card className="w-full max-w-md shadow-xl mt-24 sm:mt-32">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Member Login</CardTitle>
            <CardDescription className="text-center">Access your Taxshila Companion account.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email or Phone Number</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="you@example.com or 9876543210" {...field} disabled={isSubmitting || showSuccessDialog} />
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
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isSubmitting || showSuccessDialog}>
                  {isSubmitting || showSuccessDialog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  {showSuccessDialog ? 'Logging in...' : 'Login'}
                </Button>
                <Link href="/login/admin" passHref legacyBehavior>
                   <Button variant="link" className="text-sm text-muted-foreground hover:text-primary" disabled={isSubmitting || showSuccessDialog}>
                      <Shield className="mr-2 h-4 w-4" /> Login as Admin
                   </Button>
                </Link>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </>
  );
}
