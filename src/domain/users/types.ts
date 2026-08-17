/**
 * User Profile & Identity Domain Types
 */

import { AppRole } from "@/lib/auth/permissions";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isProfileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileDto {
  fullName: string;
}

export interface CreateStaffUserDto {
  email: string;
  password: string;
  fullName: string;
  role?: "staff" | "administrator";
}
