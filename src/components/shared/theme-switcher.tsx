
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Palette } from "lucide-react"
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

const themes = [
    { name: "Light Default", value: "light-default", icon: Sun },
    { name: "Mint", value: "light-mint", icon: Sun },
    { name: "Sunrise", value: "light-sunrise", icon: Sun },
    { name: "Sakura", value: "light-sakura", icon: Sun },
    { name: "Dark Default", value: "dark-default", icon: Moon },
    { name: "Midnight", value: "dark-midnight", icon: Moon },
    { name: "Forest", value: "dark-forest", icon: Moon },
    { name: "Rose", value: "dark-rose", icon: Moon },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true)
  }, []);

  const currentThemeName = React.useMemo(() => {
    if (!mounted) return "Theme";
    return themes.find(t => t.value === theme)?.name || "Theme";
  }, [theme, mounted]);


  return (
    <DropdownMenu>
        <SidebarMenuItem>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                    <Palette className="h-4 w-4" />
                    <span className="truncate">Theme: {currentThemeName}</span>
                </SidebarMenuButton>
            </DropdownMenuTrigger>
        </SidebarMenuItem>
      <DropdownMenuContent align="end" side="top" sideOffset={10} className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2">Light Themes</DropdownMenuLabel>
            {themes.filter(t => t.value.startsWith('light')).map((t) => (
                <DropdownMenuRadioItem key={t.value} value={t.value}>
                    <t.icon className="mr-2 h-4 w-4" />
                    {t.name}
                </DropdownMenuRadioItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2">Dark Themes</DropdownMenuLabel>
             {themes.filter(t => t.value.startsWith('dark')).map((t) => (
                <DropdownMenuRadioItem key={t.value} value={t.value}>
                    <t.icon className="mr-2 h-4 w-4" />
                    {t.name}
                </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
