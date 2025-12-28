
import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { DynamicThemeColor } from '@/components/shared/dynamic-theme-color';

export const metadata: Metadata = {
  title: 'Taxshila Companion',
  description: 'Your companion app for Taxshila study hall.',
  manifest: '/manifest.json',
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
        <meta name="theme-color" content="#D6D5D8" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light-default"
          enableSystem={false}
          themes={['light-default', 'light-mint', 'light-sunrise', 'light-sakura', 'dark-default', 'dark-midnight', 'dark-forest', 'dark-rose']}
          disableTransitionOnChange={true}
        >
          <DynamicThemeColor />
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

    