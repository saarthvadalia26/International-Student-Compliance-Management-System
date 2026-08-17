"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, Settings, HelpCircle, LogOut, UserCheck, AlertCircle } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useUserRole } from "@/hooks/use-user-role";
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
import { ProfileCompletionDialog } from "@/components/profile/profile-completion-dialog";
import { getInitials, isNameComplete } from "@/utils/name-utils";
import { toast } from "sonner";

export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getBrowserSupabase();
  const { isAdministrator } = useUserRole();
  
  const [userProfile, setUserProfile] = React.useState<{
    name: string;
    email: string;
    role: string;
    isComplete: boolean;
  } | null>(null);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
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
          
          const rawName = (metadata.full_name as string | undefined)?.trim();
          const hasCompleteName = isNameComplete(rawName);
          const name = hasCompleteName ? (rawName as string) : "Profile Incomplete";

          const rawRole = (metadata.role as string | undefined)?.toLowerCase().trim();
          const displayRole =
            rawRole === "administrator" || rawRole === "admin"
              ? "Administrator"
              : rawRole === "staff"
              ? "Staff"
              : metadata.role
              ? String(metadata.role).charAt(0).toUpperCase() + String(metadata.role).slice(1)
              : "Staff Member";

          setUserProfile({
            email,
            name,
            role: displayRole,
            isComplete: hasCompleteName,
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
        
        const rawName = (metadata.full_name as string | undefined)?.trim();
        const hasCompleteName = isNameComplete(rawName);
        const name = hasCompleteName ? (rawName as string) : "Profile Incomplete";

        const rawRole = (metadata.role as string | undefined)?.toLowerCase().trim();
        const displayRole =
          rawRole === "administrator" || rawRole === "admin"
            ? "Administrator"
            : rawRole === "staff"
            ? "Staff"
            : metadata.role
            ? String(metadata.role).charAt(0).toUpperCase() + String(metadata.role).slice(1)
            : "Staff Member";

        setUserProfile({
          email,
          name,
          role: displayRole,
          isComplete: hasCompleteName,
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
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        throw error;
      }
      setLogoutSuccess(true);
      toast.success("Signed out successfully.", {
        description: "You have been securely signed out of your session.",
      });
      setTimeout(() => {
        setIsDialogOpen(false);
        router.push("/login");
      }, 1200);
    } catch {
      setLogoutError(true);
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const name = userProfile?.name || "User";
  const role = userProfile?.role || "Staff";
  const isComplete = userProfile?.isComplete ?? false;
  const initials = isComplete ? getInitials(name) : "--";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full bg-accent text-accent-foreground border border-border/60 hover:bg-accent/80 transition-colors focus-visible:ring-1 focus-visible:ring-ring shrink-0"
            aria-label="User Account Menu"
          >
            {isComplete ? (
              <span className="text-xs font-semibold tracking-wider font-mono">{initials}</span>
            ) : (
              <User className="h-4 w-4 text-amber-500" />
            )}
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)] font-sans p-1">
          {/* User Profile Header with Clean Visual Hierarchy */}
          <DropdownMenuLabel className="flex flex-col px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className={cn(
                "text-sm font-bold leading-tight break-words",
                isComplete ? "text-foreground" : "text-amber-600 dark:text-amber-400"
              )}>
                {name}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
                {role}
              </span>
            </div>

            {userProfile?.email && (
              <span className="text-[11px] text-muted-foreground truncate mt-1.5 font-normal">
                {userProfile.email}
              </span>
            )}

            {!isComplete && (
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer text-left"
              >
                <AlertCircle className="h-3 w-3 shrink-0" /> Complete your profile name
              </button>
            )}
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />

          {/* Menu Items */}
          <DropdownMenuItem 
            onClick={() => router.push("/profile")}
            className={cn(
              "text-xs cursor-pointer focus:bg-accent py-2",
              pathname === "/profile" && "text-primary font-semibold bg-accent/40"
            )}
          >
            <User className="mr-2 h-4 w-4 text-muted-foreground" /> My Profile
          </DropdownMenuItem>

          {/* Settings — Administrator only */}
          {isAdministrator && (
            <DropdownMenuItem 
              onClick={() => router.push("/settings")}
              className={cn(
                "text-xs cursor-pointer focus:bg-accent py-2",
                pathname === "/settings" && "text-primary font-semibold bg-accent/40"
              )}
            >
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Settings
            </DropdownMenuItem>
          )}

          <DropdownMenuItem 
            onClick={() => router.push("/help")}
            className={cn(
              "text-xs cursor-pointer focus:bg-accent py-2",
              pathname === "/help" && "text-primary font-semibold bg-accent/40"
            )}
          >
            <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Help & Documentation
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />

          {/* Destructive Sign Out */}
          <DropdownMenuItem 
            onClick={() => setIsDialogOpen(true)}
            className="text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 dark:focus:bg-destructive/20 font-medium py-2"
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
              loadingText="Signing out..."
              successText="Signed out"
              errorText="Try Again"
              className="text-xs px-4"
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Completion Modal Trigger */}
      <ProfileCompletionDialog
        isOpen={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        onCompleted={(newName) => {
          setUserProfile((prev) =>
            prev
              ? {
                  ...prev,
                  name: newName,
                  isComplete: true,
                }
              : null
          );
        }}
      />
    </>
  );
}
