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

interface Median {
  statusbar: {
    set: (options: { style?: 'light' | 'dark'; color?: string; overlay?: boolean }) => void;
  };
}

export function DynamicThemeColor() {
  const { theme } = useTheme();
  
  React.useEffect(() => {
    if (!theme || !themeColors[theme]) return;

    const currentColor = themeColors[theme];

    // 1. PWA / Browser Update
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', currentColor);
    }

    // 2. Median.co Native App Update
    const median = (window as any).median as Median | undefined;

    if (median) {
      const isLightTheme = theme.startsWith('light');
      const textStyle = isLightTheme ? 'light' : 'dark';

      median.statusbar.set({
        color: currentColor,
        style: textStyle, 
        overlay: false
      });
    }
  }, [theme]);

  return null;
}