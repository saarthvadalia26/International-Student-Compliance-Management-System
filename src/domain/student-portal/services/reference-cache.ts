import { getAdminSupabase } from "@/lib/supabase/admin";

interface AcademicProgramMaps {
  nameMap: Record<string, string>;
  schoolMap: Record<string, string>;
}

interface UploadPolicyInfo {
  uploadWindowDays: number;
  isActive: boolean;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class StudentPortalReferenceCache {
  private static readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private static academicProgramsCache: CacheEntry<AcademicProgramMaps> | null = null;
  private static academicProgramsPromise: Promise<AcademicProgramMaps> | null = null;

  private static referenceDataCache: CacheEntry<Record<string, string>> | null = null;
  private static referenceDataPromise: Promise<Record<string, string>> | null = null;

  private static uploadPoliciesCache: CacheEntry<Record<string, UploadPolicyInfo>> | null = null;
  private static uploadPoliciesPromise: Promise<Record<string, UploadPolicyInfo>> | null = null;

  /**
   * Retrieves mapped academic programs (names & schools) with in-memory TTL caching
   */
  public static async getAcademicProgramMaps(): Promise<AcademicProgramMaps> {
    const now = Date.now();
    if (this.academicProgramsCache && this.academicProgramsCache.expiresAt > now) {
      return this.academicProgramsCache.data;
    }

    if (this.academicProgramsPromise) {
      return this.academicProgramsPromise;
    }

    this.academicProgramsPromise = (async () => {
      try {
        const supabase = getAdminSupabase();
        const { data: progData, error } = await supabase
          .from("academic_programs")
          .select("id, program_code, program_name, school_name");

        const nameMap: Record<string, string> = {};
        const schoolMap: Record<string, string> = {};

        if (!error && progData) {
          progData.forEach((p) => {
            if (p.id) {
              nameMap[p.id] = p.program_name;
              if (p.school_name) schoolMap[p.id] = p.school_name;
            }
            if (p.program_code) {
              nameMap[p.program_code] = p.program_name;
              nameMap[p.program_code.toLowerCase()] = p.program_name;
              nameMap[p.program_code.replace(/_/g, "-")] = p.program_name;
              if (p.school_name) schoolMap[p.program_code] = p.school_name;
            }
            if (p.program_name) {
              nameMap[p.program_name] = p.program_name;
              nameMap[p.program_name.toLowerCase()] = p.program_name;
              if (p.school_name) schoolMap[p.program_name] = p.school_name;
            }
          });
        }

        const result: AcademicProgramMaps = { nameMap, schoolMap };
        this.academicProgramsCache = {
          data: result,
          expiresAt: Date.now() + this.DEFAULT_TTL_MS,
        };
        return result;
      } finally {
        this.academicProgramsPromise = null;
      }
    })();

    return this.academicProgramsPromise;
  }

  /**
   * Retrieves reference data (category codes -> display names) with in-memory TTL caching
   */
  public static async getReferenceDataMap(): Promise<Record<string, string>> {
    const now = Date.now();
    if (this.referenceDataCache && this.referenceDataCache.expiresAt > now) {
      return this.referenceDataCache.data;
    }

    if (this.referenceDataPromise) {
      return this.referenceDataPromise;
    }

    this.referenceDataPromise = (async () => {
      try {
        const supabase = getAdminSupabase();
        const { data: refData, error } = await supabase
          .from("reference_data")
          .select("code, display_name, category")
          .in("category", ["school", "course", "gender"]);

        const refMap: Record<string, string> = {};
        if (!error && refData) {
          refData.forEach((r) => {
            refMap[r.code] = r.display_name;
          });
        }

        this.referenceDataCache = {
          data: refMap,
          expiresAt: Date.now() + this.DEFAULT_TTL_MS,
        };
        return refMap;
      } finally {
        this.referenceDataPromise = null;
      }
    })();

    return this.referenceDataPromise;
  }

  /**
   * Retrieves pre-expiry upload window policies with in-memory TTL caching
   */
  public static async getUploadPolicies(): Promise<Record<string, UploadPolicyInfo>> {
    const now = Date.now();
    if (this.uploadPoliciesCache && this.uploadPoliciesCache.expiresAt > now) {
      return this.uploadPoliciesCache.data;
    }

    if (this.uploadPoliciesPromise) {
      return this.uploadPoliciesPromise;
    }

    this.uploadPoliciesPromise = (async () => {
      try {
        const supabase = getAdminSupabase();
        const { data: policyData, error } = await supabase
          .from("document_upload_policies")
          .select("document_type, upload_window_days, is_active");

        const policyMap: Record<string, UploadPolicyInfo> = {
          passport: { uploadWindowDays: 30, isActive: true },
          visa: { uploadWindowDays: 30, isActive: true },
          efrro: { uploadWindowDays: 30, isActive: true },
        };

        if (!error && policyData) {
          policyData.forEach((p) => {
            if (p.document_type) {
              policyMap[p.document_type] = {
                uploadWindowDays: p.upload_window_days || 30,
                isActive: p.is_active ?? true,
              };
            }
          });
        }

        this.uploadPoliciesCache = {
          data: policyMap,
          expiresAt: Date.now() + this.DEFAULT_TTL_MS,
        };
        return policyMap;
      } finally {
        this.uploadPoliciesPromise = null;
      }
    })();

    return this.uploadPoliciesPromise;
  }

  /**
   * Invalidate cache explicitly if needed (e.g. after admin updates)
   */
  public static clearCache(): void {
    this.academicProgramsCache = null;
    this.referenceDataCache = null;
    this.uploadPoliciesCache = null;
  }
}
