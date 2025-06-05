
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
import { Loader2, ShieldCheck, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginFormSchema = z.object({
  identifier: z.string().min(1, { message: "Email or Phone Number is required." }),
  password: z.string().min(1, { message: "Password is required." }), // Simplified min length
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function AdminLoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await login(data.identifier, data.password);
      // login function handles redirection and toasts on failure
    } catch (error) {
      console.error("Admin login submission error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
       // Let the auth context handle its own loading state based on login success/failure/navigation
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          <CardDescription className="text-center">Access the Taxshila Companion admin panel.</CardDescription>
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
                      <Input type="text" placeholder="admin@example.com or 8210183751" {...field} />
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Login as Admin
              </Button>
               <Link href="/login/member" passHref legacyBehavior>
                 <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                    <Users className="mr-2 h-4 w-4" /> Login as Member
                 </Button>
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
