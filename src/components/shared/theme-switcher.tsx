"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const themes = [
    { name: "Light Default", value: "light-default", isDark: false },
    { name: "Mint", value: "light-mint", isDark: false },
    { name: "Sunrise", value: "light-sunrise", isDark: false },
    { name: "Dark Default", value: "dark-default", isDark: true },
    { name: "Midnight", value: "dark-midnight", isDark: true },
    { name: "Forest", value: "dark-forest", isDark: true },
];

export function ThemeSwitcher() {
  const { theme, setTheme, systemTheme } = useTheme()

  const handleThemeChange = (newThemeValue: string) => {
    const selectedTheme = themes.find(t => t.value === newThemeValue);
    if (selectedTheme) {
        // next-themes uses 'dark' or 'light' for the mode, and we use a class for the specific theme
        const mode = selectedTheme.isDark ? 'dark' : 'light';
        setTheme(mode); // Set the mode (dark/light)
        
        // Remove other theme classes and add the new one
        document.documentElement.classList.forEach(c => {
            if (c.startsWith('theme-')) {
                document.documentElement.classList.remove(c);
            }
        });
        document.documentElement.classList.add(`theme-${newThemeValue}`);
    }
  };
  
  // This effect ensures the correct specific theme class is applied on initial load or when system theme changes
  React.useEffect(() => {
    const currentMode = theme === "system" ? systemTheme : theme;
    // Simple logic: if dark mode, apply default dark, otherwise default light.
    // This could be enhanced to remember the specific theme choice within a mode.
    const defaultThemeClass = currentMode === 'dark' ? 'theme-dark-default' : 'theme-light-default';
    
    let themeClassFound = false;
    document.documentElement.classList.forEach(c => {
        if (c.startsWith('theme-')) {
            themeClassFound = true;
        }
    });

    if (!themeClassFound) {
        document.documentElement.classList.add(defaultThemeClass);
    }

  }, [theme, systemTheme]);
  

  const currentThemeClass = React.useMemo(() => {
    if (typeof window === 'undefined') return 'theme-light-default';
    const classList = Array.from(document.documentElement.classList);
    return classList.find(c => c.startsWith('theme-'))?.replace('theme-', '') || 'light-default';
  }, [theme, systemTheme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
          <Palette className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={currentThemeClass} onValueChange={handleThemeChange}>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2">Light Themes</DropdownMenuLabel>
            {themes.filter(t => !t.isDark).map((t) => (
                <DropdownMenuRadioItem key={t.value} value={t.value}>
                    <Sun className="mr-2 h-4 w-4" />
                    {t.name}
                </DropdownMenuRadioItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2">Dark Themes</DropdownMenuLabel>
             {themes.filter(t => t.isDark).map((t) => (
                <DropdownMenuRadioItem key={t.value} value={t.value}>
                    <Moon className="mr-2 h-4 w-4" />
                    {t.name}
                </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
