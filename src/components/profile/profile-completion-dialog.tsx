"use client";

import * as React from "react";
import { UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { updateMyProfileNameAction } from "@/app/(app)/profile/actions";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { isNameComplete } from "@/utils/name-utils";
import { toast } from "sonner";

interface ProfileCompletionDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCompleted?: (newName: string) => void;
}

export function ProfileCompletionDialog({
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  onCompleted,
}: ProfileCompletionDialogProps) {
  const supabase = getBrowserSupabase();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;
  const setOpen = (open: boolean) => {
    if (controlledOnOpenChange) controlledOnOpenChange(open);
    else setInternalOpen(open);
  };

  // Auto-detect missing profile name on mount
  React.useEffect(() => {
    let mounted = true;

    async function checkProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const rawName = (session.user.user_metadata?.full_name as string | undefined)?.trim();
          if (!isNameComplete(rawName)) {
            if (!isControlled) {
              setInternalOpen(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to check profile completion status:", err);
      }
    }

    if (!isControlled) {
      checkProfile();
    }

    return () => {
      mounted = false;
    };
  }, [supabase, isControlled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = fullName.trim();
    if (!isNameComplete(clean)) {
      toast.error("Validation Error", {
        description: "Please enter a valid full name (at least 2 characters).",
      });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      await updateMyProfileNameAction(clean);
      setSaveSuccess(true);
      toast.success("Profile updated successfully", {
        description: `Welcome, ${clean}. Your institutional identity is now established.`,
      });

      if (onCompleted) {
        onCompleted(clean);
      }

      setTimeout(() => {
        setOpen(false);
      }, 700);
    } catch (err: unknown) {
      setSaveError(true);
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      toast.error("Error saving profile", { description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[440px] font-sans border-border">
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
            <UserCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold text-foreground">
            Complete Your Profile
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            Please provide your real full name to establish your institutional identity across ISCMS.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Full Name <span className="text-destructive">*</span></span>
              <span className="text-[10px] text-muted-foreground font-normal">e.g. Dr. Skvadalia Shah, Rahul Kumar</span>
            </label>
            <Input
              type="text"
              required
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your real full name"
              className="text-sm h-10 font-sans"
              disabled={isSaving}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Your real name will be displayed in the header, account menu, and system activity logs.
            </p>
          </div>

          <DialogFooter className="mt-6 flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Skip for now
            </Button>
            <AsyncActionButton
              type="submit"
              variant="default"
              size="sm"
              isLoading={isSaving}
              isSuccess={saveSuccess}
              isError={saveError}
              idleText="Save Profile"
              loadingText="Saving..."
              successText="Profile Saved!"
              errorText="Try Again"
              className="text-xs px-4"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
