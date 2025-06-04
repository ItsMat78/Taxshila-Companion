
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenCheck, LogOut } from 'lucide-react';
import * as React from "react";

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
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '../ui/button';


function NavListItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar(); 
  const [isSubMenuOpen, setIsSubMenuOpen] = React.useState(
    !!item.items && item.items.some(subItem => pathname.startsWith(subItem.href))
  );

  const { user } = useAuth();

  const closeMobileSidebar = () => {
    if (isMobile) { 
      setOpenMobile(false);
    }
  };

  // Filter based on role
  if (item.roles && user && !item.roles.includes(user.role)) {
    return null;
  }
  
  // Also filter sub-items
  const visibleSubItems = item.items?.filter(subItem => 
    !subItem.roles || (user && subItem.roles.includes(user.role))
  );


  if (visibleSubItems && visibleSubItems.length > 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
          isActive={visibleSubItems.some(subItem => pathname.startsWith(subItem.href))}
          className="justify-between"
        >
          <span className="flex items-center gap-2">
            {item.icon && <item.icon className="h-4 w-4" />}
            <span className="truncate">{item.title}</span>
          </span>
        </SidebarMenuButton>
        {isSubMenuOpen && (
          <SidebarMenuSub>
            {visibleSubItems.map((subItem) => (
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

  // If it's a top-level item without sub-items or all sub-items are filtered out
  if (!item.items || visibleSubItems?.length === 0) {
     if (item.roles && user && !item.roles.includes(user.role)) {
        return null;
     }
    return (
      <SidebarMenuItem>
        <Link href={item.href} passHref legacyBehavior>
          <SidebarMenuButton 
            isActive={pathname === item.href}
            onClick={closeMobileSidebar}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            <span className="truncate">{item.title}</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  }
  return null;
}


export function AppSidebarContent() {
  const { user, logout } = useAuth();

  if (!user) return null; // Don't render sidebar if not logged in

  const getInitials = (email?: string) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }

  return (
    <Sidebar side="left" collapsible="icon">
      <SidebarHeader className="p-4 flex flex-col items-start">
        <Link href="/" className="flex items-center gap-2 mb-4">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-headline font-semibold">Taxshila Companion</h1>
        </Link>
         <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Avatar className="h-9 w-9">
              {/* <AvatarImage src="https://placehold.co/40x40.png" alt={user.email} /> */}
              <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{user.email}</span>
              <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
            </div>
          </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {mainNav.map((item) => (
            <NavListItem key={item.title} item={item} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
