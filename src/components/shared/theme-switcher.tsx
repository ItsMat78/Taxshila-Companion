
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
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

const themes = [
    { name: "Light Default", value: "light-default", icon: Sun },
    { name: "Mint", value: "light-mint", icon: Sun },
    { name: "Sunrise", value: "light-sunrise", icon: Sun },
    { name: "Dark Default", value: "dark-default", icon: Moon },
    { name: "Midnight", value: "dark-midnight", icon: Moon },
    { name: "Forest", value: "dark-forest", icon: Moon },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
          <Palette className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" sideOffset={10} className="w-56">
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
