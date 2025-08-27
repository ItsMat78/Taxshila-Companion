
"use client";

import Link from 'next/link';
import Image from 'next/image'; // Import Image component
import { usePathname } from 'next/navigation';
import { BookOpenCheck, LogOut, ChevronDown } from 'lucide-react';
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
import { useFinancialCounts } from '@/hooks/use-financial-counts'; // Import the new hook
import { ThemeSwitcher } from '@/components/shared/theme-switcher';
import { useNotificationCounts } from '@/hooks/use-notification-counts'; // Import notification hook


const ACTUAL_LOGO_URL = '/logo.png'; // Use the actual logo path

function NavListItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isSubMenuOpen, setIsSubMenuOpen] = React.useState(
    !!item.items && item.items.some(subItem => pathname.startsWith(subItem.href))
  );

  const { user } = useAuth();
  const { count: financialCount, isLoadingCount: isLoadingFinancialCount } = useFinancialCounts();
  const { count: notificationCount, isLoadingCount: isLoadingNotificationCount } = useNotificationCounts();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (item.roles && user && !item.roles.includes(user.role)) {
    return null;
  }

  const visibleSubItems = item.items?.filter(subItem =>
    !subItem.roles || (user && subItem.roles.includes(user.role))
  );

  const displayFinancialCount = financialCount > 9 ? '9+' : String(financialCount);
  const displayNotificationCount = notificationCount > 9 ? '9+' : String(notificationCount);


  if (item.external) {
    return (
      <SidebarMenuItem>
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            sidebarMenuButtonVariants({variant: "default", size: "default"}),
            "w-full"
          )}
          onClick={closeMobileSidebar}
        >
          {item.icon && <item.icon className="h-4 w-4" />}
          <span className="truncate">{item.title}</span>
        </a>
      </SidebarMenuItem>
    );
  }

  if (visibleSubItems && visibleSubItems.length > 0) {
    let parentHasBadge = false;
    let badgeCount = '';
    
    if (item.title === 'Financials' && !isLoadingFinancialCount && financialCount > 0) {
      parentHasBadge = true;
      badgeCount = displayFinancialCount;
    } else if (item.title === 'Communication' && !isLoadingNotificationCount && notificationCount > 0 && user?.role === 'admin') {
      parentHasBadge = true;
      badgeCount = displayNotificationCount;
    }

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
             {parentHasBadge && (
              <span className="ml-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {badgeCount}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
              isSubMenuOpen && "rotate-180"
            )}
          />
        </SidebarMenuButton>
        {isSubMenuOpen && (
          <SidebarMenuSub>
            {visibleSubItems.map((subItem) => {
              let subItemHasBadge = false;
              let subItemBadgeCount = '';

              if (subItem.href === '/admin/fees/due' && !isLoadingFinancialCount && financialCount > 0) {
                subItemHasBadge = true;
                subItemBadgeCount = displayFinancialCount;
              } else if (subItem.href === '/admin/feedback' && !isLoadingNotificationCount && notificationCount > 0) {
                 subItemHasBadge = true;
                 subItemBadgeCount = displayNotificationCount;
              }

              return (
                <SidebarMenuSubItem key={subItem.href}>
                  <Link href={subItem.href} passHref legacyBehavior>
                    <SidebarMenuSubButton
                      isActive={pathname === subItem.href}
                      onClick={closeMobileSidebar}
                      className="justify-between w-full"
                    >
                      <span className="flex items-center gap-2">
                        {subItem.icon && <subItem.icon className="h-4 w-4" />}
                        <span className="truncate">{subItem.title}</span>
                      </span>
                      {subItemHasBadge && (
                         <span className="ml-auto inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                          {subItemBadgeCount}
                        </span>
                      )}
                    </SidebarMenuSubButton>
                  </Link>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  if (!item.items || visibleSubItems?.length === 0) {
     if (item.roles && user && !item.roles.includes(user.role)) {
        return null;
     }

     let hasBadge = false;
     let badgeCount = '';
     if (item.href === '/member/alerts' && !isLoadingNotificationCount && notificationCount > 0) {
        hasBadge = true;
        badgeCount = displayNotificationCount;
     }

    return (
      <SidebarMenuItem>
        <Link href={item.href} passHref legacyBehavior>
          <SidebarMenuButton
            isActive={pathname === item.href}
            onClick={closeMobileSidebar}
            className="justify-between w-full"
          >
            <span className="flex items-center gap-2">
              {item.icon && <item.icon className="h-4 w-4" />}
              <span className="truncate">{item.title}</span>
            </span>
             {hasBadge && (
              <span className="ml-auto inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {badgeCount}
              </span>
            )}
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  }
  return null;
}

const sidebarMenuButtonVariants = ({variant, size}: {variant?: string, size?: string}) => {
  return "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0";
}

export function AppSidebarContent() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getInitials = (identifierForDisplay?: string) => {
    if (!identifierForDisplay) return 'U';
    return identifierForDisplay.substring(0, 2).toUpperCase();
  }

  return (
    <Sidebar side="left" collapsible="icon">
      <SidebarHeader className="p-4 flex flex-col items-start w-full">
        <Link href="/" className="flex items-center gap-2 mb-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
          <Image
            src={ACTUAL_LOGO_URL}
            alt="Taxshila Logo Icon"
            width={64}
            height={64}
            className="object-contain group-data-[collapsible=icon]:block hidden h-8 w-8"
            data-ai-hint="logo brand"
            priority
          />
           <Image
            src={ACTUAL_LOGO_URL}
            alt="Taxshila Logo"
            width={120}
            height={120}
            className="object-contain group-data-[collapsible=icon]:hidden h-8 w-auto"
            data-ai-hint="logo brand"
            priority
          />
          <h1 className="text-xl font-headline font-semibold group-data-[collapsible=icon]:hidden">Taxshila Companion</h1>
        </Link>
         <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden w-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.profilePictureUrl || undefined} alt={user.identifierForDisplay} data-ai-hint="profile person" />
              <AvatarFallback>{getInitials(user.identifierForDisplay)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">{user.identifierForDisplay}</span>
              <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
            </div>
          </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {mainNav.map((item) => (
            <NavListItem key={item.title + item.href} item={item} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <ThemeSwitcher />
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
