"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, Settings, HelpCircle, LogOut } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getBrowserSupabase();
  
  const [userProfile, setUserProfile] = React.useState<{ name: string; email: string; role: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [logoutSuccess, setLogoutSuccess] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState(false);

  // Retrieve user session metadata on mount and listen to changes
  React.useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const email = session.user.email || "";
          const metadata = session.user.user_metadata || {};
          const emailPrefix = email.split("@")[0];
          const name = metadata.username || emailPrefix || "User";
          const role = metadata.role || "Staff Member";

          setUserProfile({
            email,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            role: role.charAt(0).toUpperCase() + role.slice(1),
          });
        }
      } catch (err) {
        console.error("Failed to load user session metadata:", err);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && mounted) {
        const email = session.user.email || "";
        const metadata = session.user.user_metadata || {};
        const emailPrefix = email.split("@")[0];
        const name = metadata.username || emailPrefix || "User";
        const role = metadata.role || "Staff Member";

        setUserProfile({
          email,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          role: role.charAt(0).toUpperCase() + role.slice(1),
        });
      } else if (mounted) {
        setUserProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutSuccess(false);
    setLogoutError(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setLogoutSuccess(true);
      toast.success("Profile updated successfully.", {
        description: "You have been securely signed out of your session.",
      });
      setTimeout(() => {
        setIsDialogOpen(false);
        router.push("/login");
      }, 1500);
    } catch (err: unknown) {
      setLogoutError(true);
      toast.error("Unable to save changes. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const name = userProfile?.name || "Admin";
  const role = userProfile?.role || "Administrator";
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full bg-accent text-accent-foreground border border-border/50 hover:bg-accent/80 transition-colors focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="User Account Menu"
          >
            <span className="text-xs font-semibold tracking-wider font-mono">{initials}</span>
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-56 font-sans">
          {/* User Profile Header */}
          <DropdownMenuLabel className="flex flex-col px-2.5 py-2">
            <span className="text-sm font-semibold text-foreground truncate">{name}</span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mt-0.5">{role}</span>
            {userProfile?.email && (
              <span className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{userProfile.email}</span>
            )}
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />

          {/* Menu Items */}
          <DropdownMenuItem 
            onClick={() => router.push("/profile")}
            className={cn(
              "text-xs cursor-pointer focus:bg-accent",
              pathname === "/profile" && "text-primary font-semibold bg-accent/40"
            )}
          >
            <User className="mr-2 h-4 w-4 text-muted-foreground" /> My Profile
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => router.push("/settings")}
            className={cn(
              "text-xs cursor-pointer focus:bg-accent",
              pathname === "/settings" && "text-primary font-semibold bg-accent/40"
            )}
          >
            <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => router.push("/help")}
            className={cn(
              "text-xs cursor-pointer focus:bg-accent",
              pathname === "/help" && "text-primary font-semibold bg-accent/40"
            )}
          >
            <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Help
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />

          {/* Destructive Sign Out */}
          <DropdownMenuItem 
            onClick={() => setIsDialogOpen(true)}
            className="text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 dark:focus:bg-destructive/20 font-medium"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Controlled Logout Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[360px] font-sans">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Sign out?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1.5">
              Are you sure you want to sign out of ISCMS?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-row gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoggingOut}
              className="text-xs px-4"
            >
              Cancel
            </Button>
            <AsyncActionButton
              variant="destructive"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              isSuccess={logoutSuccess}
              isError={logoutError}
              idleText="Sign Out"
              loadingText="Processing..."
              successText="Changes saved"
              errorText="Try Again"
              className="text-xs px-4"
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
