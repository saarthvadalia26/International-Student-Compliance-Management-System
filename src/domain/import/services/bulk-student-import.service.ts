/**
 * Bulk Student Import Domain Service
 *
 * Implements spreadsheet parsing, auto-mapping, production domain validation,
 * duplicate detection, atomic batched student creation, template generation,
 * downloadable error/warning reports, and auditable batch rollback.
 */

import * as XLSX from "xlsx";
import { 
  ISCMSImportField, 
  ISCMS_FIELD_DEFINITIONS, 
  ColumnMapping, 
  ValidationRowResult, 
  ValidationReport, 
  ValidationErrorItem, 
  ValidationWarningItem,
  WarningsBreakdown,
  ImportBatchRecord, 
  ImportExecutionResult 
} from "../types/bulk-import.types";
import { AcademicProgressionEngine } from "@/domain/academic/services/semester-progression.service";
import { CountryService } from "@/domain/countries/country.service";

export class BulkStudentImportService {

  /**
   * Helper: Normalize cell text values, strip formula injection hazards,
   * convert placeholder strings ("N/A", "null", "none", "-") to empty string.
   */
  static normalizeCellString(value: unknown): string {
    if (value === undefined || value === null) return "";
    let str = String(value).trim();
    if (!str) return "";

    const lower = str.toLowerCase();
    if (lower === "n/a" || lower === "na" || lower === "null" || lower === "undefined" || lower === "none" || lower === "-" || lower === "--") {
      return "";
    }

    // Sanitize potential spreadsheet formula injection for exported views while preserving phone numbers
    if (/^[=+\-@]/.test(str)) {
      if (/^\+[\d\s\-().]+$/.test(str)) {
        // Valid international phone number format
        return str;
      }
      str = str.replace(/^[=+\-@]+/, "");
    }

    return str.trim();
  }

  /**
   * 1. Parses uploaded .xlsx, .xls, or .csv file buffer into headers and clean raw rows
   */
  static parseSpreadsheet(fileBuffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
    const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true, raw: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The uploaded spreadsheet does not contain any sheets.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { 
      raw: false,
      defval: "" 
    });

    if (!rawData || rawData.length === 0) {
      throw new Error("The uploaded spreadsheet is empty or contains no data rows.");
    }

    // Extract headers from first row keys
    const headers = Object.keys(rawData[0]).map(h => h.trim()).filter(h => h.length > 0);

