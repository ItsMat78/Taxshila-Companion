
import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { DynamicThemeColor } from '@/components/shared/dynamic-theme-color';
import { ReactQueryProvider } from '@/contexts/query-provider';
import { Poppins, PT_Sans } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

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
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${ptSans.variable}`}>
      <head>
        <meta name="theme-color" content="#D6D5D8" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          themes={['light', 'dark']}
          disableTransitionOnChange={true}
        >
          <DynamicThemeColor />
          <AuthProvider>
            <ReactQueryProvider>
              <NotificationProvider>
                  <AppLayout>
                    {children}
                  </AppLayout>
                <Toaster />
              </NotificationProvider>
            </ReactQueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

    