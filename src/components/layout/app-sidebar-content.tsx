"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenCheck, Settings } from 'lucide-react';

import { mainNav, type NavItem } from '@/config/nav';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import * as React from "react";


function NavListItem({ item, isSubItem = false }: { item: NavItem; isSubItem?: boolean }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [isSubMenuOpen, setIsSubMenuOpen] = React.useState(pathname.startsWith(item.href) && !!item.items);

  const closeMobileSidebar = () => {
    if (useSidebar().isMobile) {
      setOpenMobile(false);
    }
  };

  if (item.items && item.items.length > 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
          isActive={pathname.startsWith(item.href)}
          className="justify-between"
        >
          <span className="flex items-center gap-2">
            {item.icon && <item.icon className="h-4 w-4" />}
            <span className="truncate">{item.title}</span>
          </span>
        </SidebarMenuButton>
        {isSubMenuOpen && (
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.href}>
                <Link href={subItem.href} passHref legacyBehavior>
                  <SidebarMenuSubButton 
                    isActive={pathname === subItem.href}
                    onClick={closeMobileSidebar}
                  >
                    {subItem.icon && <subItem.icon className="h-4 w-4" />}
                    <span className="truncate">{subItem.title}</span>
                  </SidebarMenuSubButton>
                </Link>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  const ButtonComponent = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;

  return (
    <SidebarMenuItem>
      <Link href={item.href} passHref legacyBehavior>
        <ButtonComponent 
          isActive={pathname === item.href}
          onClick={closeMobileSidebar}
        >
          {item.icon && <item.icon className="h-4 w-4" />}
          <span className="truncate">{item.title}</span>
        </ButtonComponent>
      </Link>
    </SidebarMenuItem>
  );
}


export function AppSidebarContent() {
  return (
    <Sidebar side="left" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-headline font-semibold">Taxshila Companion</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {mainNav.map((item) => (
            <NavListItem key={item.href} item={item} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        {/* Example Footer Item */}
        {/* <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings" passHref legacyBehavior>
              <SidebarMenuButton>
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu> */}
      </SidebarFooter>
    </Sidebar>
  );
}
