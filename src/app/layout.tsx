
import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { ThemeProvider } from '@/contexts/theme-context'; // Import ThemeProvider

export const metadata: Metadata = {
  title: 'Taxshila Companion',
  description: 'Your companion app for Taxshila study hall.',
  manifest: '/manifest.json',
  themeColor: [
    // Light Themes
    { media: '(prefers-color-scheme: light)', color: 'hsl(240 7% 84%)' },
    { media: '(prefers-theme: light-default)', color: 'hsl(240 7% 84%)' },
    { media: '(prefers-theme: light-mint)', color: 'hsl(150 50% 92%)' },
    { media: '(prefers-theme: light-sunrise)', color: 'hsl(40 100% 94%)' },
    { media: '(prefers-theme: light-sakura)', color: 'hsl(345 60% 94%)' },
    // Dark Themes
    { media: '(prefers-color-scheme: dark)', color: 'hsl(0 0% 0%)' },
    { media: '(prefers-theme: dark-default)', color: 'hsl(0 0% 0%)' },
    { media: '(prefers-theme: dark-midnight)', color: 'hsl(220 40% 10%)' },
    { media: '(prefers-theme: dark-forest)', color: 'hsl(120 20% 8%)' },
    { media: '(prefers-theme: dark-rose)', color: 'hsl(340 15% 10%)' },
  ],
  icons: {
    icon: [
      { url: '/custom-favicon.ico', type: 'image/x-icon', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/logo.png'
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light-default"
          enableSystem={false}
          themes={['light-default', 'light-mint', 'light-sunrise', 'light-sakura', 'dark-default', 'dark-midnight', 'dark-forest', 'dark-rose']}
          disableTransitionOnChange={true}
        >
          <AuthProvider>
            <NotificationProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
