"use client"

import * as React from 'react';
import { useTheme } from 'next-themes';

const themeColors: Record<string, string> = {
    'light-default': '#D6D5D8',
    'light-mint': '#E2F1EB', 
    'light-sunrise': '#FEF4E7', 
    'light-sakura': '#FAEAF0', 
    'dark-default': '#000000', 
    'dark-midnight': '#141822', 
    'dark-forest': '#121912', 
    'dark-rose': '#1C1519', 
};

export function DynamicThemeColor() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    // 1. Determine the safe "Fallback" theme (guaranteed string)
    const fallbackTheme = resolvedTheme === 'dark' ? 'dark-default' : 'light-default';

    // 2. Check if the current 'theme' is valid and exists in our colors map
    //    We check "theme &&" to ensure it's not undefined
    const activeTheme = (theme && themeColors[theme]) ? theme : fallbackTheme;

    // 3. Now activeTheme is guaranteed to be a valid key in themeColors
    const color = themeColors[activeTheme];

    if (color) {
        // A. Update Browser Meta Tag
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
        }

        // B. Update Median Native Status Bar
        const median = (window as any).median;
        if (median?.statusbar) {
            median.statusbar.setBackgroundColor({ color: color });
            
            // Contrast Logic: Dark themes need Light text (White)
            const isDark = activeTheme.startsWith('dark');
            median.statusbar.setStyle({ style: isDark ? 'light' : 'dark' });
        }
    }
  }, [theme, resolvedTheme, mounted]);

  if (!mounted) return null;

  return null;
}