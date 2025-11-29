
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
  const { theme } = useTheme();
  
  React.useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor && theme && themeColors[theme]) {
      metaThemeColor.setAttribute('content', themeColors[theme]);
    }
  }, [theme]);

  // This component no longer renders anything to the DOM, it only handles the effect.
  return null;
}
