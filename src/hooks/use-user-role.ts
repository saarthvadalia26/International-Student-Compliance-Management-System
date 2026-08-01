"use client";

/**
 * useUserRole — Reactive client-side hook
 *
 * Returns the current user's role, derived from the Supabase auth session.
 * Subscribes to auth state changes so the UI updates immediately on login/logout.
 *
 * Usage:
 *   const { role, isAdministrator, isStaff, isLoading } = useUserRole();
 */

import * as React from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { AppRole } from "@/lib/auth/permissions";
import { getAppRole } from "@/lib/auth/permissions";

interface UserRoleState {
  role: AppRole | null;
  isAdministrator: boolean;
  isStaff: boolean;
  isInternalUser: boolean;
  isLoading: boolean;
}

const initialState: UserRoleState = {
  role: null,
  isAdministrator: false,
  isStaff: false,
  isInternalUser: false,
  isLoading: true,
};

export function useUserRole(): UserRoleState {
  const [state, setState] = React.useState<UserRoleState>(initialState);
  const supabase = getBrowserSupabase();

  React.useEffect(() => {
    let mounted = true;

    async function resolve() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const role = getAppRole(session?.user ?? null);
        setState({
          role,
          isAdministrator: role === "administrator",
          isStaff: role === "staff",
          isInternalUser: role === "administrator" || role === "staff",
          isLoading: false,
        });
      } catch {
        if (mounted) setState({ ...initialState, isLoading: false });
      }
    }

    resolve();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const role = getAppRole(session?.user ?? null);
      setState({
        role,
        isAdministrator: role === "administrator",
        isStaff: role === "staff",
        isInternalUser: role === "administrator" || role === "staff",
        isLoading: false,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}
