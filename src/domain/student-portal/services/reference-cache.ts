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

        const { DEFAULT_FALLBACK_PROGRAMS, LEGACY_PROGRAM_ALIASES } = await import("@/domain/academic-programs/academic-program.service");
        const nameMap: Record<string, string> = {};
        const schoolMap: Record<string, string> = {};

        const programList = (!error && progData && progData.length > 0)
          ? progData.map(p => ({
              id: p.id,
              program_name: p.program_name,
              program_code: p.program_code,
              school_name: p.school_name
            }))
          : DEFAULT_FALLBACK_PROGRAMS.map(p => ({
              id: p.id,
              program_name: p.programName,
              program_code: p.programCode,
              school_name: p.schoolName
            }));

        programList.forEach((p) => {
          const name = p.program_name || "";
          const school = p.school_name || "Academic Faculty";
          const normName = name.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();

          if (p.id) {
            nameMap[p.id] = name;
            nameMap[p.id.toLowerCase()] = name;
            if (school) schoolMap[p.id] = school;
          }
          if (p.program_code) {
            nameMap[p.program_code] = name;
            nameMap[p.program_code.toLowerCase()] = name;
            nameMap[p.program_code.replace(/_/g, "-")] = name;
            nameMap[p.program_code.replace(/_/g, "-").toLowerCase()] = name;
            nameMap[p.program_code.replace(/-/g, "_")] = name;
            nameMap[p.program_code.replace(/-/g, "_").toLowerCase()] = name;
            if (school) schoolMap[p.program_code] = school;
          }
          if (name) {
            nameMap[name] = name;
            nameMap[name.toLowerCase()] = name;
            nameMap[normName] = name;
            if (school) schoolMap[name] = school;
          }
        });

        // Add legacy aliases
        Object.entries(LEGACY_PROGRAM_ALIASES).forEach(([alias, targetCode]) => {
          const canonicalName = nameMap[targetCode.toLowerCase()];
          if (canonicalName) {
            nameMap[alias] = canonicalName;
            nameMap[alias.toLowerCase()] = canonicalName;
            nameMap[alias.replace(/_/g, "-").toLowerCase()] = canonicalName;
          }
        });

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