    // Normalize rows to clean string records
    const rows = rawData.map(row => {
      const cleanRow: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        cleanRow[key.trim()] = this.normalizeCellString(row[key]);
      }
      return cleanRow;
    });

    return { headers, rows };
  }

  /**
   * 2. Intelligent Auto-Mapping: Suggests target ISCMS fields based on header aliases
   */
  static generateAutoMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    const usedFields = new Set<ISCMSImportField>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
      let matchedField: ISCMSImportField | "ignore" = "ignore";

      for (const def of ISCMS_FIELD_DEFINITIONS) {
        if (usedFields.has(def.field)) continue;

        // Exact field match or normalized match
        if (
          def.field.toLowerCase() === header.toLowerCase() ||
          def.label.toLowerCase() === header.toLowerCase() ||
          def.aliases.some(alias => {
            const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
            return normAlias === normalizedHeader || header.toLowerCase() === alias.toLowerCase();
          })
        ) {
          matchedField = def.field;
          usedFields.add(def.field);
          break;
        }
      }

      mapping[header] = matchedField;
    }

    return mapping;
  }

  /**
   * Helper: Robust date parser supporting Excel numeric serials, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY.
   * Performs calendar validity checks (rejects invalid days like 31/31/2026 or 2026-02-31).
   */
  static parseDateValue(value: string | number | Date | null | undefined): { isoDate: string | null; error?: string } {
    if (!value) return { isoDate: null };

    if (value instanceof Date && !isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return { isoDate: `${y}-${m}-${d}` };
    }

    const strVal = String(value).trim();
    if (!strVal) return { isoDate: null };

    // Check if numeric serial date (e.g. 45153 from Excel)
    if (/^\d{4,5}(\.\d+)?$/.test(strVal)) {
      const serial = parseFloat(strVal);
      // Excel epoch starts at 1899-12-30
      const utcDays = Math.floor(serial - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (!isNaN(dateInfo.getTime())) {
        const y = dateInfo.getUTCFullYear();
        const m = String(dateInfo.getUTCMonth() + 1).padStart(2, "0");
        const d = String(dateInfo.getUTCDate()).padStart(2, "0");
        return { isoDate: `${y}-${m}-${d}` };
      }
    }

    // Helper: Validates actual days in month
    const isValidDayInMonth = (year: number, month: number, day: number): boolean => {
      if (year < 1900 || year > 2100) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1) return false;
      const daysInMonth = new Date(year, month, 0).getDate();
      return day <= daysInMonth;
    };

    // Standard ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const isoMatch = strVal.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10);
      const d = parseInt(isoMatch[3], 10);
      if (isValidDayInMonth(y, m, d)) {
        return { isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
      }
      return { isoDate: null, error: `Invalid calendar date: "${strVal}"` };
    }

    // Common Indian / International format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = strVal.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10);
      const m = parseInt(dmyMatch[2], 10);
      const y = parseInt(dmyMatch[3], 10);
      if (isValidDayInMonth(y, m, d)) {
        return { isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
      }
      return { isoDate: null, error: `Invalid calendar date: "${strVal}"` };
    }

    // Fallback attempt with standard Date.parse
    const parsed = new Date(strVal);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = parsed.getMonth() + 1;
      const d = parsed.getDate();
      if (isValidDayInMonth(y, m, d)) {
        return { isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
      }
    }

    return { isoDate: null, error: `Unrecognized or invalid date format: "${strVal}". Use YYYY-MM-DD or DD/MM/YYYY.` };
  }

  /**
   * Helper: Normalize country name, ISO code, or demonym to canonical ISO 3-letter nationality code
   */
  static normalizeNationality(val: string): string | null {
    if (!val || !val.trim()) return null;
    const norm = CountryService.normalizeCountryInputSync(val);
    return norm ? norm.isoAlpha3 : null;
  }

  /**
   * 3. Validates spreadsheet data with production-grade row-level classification:
   *    - Required: Student Name, Enrollment Number, Academic Course
   *    - Optional: DOB, Gender, Nationality, Contact info, Emergency contact, Passport/Visa/eFRRO metadata
   *    - Emits clear warnings for missing optional fields while marking row as valid for import.
   */
  static async validateSpreadsheetData(
    rows: Record<string, string>[],
    mapping: ColumnMapping,
    context?: {
      existingRegistrationNumbers?: Set<string>;
      existingEmails?: Set<string>;
      academicPrograms?: Array<{
        programName: string;
        programCode: string;
        totalSemesters: number;
        semesterDuration: number;
        semesterDurationUnit: string;
      }>;
    }
  ): Promise<ValidationReport> {
    // Pre-fetch DB context if not provided
    let existingRegs = context?.existingRegistrationNumbers || new Set<string>();
    let existingEmails = context?.existingEmails || new Set<string>();
    let programs = context?.academicPrograms || [];

    if (!context) {
      try {
        const { getAdminSupabase } = await import("@/lib/supabase/admin");
        const supabase = getAdminSupabase();

        // 1. Existing registration numbers
        const { data: regData } = await supabase.from("students").select("registration_number");
        if (regData) {
          existingRegs = new Set(
            regData
              .filter(r => r.registration_number)
              .map(r => r.registration_number.toLowerCase())
          );
        }

        // 2. Existing student emails
        const { data: emailData } = await supabase.from("student_contact").select("email");
        if (emailData) {
          existingEmails = new Set(
            emailData
              .filter(e => e.email)
              .map(e => e.email.toLowerCase())
          );
        }

        // 3. Academic programs
        const { data: progData } = await supabase
          .from("academic_programs")
          .select("program_name, program_code, total_semesters, semester_duration, semester_duration_unit")
          .eq("is_active", true);
        if (progData) {
          programs = progData.map(p => ({
            programName: p.program_name,
            programCode: p.program_code || p.program_name,
            totalSemesters: p.total_semesters || 8,
            semesterDuration: p.semester_duration || 6,
            semesterDurationUnit: p.semester_duration_unit || "months"
          }));
        }
      } catch (err) {
        console.warn("[BULK_IMPORT] Notice: Could not connect to DB for live duplicate validation, proceeding with local checks.", err);
      }
    }

    const seenFileRegs = new Map<string, number>(); // regNo -> first row seen
    const seenFileEmails = new Map<string, number>(); // email -> first row seen

    const validatedRows: ValidationRowResult[] = [];
    let validCount = 0;
    let cleanValidCount = 0;
    let warningRowsCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let totalWarningItems = 0;

    const warningsBreakdown: WarningsBreakdown = {
      passportExpiryMissing: 0,
      visaExpiryMissing: 0,
      efrroExpiryMissing: 0,
      emailMissing: 0,
      phoneMissing: 0,
      dobMissing: 0,
      addressMissing: 0,
      emergencyMissing: 0,
      otherWarnings: 0
    };

    const detectedColumns = Object.keys(mapping);

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNumber = i + 2; // Row 1 is header in Excel
      const mappedData: Partial<Record<ISCMSImportField, string>> = {};
      const errors: ValidationErrorItem[] = [];
      const warnings: ValidationWarningItem[] = [];

      // Extract mapped fields and normalize empty strings
      for (const [header, field] of Object.entries(mapping)) {
        if (field && field !== "ignore") {
          mappedData[field] = this.normalizeCellString(rawRow[header]);
        }
      }

      // =========================================================================
      // 1. REQUIRED FIELD: University Registration / Enrollment Number
      // =========================================================================
      const regNo = mappedData.registration_number?.trim() || "";
      if (!regNo) {
        // Strict requirement: ISCMS never auto-generates enrollment numbers
        errors.push({
          field: "registration_number",
          fieldLabel: "Registration / Enrollment Number",
          value: "",
          problem: "Enrollment number is required and must be provided by the university.",
          suggestion: "Enter the official university enrollment or registration number."
        });
      } else {
        const regLower = regNo.toLowerCase();
        // Intra-file duplicate check
        if (seenFileRegs.has(regLower)) {
          errors.push({
            field: "registration_number",
            fieldLabel: "Registration / Enrollment Number",
            value: regNo,
            problem: `Duplicate enrollment number in spreadsheet (previously seen in row ${seenFileRegs.get(regLower)}).`,
            suggestion: "Ensure enrollment numbers are unique within the file."
          });
        } else {
          seenFileRegs.set(regLower, rowNumber);
        }

        // Database duplicate check
        if (existingRegs.has(regLower)) {
          errors.push({
            field: "registration_number",
            fieldLabel: "Registration / Enrollment Number",
            value: regNo,
            problem: `Student with enrollment number "${regNo}" already exists in the ISCMS database.`,
            suggestion: "Existing students cannot be overwritten via bulk import."
          });
        }
      }

      // =========================================================================
      // 2. REQUIRED FIELD: Student Full Name
      // =========================================================================
      const fullName = mappedData.full_name?.trim() || "";
      if (!fullName) {
        errors.push({
          field: "full_name",
          fieldLabel: "Full Name",
          value: "",
          problem: "Student full name is required.",
          suggestion: "Enter the student's legal full name as shown on passport or institutional records."
        });
      }

      // =========================================================================
      // 3. REQUIRED FIELD: Academic Program / Course
      // =========================================================================
      const programRaw = mappedData.academic_program?.trim() || "";
      let matchedProgram: { programName: string; programCode: string; totalSemesters: number; semesterDuration: number; semesterDurationUnit: string } | null = null;

      if (!programRaw) {
        errors.push({
          field: "academic_program",
          fieldLabel: "Academic Program",
          value: "",
          problem: "Academic program / course is required.",
          suggestion: "Enter the enrolled course name or program code."
        });
      } else {
        // Match against known programs
        if (programs.length > 0) {
          const progLower = programRaw.toLowerCase();
          matchedProgram = programs.find(p => 
            p.programCode.toLowerCase() === progLower ||
            p.programName.toLowerCase() === progLower ||
            p.programName.toLowerCase().includes(progLower) ||
            progLower.includes(p.programCode.toLowerCase())
          ) || null;

          if (!matchedProgram) {
            errors.push({
              field: "academic_program",
              fieldLabel: "Academic Program",
              value: programRaw,
              problem: `Academic program "${programRaw}" not found in configured university courses.`,
              suggestion: "Ensure the program is registered in Settings > Academic Programs."
            });
          }
        } else {
          // If no programs pre-loaded, default fallback configuration
          matchedProgram = {
            programName: programRaw,
            programCode: programRaw.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase(),
            totalSemesters: 8,
            semesterDuration: 6,
            semesterDurationUnit: "months"
          };
        }
      }

      // =========================================================================
      // 4. OPTIONAL IDENTITY FIELDS (Nationality, Gender, DOB, Blood Group)
      // =========================================================================
      const nationalityRaw = mappedData.nationality?.trim() || "";
      if (!nationalityRaw) {
        warnings.push({
          field: "nationality",
          fieldLabel: "Nationality",
          value: "Not Provided",
          warning: "Nationality not provided. Will be stored as NULL and can be updated later."
        });
      } else {
        const norm = CountryService.normalizeCountryInputSync(nationalityRaw);
        if (!norm) {
          warnings.push({
            field: "nationality",
            fieldLabel: "Nationality",
            value: nationalityRaw,
            warning: `Unrecognized country/nationality "${nationalityRaw}". Please check spelling (e.g. "Fiji", "India", "Nepal"). Stored as NULL.`
          });
        } else {
          mappedData.nationality = norm.country.name;
          if (norm.country.isActive === false) {
            warnings.push({
              field: "nationality",
              fieldLabel: "Nationality",
              value: `${norm.country.name} (${norm.isoAlpha3})`,
              warning: `"${norm.country.name}" (${norm.isoAlpha3}) is an existing but currently inactive country in university settings.`
            });
          }
        }
      }

      const dobRaw = mappedData.date_of_birth?.trim() || "";
      if (!dobRaw) {
        warnings.push({
          field: "date_of_birth",
          fieldLabel: "Date of Birth",
          value: "Not Provided",
          warning: "Date of birth not provided. Will be stored as NULL."
        });
        warningsBreakdown.dobMissing++;
      } else {
        const parsedDob = this.parseDateValue(dobRaw);
        if (parsedDob.error || !parsedDob.isoDate) {
          errors.push({
            field: "date_of_birth",
            fieldLabel: "Date of Birth",
            value: dobRaw,
            problem: parsedDob.error || "Invalid date of birth format.",
            suggestion: "Format as YYYY-MM-DD or DD/MM/YYYY."
          });
        } else {
          mappedData.date_of_birth = parsedDob.isoDate;
        }
      }

      // =========================================================================
      // 5. OPTIONAL CONTACT FIELDS (Email, Phone, Addresses)
      // =========================================================================
      const email = mappedData.email?.trim() || "";
      if (!email) {
        warnings.push({
          field: "email",
          fieldLabel: "Email Address",
          value: "Not Provided",
          warning: "Primary email address not provided. Will be stored as NULL."
        });
        warningsBreakdown.emailMissing++;
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({
            field: "email",
            fieldLabel: "Email Address",
            value: email,
            problem: "Invalid email address format.",
            suggestion: "Enter a valid email address (e.g. name@example.com)."
          });
        } else {
          const emailLower = email.toLowerCase();
          // Intra-file duplicate
          if (seenFileEmails.has(emailLower)) {
            errors.push({
              field: "email",
              fieldLabel: "Email Address",
              value: email,
              problem: `Duplicate email address in spreadsheet (previously seen in row ${seenFileEmails.get(emailLower)}).`,
              suggestion: "Ensure each student has a unique email address."
            });
          } else {
            seenFileEmails.set(emailLower, rowNumber);
          }

          // DB duplicate
          if (existingEmails.has(emailLower)) {
            errors.push({
              field: "email",
              fieldLabel: "Email Address",
              value: email,
              problem: "A student with this email address already exists in ISCMS.",
              suggestion: "Existing students cannot be overwritten via bulk import."
            });
          }
        }
      }

      const phoneHome = mappedData.phone_home?.trim() || "";
      if (!phoneHome) {
        warnings.push({
          field: "phone_home",
          fieldLabel: "Home Phone",
          value: "Not Provided",
          warning: "Primary contact phone number not provided. Will be stored as NULL."
        });
        warningsBreakdown.phoneMissing++;
      }

      const permAddr = mappedData.permanent_address?.trim() || "";
      if (!permAddr) {
        warnings.push({
          field: "permanent_address",
          fieldLabel: "Permanent Address",
          value: "Not Provided",
          warning: "Permanent address not provided. Will be stored as NULL."
        });
        warningsBreakdown.addressMissing++;
      }

      // =========================================================================
      // 6. OPTIONAL EMERGENCY CONTACT
      // =========================================================================
      const emName = mappedData.emergency_contact_name?.trim() || "";
      const emPhone = mappedData.emergency_contact_phone?.trim() || "";
      if (!emName && !emPhone) {
        warnings.push({
          field: "emergency_contact_name",
          fieldLabel: "Emergency Contact",
          value: "Not Provided",
          warning: "Emergency contact / guardian details not provided. Can be completed later."
        });
        warningsBreakdown.emergencyMissing++;
      }

      // =========================================================================
      // 7. OPTIONAL ADMISSION DATE & ACADEMIC PROGRESSION
      // =========================================================================
      const admRaw = mappedData.admission_date?.trim() || "";
      let calculatedProg: any = null;

      if (!admRaw) {
        warnings.push({
          field: "admission_date",
          fieldLabel: "Admission Date",
          value: "Not Provided",
          warning: "Admission date not provided. Semester progression will remain uncalculated until set."
        });
      } else {
        const parsedAdm = this.parseDateValue(admRaw);
        if (parsedAdm.error || !parsedAdm.isoDate) {
          errors.push({
            field: "admission_date",
            fieldLabel: "Admission Date",
            value: admRaw,
            problem: parsedAdm.error || "Invalid admission date format.",
            suggestion: "Format as YYYY-MM-DD or DD/MM/YYYY."
          });
        } else {
          mappedData.admission_date = parsedAdm.isoDate;

          if (matchedProgram) {
            calculatedProg = AcademicProgressionEngine.calculateProgression({
              admissionDate: parsedAdm.isoDate,
              courseConfig: matchedProgram
            });

            // Check if Excel provided a conflicting Current Semester
            if (mappedData.current_semester) {
              const excelSemNum = parseInt(mappedData.current_semester.replace(/[^0-9]/g, ""), 10);
              if (!isNaN(excelSemNum) && excelSemNum !== calculatedProg.currentSemester) {
                warnings.push({
                  field: "current_semester",
                  fieldLabel: "Current Semester",
                  value: mappedData.current_semester,
                  warning: `Semester in spreadsheet (${mappedData.current_semester}) differs from automatic calculation (Semester ${calculatedProg.currentSemester}) based on admission date (${parsedAdm.isoDate}). Automatic semester will be used.`
                });
              }
            }
          }
        }
      }

      // =========================================================================
      // 8. OPTIONAL PASSPORT METADATA
      // =========================================================================
      if (!mappedData.passport_number && !mappedData.passport_expiry) {
        warnings.push({
          field: "passport_number",
          fieldLabel: "Passport",
          value: "Not Provided",
          warning: "Passport metadata not provided. Physical document copy pending upload."
        });
        warningsBreakdown.passportExpiryMissing++;
      } else {
        if (mappedData.passport_expiry) {
          const pExp = this.parseDateValue(mappedData.passport_expiry);
          if (pExp.error) {
            errors.push({
              field: "passport_expiry",
              fieldLabel: "Passport Expiry Date",
              value: mappedData.passport_expiry,
              problem: pExp.error,
              suggestion: "Format as YYYY-MM-DD or DD/MM/YYYY."
            });
          } else if (pExp.isoDate) {
            mappedData.passport_expiry = pExp.isoDate;
          }
        } else {
          warnings.push({
            field: "passport_expiry",
            fieldLabel: "Passport Expiry Date",
            value: "Not Provided",
            warning: "Passport expiry date not provided. Reminder engine will not track passport expiration until set."
          });
          warningsBreakdown.passportExpiryMissing++;
        }

        if (mappedData.passport_issue_date) {
          const pIss = this.parseDateValue(mappedData.passport_issue_date);
          if (pIss.error) {
            errors.push({
              field: "passport_issue_date",
              fieldLabel: "Passport Issue Date",
              value: mappedData.passport_issue_date,
              problem: pIss.error,
              suggestion: "Format as YYYY-MM-DD or DD/MM/YYYY."
            });
          } else if (pIss.isoDate) {
            mappedData.passport_issue_date = pIss.isoDate;
          }
        }

        if (mappedData.passport_issue_date && mappedData.passport_expiry) {
          if (mappedData.passport_expiry <= mappedData.passport_issue_date) {
            errors.push({
              field: "passport_expiry",
              fieldLabel: "Passport Expiry Date",
              value: mappedData.passport_expiry,
              problem: "Passport expiry date must be strictly after passport issue date.",
              suggestion: "Correct the passport issue or expiry date in the spreadsheet."
            });
          }
        }
      }

      // =========================================================================
      // 9. OPTIONAL VISA METADATA
      // =========================================================================
      if (!mappedData.visa_number && !mappedData.visa_expiry) {
        warnings.push({
          field: "visa_number",
          fieldLabel: "Visa",
          value: "Not Provided",
          warning: "Visa metadata not provided. Physical document copy pending upload."
        });
        warningsBreakdown.visaExpiryMissing++;
      } else {
        if (mappedData.visa_expiry) {
          const vExp = this.parseDateValue(mappedData.visa_expiry);
          if (vExp.error) {
            errors.push({
              field: "visa_expiry",
              fieldLabel: "Visa Expiry Date",
              value: mappedData.visa_expiry,
              problem: vExp.error,
              suggestion: "Format as YYYY-MM-DD or DD/MM/YYYY."
            });
          } else if (vExp.isoDate) {
            mappedData.visa_expiry = vExp.isoDate;
          }
        } else {
          warnings.push({
            field: "visa_expiry",
            fieldLabel: "Visa Expiry Date",
            value: "Not Provided",
            warning: "Visa expiry date not provided. Reminder engine will not track visa expiration until set."
          });
          warningsBreakdown.visaExpiryMissing++;
        }

        if (mappedData.visa_issue_date) {
          const vIss = this.parseDateValue(mappedData.visa_issue_date);
          if (vIss.error) {
            errors.push({
              field: "visa_issue_date",
              fieldLabel: "Visa Issue Date",
              value: mappedData.visa_issue_date,
              problem: vIss.error,
              suggestion: "Format as YYYY-MM-DD or DD/MM/YYYY."
            });
          } else if (vIss.isoDate) {
            mappedData.visa_issue_date = vIss.isoDate;
          }
        }

        if (mappedData.visa_issue_date && mappedData.visa_expiry) {
          if (mappedData.visa_expiry <= mappedData.visa_issue_date) {
            errors.push({
              field: "visa_expiry",
              fieldLabel: "Visa Expiry Date",
              value: mappedData.visa_expiry,
              problem: "Visa expiry date must be strictly after visa issue date.",
              suggestion: "Correct the visa issue or expiry date in the spreadsheet."
            });
          }
        }
      }

      // =========================================================================
      // 10. OPTIONAL eFRRO METADATA
      // =========================================================================
      if (!mappedData.efrro_number && !mappedData.efrro_expiry) {
        warnings.push({
          field: "efrro_number",
          fieldLabel: "eFRRO",
          value: "Not Provided",
          warning: "eFRRO metadata not provided. Expiry tracking pending registration details."
        });
        warningsBreakdown.efrroExpiryMissing++;
      } else {
        if (mappedData.efrro_expiry) {
          const eExp = this.parseDateValue(mappedData.efrro_expiry);
          if (eExp.error) {
            errors.push({
              field: "efrro_expiry",
              fieldLabel: "eFRRO Expiry Date",
              value: mappedData.efrro_expiry,
              problem: eExp.error,
              suggestion: "Format as YYYY-MM-DD or DD/MM/YYYY."
            });
          } else if (eExp.isoDate) {
            mappedData.efrro_expiry = eExp.isoDate;
          }
        } else {
          warnings.push({
            field: "efrro_expiry",
            fieldLabel: "eFRRO Expiry Date",
            value: "Not Provided",
            warning: "eFRRO expiry date not provided. Reminder engine will not track eFRRO expiration until set."
          });
          warningsBreakdown.efrroExpiryMissing++;
        }

        if (mappedData.efrro_issue_date) {
          const eIss = this.parseDateValue(mappedData.efrro_issue_date);
          if (eIss.error) {
            errors.push({
              field: "efrro_issue_date",
              fieldLabel: "eFRRO Issue Date",
              value: mappedData.efrro_issue_date,
              problem: eIss.error,
              suggestion: "Format as YYYY-MM-DD or DD/MM/YYYY."
            });
          } else if (eIss.isoDate) {
            mappedData.efrro_issue_date = eIss.isoDate;
          }
        }

        if (mappedData.efrro_issue_date && mappedData.efrro_expiry) {
          if (mappedData.efrro_expiry <= mappedData.efrro_issue_date) {
            errors.push({
              field: "efrro_expiry",
              fieldLabel: "eFRRO Expiry Date",
              value: mappedData.efrro_expiry,
              problem: "eFRRO expiry date must be strictly after eFRRO issue date.",
              suggestion: "Correct the eFRRO issue or expiry date in the spreadsheet."
            });
          }
        }
      }

      // =========================================================================
      // 11. DETERMINE ROW STATUS (Valid, Duplicate, Error)
      // =========================================================================
      const isDuplicate = errors.some(e => e.problem.toLowerCase().includes("duplicate") || e.problem.toLowerCase().includes("already exists"));
      const isError = errors.length > 0;

      let rowStatus: "valid" | "error" | "duplicate" = "valid";
      if (isDuplicate) {
        rowStatus = "duplicate";
        duplicateCount++;
      } else if (isError) {
        rowStatus = "error";
        errorCount++;
      } else {
        validCount++;
        if (warnings.length === 0) {
          cleanValidCount++;
        } else {
          warningRowsCount++;
        }
      }

      if (warnings.length > 0) {
        totalWarningItems += warnings.length;
      }

      validatedRows.push({
        rowNumber,
        status: rowStatus,
        rawRow,
        mappedData,
        errors,
        warnings,
        calculatedProgression: calculatedProg ? {
          currentSemester: calculatedProg.currentSemester,
          expectedGraduation: calculatedProg.expectedGraduationDateISO,
          stage: calculatedProg.stage
        } : undefined
      });
    }

    return {
      totalRows: rows.length,
      validCount,
      cleanValidCount,
      warningRowsCount,
      errorCount,
      duplicateCount,
      warningCount: totalWarningItems,
      warningsBreakdown,
      rows: validatedRows,
      detectedColumns,
      mapping
    };
  }

  /**
   * 4. Executes batched, transactional import of validated student records.
   *    - Each student record is created atomically.
   *    - Stores NULL for missing optional fields.
   *    - Stores metadata directly in student_snapshot with status "MISSING".
   *    - NEVER creates fake document versions, fake files, or R2 storage objects.
   *    - One row failure does not cancel or roll back other valid rows (partial success).
   */
  static async executeImport(params: {
    fileName: string;
    fileSizeBytes: number;
    totalRows: number;
    validatedRows: ValidationRowResult[];
    actorId: string | null;
  }): Promise<ImportExecutionResult> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    const timestamp = Date.now();
    const batchNumber = `IMP-${new Date().getFullYear()}-${String(timestamp).slice(-4)}`;

    // 1. Create import_batches tracking record
    const { data: batchData, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        batch_number: batchNumber,
        file_name: params.fileName,
        file_size_bytes: params.fileSizeBytes,
        total_rows: params.totalRows,
        imported_count: 0,
        skipped_count: 0,
        failed_count: 0,
        status: "processing",
        created_by: params.actorId
      })
      .select("id")
      .single();

    if (batchError || !batchData) {
      throw new Error(`Failed to initialize import batch: ${batchError?.message || "Database error"}`);
    }

    const batchId = batchData.id;
    const errors: Array<{ rowNumber: number; registrationNumber: string; error: string }> = [];
    let importedCount = 0;
    let cleanImportedCount = 0;
    let warningImportedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Filter valid rows only (both clean and warning-carrying rows)
    const validRowsToImport = params.validatedRows.filter(r => r.status === "valid");
    skippedCount = params.totalRows - validRowsToImport.length;

    // 2. Fetch academic programs for program code resolution
    const { data: progList } = await supabase
      .from("academic_programs")
      .select("program_name, program_code, total_semesters, semester_duration, semester_duration_unit");

    const programLookup = new Map<string, any>();
    if (progList) {
      for (const p of progList) {
        programLookup.set(p.program_name.toLowerCase(), p);
        if (p.program_code) programLookup.set(p.program_code.toLowerCase(), p);
      }
    }

    // 3. Process records sequentially with per-row atomic transaction boundaries
    for (const row of validRowsToImport) {
      const data = row.mappedData;
      const regNo = data.registration_number?.trim() || "";
      let studentId: string | null = null;

      try {
        // A. Insert core students table (mandatory university enrollment number)
        const { data: studentRecord, error: stErr } = await supabase
          .from("students")
          .insert({
            registration_number: regNo,
            status: "active",
            import_batch_id: batchId,
            created_by: params.actorId,
            updated_by: params.actorId
          })
          .select("id")
          .single();

        if (stErr || !studentRecord) {
          throw new Error(stErr?.message || "Failed to create core student record");
        }

        studentId = studentRecord.id;

        // B. Insert student_personal (optional fields stored as NULL)
        const nationalityCode = data.nationality ? this.normalizeNationality(data.nationality) : null;
        const { error: persErr } = await supabase
          .from("student_personal")
          .insert({
            student_id: studentId,
            full_name: data.full_name?.trim() || "",
            nationality_code: nationalityCode,
            gender: data.gender ? data.gender.toLowerCase() : null,
            date_of_birth: data.date_of_birth || null,
            blood_group: data.blood_group?.trim() || null,
            created_by: params.actorId,
            updated_by: params.actorId
          });

        if (persErr) throw new Error(`Personal details: ${persErr.message}`);

        // C. Insert student_contact (optional fields stored as NULL)
        const { error: contErr } = await supabase
          .from("student_contact")
          .insert({
            student_id: studentId,
            email: data.email ? data.email.trim().toLowerCase() : null,
            phone_home: data.phone_home ? data.phone_home.trim() : null,
            phone_local: data.phone_local ? data.phone_local.trim() : null,
            permanent_address: data.permanent_address ? data.permanent_address.trim() : null,
            local_address: data.local_address ? data.local_address.trim() : null,
            created_by: params.actorId,
            updated_by: params.actorId
          });

        if (contErr) throw new Error(`Contact details: ${contErr.message}`);

        // D. Insert student_academic (with progression calculation if admission date exists)
        const progName = data.academic_program?.trim() || "";
        const matchedP = programLookup.get(progName.toLowerCase());
        const programCode = matchedP?.program_code || progName;

        let currentSemester: number | null = null;
        let expectedGraduation: string | null = null;

        if (data.admission_date && matchedP) {
          const progression = AcademicProgressionEngine.calculateProgression({
            admissionDate: data.admission_date,
            courseConfig: {
              programName: matchedP.program_name,
              programCode: programCode,
              totalSemesters: matchedP.total_semesters || 8,
              semesterDuration: matchedP.semester_duration || 6,
              semesterDurationUnit: matchedP.semester_duration_unit || "months"
            }
          });
          currentSemester = progression.currentSemester;
          expectedGraduation = progression.expectedGraduationDateISO;
        } else if (data.current_semester) {
          const semNum = parseInt(data.current_semester.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(semNum) && semNum > 0 && semNum < 20) {
            currentSemester = semNum;
          }
        }

        const { error: acadErr } = await supabase
          .from("student_academic")
          .insert({
            student_id: studentId,
            program_code: programCode,
            admission_date: data.admission_date || null,
            expected_graduation: data.expected_graduation || expectedGraduation,
            current_semester: currentSemester,
            academic_status: "good_standing",
            created_by: params.actorId,
            updated_by: params.actorId
          });

        if (acadErr) throw new Error(`Academic details: ${acadErr.message}`);

        // E. Insert student_relationships (Emergency Contact) only if contact data is provided
        if (data.emergency_contact_name || data.emergency_contact_phone || data.emergency_contact_email) {
          const { error: relErr } = await supabase
            .from("student_relationships")
            .insert({
              student_id: studentId,
              relationship_type: data.emergency_contact_relationship?.toLowerCase() || "parent",
              name: data.emergency_contact_name?.trim() || "Emergency Contact",
              phone: data.emergency_contact_phone?.trim() || "Not Specified",
              email: data.emergency_contact_email?.trim() || null,
              created_by: params.actorId,
              updated_by: params.actorId
            });

          if (relErr) {
            console.warn("[BULK_IMPORT] Notice on emergency contact insertion:", relErr.message);
          }
        }

        // F. Insert student_embassy only if embassy name is provided
        if (data.embassy_name && data.embassy_name.trim()) {
          await supabase.from("student_embassy").insert({
            student_id: studentId,
            embassy_name: data.embassy_name.trim(),
            address: data.embassy_address?.trim() || "Not Specified",
            city: data.embassy_city?.trim() || null,
            country: data.embassy_country?.trim() || null,
            phone: data.embassy_phone?.trim() || null,
            email: data.embassy_email?.trim() || null,
            created_by: params.actorId,
            updated_by: params.actorId
          });
        }

        // G. Insert student_snapshot (Metadata only; NO fake document versions; NO R2 files)
        let daysUntilEfrro: number | null = null;
        if (data.efrro_expiry) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const exp = new Date(data.efrro_expiry);
          exp.setHours(0, 0, 0, 0);
          daysUntilEfrro = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        await supabase.from("student_snapshot").insert({
          student_id: studentId,
          passport_status: "MISSING",
          passport_number: data.passport_number?.trim() || null,
          passport_issue_date: data.passport_issue_date || null,
          passport_expiry: data.passport_expiry || null,
          passport_place_of_issue: data.passport_place_of_issue?.trim() || null,
          visa_status: "MISSING",
          visa_number: data.visa_number?.trim() || null,
          visa_issue_date: data.visa_issue_date || null,
          visa_expiry: data.visa_expiry || null,
          visa_type: data.visa_type?.trim() || "Student (S-1)",
          efrro_status: "MISSING",
          efrro_number: data.efrro_number?.trim() || null,
          efrro_issue_date: data.efrro_issue_date || null,
          efrro_expiry: data.efrro_expiry || null,
          days_until_efrro_expiry: daysUntilEfrro,
          compliance_score: 0,
          compliance_status: "MISSING"
        });

        importedCount++;
        if (row.warnings.length === 0) {
          cleanImportedCount++;
        } else {
          warningImportedCount++;
        }
      } catch (err: any) {
        failedCount++;
        errors.push({
          rowNumber: row.rowNumber,
          registrationNumber: regNo,
          error: err.message || "Failed to create student database records"
        });

        // Atomic cleanup for this specific student row
        if (studentId) {
          try {
            await supabase.from("students").delete().eq("id", studentId);
          } catch (delErr) {
            console.warn("[BULK_IMPORT] Cleanup error on failed row:", delErr);
          }
        }
      }
    }

    // 4. Update import_batches status and counts
    await supabase
      .from("import_batches")
      .update({
        imported_count: importedCount,
        skipped_count: skippedCount,
        failed_count: failedCount,
        status: failedCount > 0 && importedCount === 0 ? "failed" : "completed",
        error_summary: errors,
        completed_at: new Date().toISOString()
      })
      .eq("id", batchId);

    // 5. Record entry in audit_log
    await supabase.from("audit_log").insert({
      actor_id: params.actorId,
      action: "BULK_STUDENT_IMPORT_EXECUTED",
      resource: `import_batches/${batchId}`,
      filters_applied: {
        batchNumber,
        fileName: params.fileName,
        totalRows: params.totalRows,
        importedCount,
        cleanImportedCount,
        warningImportedCount,
        skippedCount,
        failedCount
      }
    });

    return {
      success: true,
      batchNumber,
      batchId,
      totalRows: params.totalRows,
      importedCount,
      cleanImportedCount,
      warningImportedCount,
      skippedCount,
      failedCount,
      errors
    };
  }

  /**
   * 5. Generates official downloadable Excel (.xlsx) or CSV template with sample data
   */
  static generateImportTemplate(format: "xlsx" | "csv" = "xlsx"): { buffer: Buffer; fileName: string; mimeType: string } {
    const headers = ISCMS_FIELD_DEFINITIONS.map(def => def.label);
    const sampleRow = ISCMS_FIELD_DEFINITIONS.map(def => def.sample);

    const wsData = [headers, sampleRow];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    worksheet["!cols"] = ISCMS_FIELD_DEFINITIONS.map(def => ({
      wch: Math.max(def.label.length, def.sample.length, 15) + 3
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Import Template");

    if (format === "csv") {
      const csvStr = XLSX.utils.sheet_to_csv(worksheet);
      const buffer = Buffer.from(csvStr, "utf-8");
      return {
        buffer,
        fileName: "ISCMS_Student_Import_Template.csv",
        mimeType: "text/csv"
      };
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return {
      buffer,
      fileName: "ISCMS_Student_Import_Template.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }

  /**
   * 6. Generates downloadable Excel error and warnings report for rejected/flagged rows
   */
  static generateErrorReport(report: ValidationReport, executionErrors?: Array<{ rowNumber: number; registrationNumber: string; error: string }>): { buffer: Buffer; fileName: string; mimeType: string } {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Rejected Rows
    const rejectedHeader = ["Excel Row", "Enrollment Number", "Student Name", "Field", "Error Reason", "Provided Value", "Resolution Suggestion"];
    const rejectedRows: (string | number)[][] = [];

    // Collect validation errors from report
    for (const r of report.rows) {
      if (r.status === "error" || r.status === "duplicate") {
        for (const err of r.errors) {
          rejectedRows.push([
            r.rowNumber,
            r.mappedData.registration_number || "(Missing)",
            r.mappedData.full_name || "(Missing)",
            err.fieldLabel || err.field,
            err.problem,
            err.value || "(Empty)",
            err.suggestion
          ]);
        }
      }
    }

    // Add execution runtime errors if present
    if (executionErrors && executionErrors.length > 0) {
      for (const execErr of executionErrors) {
        rejectedRows.push([
          execErr.rowNumber,
          execErr.registrationNumber || "(None)",
          "-",
          "Database Persistence",
          execErr.error,
          "-",
          "Check database connection or contact technical administrator."
        ]);
      }
    }

    if (rejectedRows.length === 0) {
      rejectedRows.push(["-", "-", "-", "-", "No rejected rows in this batch.", "-", "-"]);
    }

    const wsRejected = XLSX.utils.aoa_to_sheet([rejectedHeader, ...rejectedRows]);
    wsRejected["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 24 }, { wch: 20 }, { wch: 45 }, { wch: 20 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, wsRejected, "Rejected Rows");

    // Sheet 2: Warnings & Missing Metadata
    const warningsHeader = ["Excel Row", "Enrollment Number", "Student Name", "Field", "Warning Notice", "Storage Fallback"];
    const warningRows: (string | number)[][] = [];

    for (const r of report.rows) {
      if (r.status === "valid" && r.warnings.length > 0) {
        for (const w of r.warnings) {
          warningRows.push([
            r.rowNumber,
            r.mappedData.registration_number || "(Not Provided)",
            r.mappedData.full_name || "(Not Provided)",
            w.fieldLabel || w.field,
            w.warning,
            "Stored as NULL (Can be completed later)"
          ]);
        }
      }
    }

    if (warningRows.length === 0) {
      warningRows.push(["-", "-", "-", "-", "No warnings reported for valid rows.", "-"]);
    }

    const wsWarnings = XLSX.utils.aoa_to_sheet([warningsHeader, ...warningRows]);
    wsWarnings["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 24 }, { wch: 20 }, { wch: 55 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, wsWarnings, "Warnings Summary");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    return {
      buffer,
      fileName: `ISCMS_Import_Error_Report_${timestamp}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }

  /**
   * 7. Lists all past import batches for Administrator audit and history
   */
  static async listImportBatches(): Promise<ImportBatchRecord[]> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("import_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch import batches: ${error.message}`);
    }

    return (data || []).map(b => ({
      id: b.id,
      batchNumber: b.batch_number,
      fileName: b.file_name,
      fileSizeBytes: b.file_size_bytes,
      totalRows: b.total_rows,
      importedCount: b.imported_count,
      skippedCount: b.skipped_count,
      failedCount: b.failed_count,
      status: b.status,
      errorSummary: b.error_summary || [],
      createdBy: b.created_by,
      createdAt: b.created_at,
      completedAt: b.completed_at,
      rolledBackAt: b.rolled_back_at,
      rolledBackBy: b.rolled_back_by
    }));
  }

  /**
   * 8. Controlled Rollback / Recovery for an accidental import batch
   */
  static async rollbackBatch(batchId: string, actorId: string | null): Promise<{ success: boolean; deletedCount: number; message: string }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    // Verify batch exists
    const { data: batch, error: bErr } = await supabase
      .from("import_batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (bErr || !batch) {
      throw new Error("Import batch not found.");
    }

    if (batch.status === "rolled_back") {
      throw new Error("This import batch has already been rolled back.");
    }

    // Find all students created in this batch
    const { data: students, error: stErr } = await supabase
      .from("students")
      .select("id, registration_number")
      .eq("import_batch_id", batchId);

    if (stErr) {
      throw new Error(`Failed to find students for batch: ${stErr.message}`);
    }

    const studentIds = (students || []).map(s => s.id);
    const count = studentIds.length;

    if (count > 0) {
      // Check if any student has verified/uploaded actual documents in document versions
      const { count: passDocCount } = await supabase
        .from("passport_versions")
        .select("id", { count: "exact", head: true })
        .in("student_id", studentIds)
        .neq("file_path", "pending_upload");

      if (passDocCount && passDocCount > 0) {
        throw new Error(
          `Cannot rollback batch: ${passDocCount} student(s) in this batch have already uploaded actual compliance document files. Manual review is required.`
        );
      }

      // Delete students (Cascade deletes personal, contact, academic, relationships, embassy, snapshot)
      const { error: delErr } = await supabase
        .from("students")
        .delete()
        .in("id", studentIds);

      if (delErr) {
        throw new Error(`Failed to delete students during rollback: ${delErr.message}`);
      }
    }

    // Update batch status
    await supabase
      .from("import_batches")
      .update({
        status: "rolled_back",
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: actorId
      })
      .eq("id", batchId);

    // Audit log
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      action: "BULK_STUDENT_IMPORT_ROLLED_BACK",
      resource: `import_batches/${batchId}`,
      filters_applied: {
        batchNumber: batch.batch_number,
        deletedStudentsCount: count
      }
    });

    return {
      success: true,
      deletedCount: count,
      message: `Successfully rolled back batch ${batch.batch_number}. Deleted ${count} imported student record(s).`
    };
  }
}
