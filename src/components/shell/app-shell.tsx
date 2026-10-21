"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  Database,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { markNotificationsReadAction } from "@/actions/notifications";
import { useClerk } from "@clerk/nextjs";
import { can } from "@/lib/auth/permissions";
import { setActiveOrgAction } from "@/actions/settings";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";

export interface ShellNav {
  user: { name: string; email: string };
  org: { id: string; name: string };
  role: "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
  /** Server-computed (PLATFORM_ADMIN_CLERK_IDS allowlist) — org role never grants /admin. */
  isPlatformAdmin: boolean;
  orgs: { id: string; name: string }[];
  apps: {
    id: string;
    name: string;
    status: string;
    recordCount: number;
    tables: { id: string; label: string }[];
  }[];
  notifications: {
    unread: number;
    items: { id: string; title: string; body: string | null; createdAt: string }[];
  };
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ nav, children }: { nav: ShellNav; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const canAdmin = nav.isPlatformAdmin;
  const canWorkflow = can(nav.role, "workflow:manage");

  async function onSignOut() {
    await signOut();
    router.push("/");
  }

  async function switchOrg(orgId: string) {
    if (orgId === nav.org.id) return;
    setSwitching(true);
    const result = await setActiveOrgAction(orgId);
    setSwitching(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onMarkNotificationsRead() {
    const result = await markNotificationsReadAction();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-[#E5E7EB] px-4">
        <Logo href="/dashboard" compact />
        <button
          type="button"
          className="ml-auto rounded p-1 text-[#6B7280] hover:bg-[#F8F9FA] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-[#E5E7EB] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-left hover:bg-[#F8F9FA]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F8F9FA] text-[#6B7280]">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#111111]">
                {nav.org.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {nav.orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                disabled={switching || org.id === nav.org.id}
                onClick={() => switchOrg(org.id)}
              >
                <Building2 className="h-4 w-4" />
                {org.name}
                {org.id === nav.org.id && <Badge variant="neutral" className="ml-auto">Current</Badge>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/onboarding")}>
              <Plus className="h-4 w-4" />
              Create new app
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
            isActive(pathname, "/dashboard")
              ? "bg-[#F8F9FA] text-[#111111]"
              : "text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
          )}
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="pt-3">
          <Link
            href="/apps"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "mb-1 block px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider hover:text-[#111111]",
              isActive(pathname, "/apps") ? "text-[#111111]" : "text-[#6B7280]"
            )}
          >
            Apps
          </Link>
          {nav.apps.slice(0, 3).map((app) => (
              <div key={app.id} className="mb-1">
                <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#111111]">
                  <span className="truncate">{app.name}</span>
                  <span className="ml-auto text-[11px] text-[#6B7280]">
                    {app.recordCount}
                  </span>
                </div>
                <div className="ml-4 space-y-0.5 border-l border-[#E5E7EB] pl-2">
                  {app.tables.slice(0, 6).map((table) => (
                    <Link
                      key={table.id}
                      href={`/tables/${table.id}`}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block truncate rounded px-2 py-1 text-[13px]",
                        isActive(pathname, `/tables/${table.id}`)
                          ? "bg-[#F8F9FA] font-medium text-[#111111]"
                          : "text-[#6B7280] hover:text-[#111111]"
                      )}
                    >
                      {table.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

        <Link
          href="/data"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
            isActive(pathname, "/data")
              ? "bg-[#F8F9FA] text-[#111111]"
              : "text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
          )}
        >
          <Database className="h-4 w-4" />
          Data
        </Link>

        <div className="pt-3">
          <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
            Workspace
          </p>
          {canWorkflow && (
            <Link
              href="/workflows"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
                isActive(pathname, "/workflows")
                  ? "bg-[#F8F9FA] text-[#111111]"
                  : "text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
              )}
            >
              <Workflow className="h-4 w-4" />
              Workflows
            </Link>
          )}
          <Link
            href="/team"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
              isActive(pathname, "/team")
                ? "bg-[#F8F9FA] text-[#111111]"
                : "text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
            )}
          >
            <Users className="h-4 w-4" />
            Team
          </Link>
          <Link
            href="/billing"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
              isActive(pathname, "/billing")
                ? "bg-[#F8F9FA] text-[#111111]"
                : "text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
            )}
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </Link>
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
              isActive(pathname, "/settings")
                ? "bg-[#F8F9FA] text-[#111111]"
                : "text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          {canAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium",
                isActive(pathname, "/admin")
                  ? "bg-[#F8F9FA] text-[#111111]"
                  : "text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </div>
      </nav>

      <div className="border-t border-[#E5E7EB] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[#F8F9FA]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">
                {nav.user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#111111]">
                  {nav.user.name}
                </span>
                <span className="block truncate text-[11px] text-[#6B7280]">
                  {nav.user.email}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              {nav.user.name} · {nav.role}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="h-4 w-4" />
              Profile settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#E5E7EB] bg-white lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#E5E7EB] bg-white/90 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="iconSm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative rounded p-1.5 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {nav.notifications.unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-semibold text-white">
                    {nav.notifications.unread > 9 ? "9+" : nav.notifications.unread}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {nav.notifications.unread > 0 && (
                  <button
                    type="button"
                    onClick={onMarkNotificationsRead}
                    className="text-[11px] font-normal text-[#6B7280] hover:text-[#111111]"
                  >
                    Mark all read
                  </button>
                )}
              </DropdownMenuLabel>
              {nav.notifications.items.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-[#6B7280]">
                  No notifications yet. Workflow alerts will appear here.
                </p>
              ) : (
                nav.notifications.items.map((item) => (
                  <div key={item.id} className="border-t border-[#F0F1F3] px-2 py-2 first:border-0">
                    <p className="text-[13px] font-medium text-[#111111]">{item.title}</p>
                    {item.body && (
                      <p className="mt-0.5 text-xs text-[#6B7280]">{item.body}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-[#6B7280]">
                      {new Date(item.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Badge variant="outline" className="hidden sm:inline-flex">{nav.role}</Badge>
          <Link
            href="/onboarding"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#111111] px-3 text-[13px] font-medium text-white hover:bg-[#333333]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New app</span>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
