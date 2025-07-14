
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
  // themeColor is removed from here to allow dynamic updates
  icons: {
    icon: [
      // Primary icon is now the renamed custom ICO file
      { url: '/custom-favicon.ico', type: 'image/x-icon', sizes: 'any' },
      // PNG fallbacks
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png', // Apple touch icon
    shortcut: '/logo.png' // General PWA shortcut icon, can also be specific if you have one
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
        {/* No direct <link rel="icon"> or <meta name="theme-color"> tags here; Next.js metadata and ThemeProvider handle them */}
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
