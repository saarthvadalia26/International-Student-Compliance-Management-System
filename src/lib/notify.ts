import { toast as sonnerToast, ExternalToast } from "sonner";

/**
 * Standardized Notification Durations (in milliseconds)
 */
export const TOAST_DURATIONS = {
  SUCCESS: 3000, // 3 seconds
  INFO: 4000,    // 4 seconds
  WARNING: 5000, // 5 seconds
  ERROR: 6000,   // 6 seconds
};

export interface NotifyOptions extends ExternalToast {
  description?: string;
  id?: string;
}

export const notify = {
  /**
   * Display a success notification (Auto-dismisses in 3 seconds)
   * Examples: Student added successfully, Document uploaded successfully, Changes saved
   */
  success(message: string, options?: NotifyOptions): string | number {
    return sonnerToast.success(message, {
      duration: TOAST_DURATIONS.SUCCESS,
      id: options?.id || message,
      ...options,
    });
  },

  /**
   * Display an informational notification (Auto-dismisses in 4 seconds)
   * Examples: Loading complete, Reminder scheduled, Notification sent
   */
  info(message: string, options?: NotifyOptions): string | number {
    return sonnerToast.info(message, {
      duration: TOAST_DURATIONS.INFO,
      id: options?.id || message,
      ...options,
    });
  },

  /**
   * Display a warning notification (Auto-dismisses in 5 seconds)
   * Examples: Unsaved changes, Session about to expire, Missing optional information
   */
  warning(message: string, options?: NotifyOptions): string | number {
    return sonnerToast.warning(message, {
      duration: TOAST_DURATIONS.WARNING,
      id: options?.id || message,
      ...options,
    });
  },

  /**
   * Display an error notification (Auto-dismisses in 6 seconds)
   * Examples: Upload failed, Network connection lost, Validation failed
   */
  error(message: string, options?: NotifyOptions): string | number {
    return sonnerToast.error(message, {
      duration: TOAST_DURATIONS.ERROR,
      id: options?.id || message,
      ...options,
    });
  },

  /**
   * Dismiss a specific active notification or all active notifications immediately
   */
  dismiss(id?: string | number): void {
    sonnerToast.dismiss(id);
  },
};

/**
 * Global alias for easy drop-in replacement
 */
export const toast = notify;
