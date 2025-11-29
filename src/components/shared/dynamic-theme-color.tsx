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
    // Safety check: ensure theme exists and we have a color for it
    if (theme && themeColors[theme]) {
        const color = themeColors[theme];

        // --- 1. PWA / Mobile Browser Logic (Existing) ---
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
        }

        // --- 2. Median Native App Logic (New) ---
        const median = (window as any).median;
        if (median?.statusbar) {
            // Set the background color
            median.statusbar.setBackgroundColor({ color: color });

            // Set the text color (contrast)
            // Logic: If theme name starts with 'dark', use 'light' text (white). 
            // Otherwise use 'dark' text (black).
            const isDarkTheme = theme.startsWith('dark');
            median.statusbar.setStyle({ style: isDarkTheme ? 'light' : 'dark' });
        }
    }
  }, [theme]);

  // Initial render setup
  return (
    <meta
        name="theme-color"
        content={theme && themeColors[theme] ? themeColors[theme] : themeColors['light-default']}
    />
  );
}