
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
       <div className="absolute top-8 left-8 flex items-center gap-2">
          {/* Placeholder for a logo if desired */}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open-check"><path d="M8 3H2v15h7c1.7 0 3 1.3 3 3V7c0-2.2-1.8-4-4-4Z"/><path d="m16 12 2 2 4-4"/><path d="M22 6V3h-6c-2.2 0-4 1.8-4 4v14c0-1.7 1.3-3 3-3h7v-2.3"/></svg>
          <h1 className="text-2xl font-headline font-semibold text-primary">Taxshila Companion</h1>
        </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome Back!</CardTitle>
          <CardDescription>Please select your login type to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <Link href="/login/member" passHref legacyBehavior>
            <Button variant="outline" className="w-full h-12 text-lg justify-between">
              Login as Member <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login/admin" passHref legacyBehavior>
            <Button variant="outline" className="w-full h-12 text-lg justify-between">
              Login as Admin <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Your dedicated study hall assistant.
      </p>
    </div>
  );
}
