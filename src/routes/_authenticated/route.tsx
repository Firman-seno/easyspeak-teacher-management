import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const displayName =
    (currentUser?.user_metadata?.["full_name"] as string | undefined) ?? currentUser?.email ?? "";
  const avatarUrl = (currentUser?.user_metadata?.["avatar_url"] as string | undefined) ?? null;

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-card/90 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3">
            <SidebarTrigger />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground sm:text-sm">
                EasySpeak Teacher Management
              </p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Student Attendance • Learning Progress • Project Tracking • Monthly Reports
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground md:inline">
                {currentUser?.email}
              </span>
              <Avatar className="size-7 sm:size-8" title={displayName}>
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-xs">{initials(displayName || "T")}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={signOut} aria-label="Sign out">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 px-[clamp(1rem,4vw,2.5rem)] py-4 sm:py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
