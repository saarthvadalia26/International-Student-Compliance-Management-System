import { systemStateService, SystemStateResult } from "./system-state.service";

export interface AdministratorDetectionResult {
  administratorExists: boolean;
  administratorCount: number;
  isDbInitialized: boolean;
  recoveryRequired: boolean;
  isFreshInstallation: boolean;
  isInitialized: boolean;
  timestamp: number;
}

export const administratorDetectionService = {
  /**
   * Delegates to systemStateService for intelligent Fresh Installation vs Recovery Mode detection.
   */
  async detectAdministratorState(forceRefresh = false): Promise<AdministratorDetectionResult> {
    const state: SystemStateResult = await systemStateService.getSystemState(forceRefresh);
    return {
      administratorExists: state.administratorExists,
      administratorCount: state.administratorCount,
      isDbInitialized: state.isDbInitialized,
      recoveryRequired: state.isRecoveryMode,
      isFreshInstallation: state.isFreshInstallation,
      isInitialized: state.isInitialized,
      timestamp: state.timestamp,
    };
  },

  invalidateCache(): void {
    systemStateService.invalidateCache();
  },
};
