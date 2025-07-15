
"use client"

import * as React from 'react';
import { useTheme } from 'next-themes';

const themeColors: Record<string, string> = {
    'light-default': '#D6D5D8', // hsl(240 7% 84%)
    'light-mint': '#E2F1EB', // hsl(150 50% 92%)
    'light-sunrise': '#FEF4E7', // hsl(40 100% 94%)
    'light-sakura': '#FAEAF0', // hsl(345 60% 94%)
    'dark-default': '#000000', // hsl(0 0% 0%)
    'dark-midnight': '#141822', // hsl(220 40% 10%)
    'dark-forest': '#121912', // hsl(120 20% 8%)
    'dark-rose': '#1C1519', // hsl(340 15% 10%)
};

export function DynamicThemeColor() {
  const { theme } = useTheme();
  
  React.useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor && theme && themeColors[theme]) {
      metaThemeColor.setAttribute('content', themeColors[theme]);
    }
  }, [theme]);

  // Initial render on the server can have a placeholder or default color
  // But the useEffect will correct it on the client side.
  // We will manage the initial meta tag directly in the head.
  return (
    <meta
        name="theme-color"
        content={theme ? themeColors[theme] : themeColors['light-default']}
    />
  );
}
