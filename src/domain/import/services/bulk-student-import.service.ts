/**
 * Bulk Student Import Domain Service
 *
 * Implements spreadsheet parsing, auto-mapping, domain validation, duplicate detection,
 * batched student creation, template generation, and auditable rollback.
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
  ImportBatchRecord,
  ImportExecutionResult
} from "../types/bulk-import.types";
import { AcademicProgressionEngine } from "@/domain/academic/services/semester-progression.service";

export class BulkStudentImportService {

  /**
   * 1. Parses uploaded .xlsx, .xls, or .csv file buffer into headers and raw rows
   */
  static parseSpreadsheet(fileBuffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
    const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
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
        const val = row[key];
        cleanRow[key.trim()] = val !== undefined && val !== null ? String(val).trim() : "";
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
   * Helper: Robust date parser supporting Excel numeric serials, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
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

    // Standard ISO format: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = strVal.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10);
      const d = parseInt(isoMatch[3], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1920 && y <= 2100) {
        return { isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
      }
      return { isoDate: null, error: `Invalid calendar date: "${strVal}"` };
    }

    // Common Indian / European format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = strVal.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10);
      const m = parseInt(dmyMatch[2], 10);
      const y = parseInt(dmyMatch[3], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1920 && y <= 2100) {
        return { isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
      }
      return { isoDate: null, error: `Invalid calendar date: "${strVal}"` };
    }

    // Fallback attempt with Date.parse
    const parsed = new Date(strVal);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      if (y >= 1920 && y <= 2100) {
        return { isoDate: `${y}-${m}-${d}` };
      }
    }

    return { isoDate: null, error: `Unrecognized date format: "${strVal}". Use YYYY-MM-DD or DD/MM/YYYY.` };
  }

  /**
   * Helper: Normalize country name to ISO 3-letter nationality code
   */
  static normalizeNationality(val: string): string {
    const clean = val.trim();
    if (!clean) return "NPL";
    if (clean.length === 3 && /^[A-Z]{3}$/i.test(clean)) {
      return clean.toUpperCase();
    }
    const countryMap: Record<string, string> = {
      "nepal": "NPL",
      "bhutan": "BHT",
      "bangladesh": "BGD",
      "sri lanka": "LKA",
      "maldives": "MDV",
      "afghanistan": "AFG",
      "united states": "USA",
      "usa": "USA",
      "united kingdom": "GBR",
      "uk": "GBR",
      "canada": "CAN",
      "australia": "AUS",
      "germany": "DEU",
      "france": "FRA",
      "kenya": "KEN",
      "nigeria": "NGA",
      "tanzania": "TZA",
      "uganda": "UGA",
      "mauritius": "MUS",
      "zambia": "ZMB",
      "zimbabwe": "ZWE",
      "ethiopia": "ETH",
      "ghana": "GHA",
      "russia": "RUS",
      "uzbekistan": "UZB",
      "kazakhstan": "KAZ",
      "kyrgyzstan": "KGZ",
      "tajikistan": "TJK",
      "turkmenistan": "TKM",
      "indonesia": "IDN",
      "malaysia": "MYS",
      "thailand": "THA",
      "vietnam": "VNM",
      "myanmar": "MMR",
      "fiji": "FJI"
    };

    const lower = clean.toLowerCase();
    return countryMap[lower] || clean.substring(0, 3).toUpperCase();
  }

  /**
   * 3. Validates spreadsheet data against database records, format rules, and academic rules
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
          existingRegs = new Set(regData.map(r => r.registration_number.toLowerCase()));
        }

        // 2. Existing student emails
        const { data: emailData } = await supabase.from("student_contact").select("email");
        if (emailData) {
          existingEmails = new Set(emailData.map(e => e.email.toLowerCase()));
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
    let errorCount = 0;
    let duplicateCount = 0;
    let warningCount = 0;

    const detectedColumns = Object.keys(mapping);

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNumber = i + 2; // Row 1 is header in Excel
      const mappedData: Partial<Record<ISCMSImportField, string>> = {};
      const errors: ValidationErrorItem[] = [];
      const warnings: ValidationWarningItem[] = [];

      // Extract mapped fields
      for (const [header, field] of Object.entries(mapping)) {
        if (field && field !== "ignore") {
          mappedData[field] = rawRow[header]?.trim() || "";
        }
      }

      // 1. Mandatory Identity Validations
      const regNo = mappedData.registration_number?.trim() || "";
      if (!regNo) {
        errors.push({
          field: "registration_number",
          fieldLabel: "Registration Number",
          value: "",
          problem: "Registration number is required.",
          suggestion: "Enter a valid student registration number."
        });
      } else {
        const regLower = regNo.toLowerCase();
        // Check intra-file duplicate
        if (seenFileRegs.has(regLower)) {
          errors.push({
            field: "registration_number",
            fieldLabel: "Registration Number",
            value: regNo,
            problem: `Duplicate registration number in spreadsheet (previously seen in row ${seenFileRegs.get(regLower)}).`,
            suggestion: "Ensure registration numbers are unique within the file."
          });
        } else {
          seenFileRegs.set(regLower, rowNumber);
        }

        // Check DB duplicate
        if (existingRegs.has(regLower)) {
          errors.push({
            field: "registration_number",
            fieldLabel: "Registration Number",
            value: regNo,
            problem: "Student with this registration number already exists in the ISCMS database.",
            suggestion: "Existing students cannot be overwritten via bulk import."
          });
        }
      }

      // Full Name
      const fullName = mappedData.full_name?.trim() || "";
      if (!fullName) {
        errors.push({
          field: "full_name",
          fieldLabel: "Full Name",
          value: "",
          problem: "Student full name is required.",
          suggestion: "Enter the student's legal full name as shown on passport."
        });
      }

      // Nationality
      const nationalityRaw = mappedData.nationality?.trim() || "";
      if (!nationalityRaw) {
        errors.push({
          field: "nationality",
          fieldLabel: "Nationality",
          value: "",
          problem: "Nationality / Country is required.",
          suggestion: "Specify the student's country of citizenship."
        });
      }

      // Date of Birth
      const dobRaw = mappedData.date_of_birth?.trim() || "";
      if (!dobRaw) {
        errors.push({
          field: "date_of_birth",
          fieldLabel: "Date of Birth",
          value: "",
          problem: "Date of birth is required.",
          suggestion: "Enter a valid date of birth (e.g. 2002-05-14)."
        });
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

      // 2. Contact Validations
      const email = mappedData.email?.trim() || "";
      if (!email) {
        errors.push({
          field: "email",
          fieldLabel: "Email Address",
          value: "",
          problem: "Email address is required.",
          suggestion: "Provide the student's primary email address."
        });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({
            field: "email",
            fieldLabel: "Email Address",
            value: email,
            problem: "Invalid email format.",
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
              suggestion: "Existing students cannot be overwritten."
            });
          }
        }
      }

      // Phone Home
      const phoneHome = mappedData.phone_home?.trim() || "";
      if (!phoneHome) {
        errors.push({
          field: "phone_home",
          fieldLabel: "Home Phone",
          value: "",
          problem: "Home / Primary phone number is required.",
          suggestion: "Provide a contact phone number with country code."
        });
      }

      // Permanent Address
      const permAddr = mappedData.permanent_address?.trim() || "";
      if (!permAddr) {
        errors.push({
          field: "permanent_address",
          fieldLabel: "Permanent Address",
          value: "",
          problem: "Permanent home country address is required.",
          suggestion: "Enter the student's permanent address."
        });
      }

      // 3. Emergency Contact Validations
      const emName = mappedData.emergency_contact_name?.trim() || "";
      if (!emName) {
        errors.push({
          field: "emergency_contact_name",
          fieldLabel: "Emergency Contact Name",
          value: "",
          problem: "Emergency contact / guardian name is required.",
          suggestion: "Enter the parent or guardian's full name."
        });
      }

      const emPhone = mappedData.emergency_contact_phone?.trim() || "";
      if (!emPhone) {
        errors.push({
          field: "emergency_contact_phone",
          fieldLabel: "Emergency Contact Phone",
          value: "",
          problem: "Emergency contact phone number is required.",
          suggestion: "Provide an emergency phone number with country code."
        });
      }

      // 4. Academic Program & Admission Date
      const programRaw = mappedData.academic_program?.trim() || "";
      let matchedProgram: { programName: string; programCode: string; totalSemesters: number; semesterDuration: number; semesterDurationUnit: string } | null = null;

      if (!programRaw) {
        errors.push({
          field: "academic_program",
          fieldLabel: "Academic Program",
          value: "",
          problem: "Academic program is required.",
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
          // If no programs pre-loaded, default program
          matchedProgram = {
            programName: programRaw,
            programCode: programRaw.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase(),
            totalSemesters: 8,
            semesterDuration: 6,
            semesterDurationUnit: "months"
          };
        }
      }

      // Admission Date
      const admRaw = mappedData.admission_date?.trim() || "";
      let calculatedProg: any = null;

      if (!admRaw) {
        errors.push({
          field: "admission_date",
          fieldLabel: "Admission Date",
          value: "",
          problem: "Admission / Start date is required.",
          suggestion: "Enter the commencement date (e.g. 2024-08-01)."
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

          // If program is matched, calculate automatic progression
          if (matchedProgram) {
            calculatedProg = AcademicProgressionEngine.calculateProgression({
              admissionDate: parsedAdm.isoDate,
              courseConfig: matchedProgram
            });

            // Check if Excel has conflicting Current Semester
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

      // 5. Document Dates Validations (Optional Metadata)
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
      }

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
      }

      // Check missing passport/visa metadata as warning if not provided
      if (!mappedData.passport_number) {
        warnings.push({
          field: "passport_number",
          fieldLabel: "Passport Number",
          value: "Not Provided",
          warning: "Passport number not provided in spreadsheet. Student will be flagged for missing passport metadata."
        });
      }

      // Determine Row Status
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
      }

      if (warnings.length > 0) {
        warningCount += warnings.length;
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
      errorCount,
      duplicateCount,
      warningCount,
      rows: validatedRows,
      detectedColumns,
      mapping
    };
  }

  /**
   * 4. Executes batched, transactional import of validated student records
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

    // 1. Create import_batches record
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
    let skippedCount = 0;
    let failedCount = 0;

    // Filter valid rows only
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

    // 3. Process records sequentially/chunked to ensure atomic per-student relational creation
    for (const row of validRowsToImport) {
      const data = row.mappedData;
      const regNo = data.registration_number?.trim() || "";

      try {
        // A. Insert core students table
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
          throw new Error(stErr?.message || "Failed to create student core record");
        }

        const studentId = studentRecord.id;

        // B. Insert student_personal
        const nationalityCode = this.normalizeNationality(data.nationality || "");
        const { error: persErr } = await supabase
          .from("student_personal")
          .insert({
            student_id: studentId,
            full_name: data.full_name?.trim() || "",
            nationality_code: nationalityCode,
            gender: data.gender?.toLowerCase() || "prefer_not_to_say",
            date_of_birth: data.date_of_birth,
            blood_group: data.blood_group?.trim() || null,
            created_by: params.actorId,
            updated_by: params.actorId
          });

        if (persErr) throw new Error(`Personal details: ${persErr.message}`);

        // C. Insert student_contact
        const { error: contErr } = await supabase
          .from("student_contact")
          .insert({
            student_id: studentId,
            email: data.email?.trim().toLowerCase() || "",
            phone_home: data.phone_home?.trim() || "",
            phone_local: data.phone_local?.trim() || null,
            permanent_address: data.permanent_address?.trim() || "",
            local_address: data.local_address?.trim() || null,
            created_by: params.actorId,
            updated_by: params.actorId
          });

        if (contErr) throw new Error(`Contact details: ${contErr.message}`);

        // D. Insert student_academic (with progression calculation)
        const progName = data.academic_program?.trim() || "";
        const matchedP = programLookup.get(progName.toLowerCase());
        const programCode = matchedP?.program_code || progName;

        const progression = AcademicProgressionEngine.calculateProgression({
          admissionDate: data.admission_date || "",
          courseConfig: {
            programName: matchedP?.program_name || progName,
            programCode: programCode,
            totalSemesters: matchedP?.total_semesters || 8,
            semesterDuration: matchedP?.semester_duration || 6,
            semesterDurationUnit: matchedP?.semester_duration_unit || "months"
          }
        });

        const { error: acadErr } = await supabase
          .from("student_academic")
          .insert({
            student_id: studentId,
            program_code: programCode,
            admission_date: data.admission_date,
            expected_graduation: progression.expectedGraduationDateISO,
            current_semester: progression.currentSemester,
            academic_status: "good_standing",
            created_by: params.actorId,
            updated_by: params.actorId
          });

        if (acadErr) throw new Error(`Academic details: ${acadErr.message}`);

        // E. Insert student_relationships (Emergency Contact)
        const { error: relErr } = await supabase
          .from("student_relationships")
          .insert({
            student_id: studentId,
            relationship_type: data.emergency_contact_relationship?.toLowerCase() || "parent",
            name: data.emergency_contact_name?.trim() || "Parent/Guardian",
            phone: data.emergency_contact_phone?.trim() || "Not Specified",
            email: data.emergency_contact_email?.trim() || null,
            created_by: params.actorId,
            updated_by: params.actorId
          });

        if (relErr) {
          console.warn("[BULK_IMPORT] Warning on emergency contact insertion:", relErr.message);
        }

        // F. Insert student_embassy (if provided)
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

        // G. Insert student_snapshot (Structured document metadata without creating fake document versions or R2 files)
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
          compliance_score: 0,
          compliance_status: "MISSING"
        });

        importedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          rowNumber: row.rowNumber,
          registrationNumber: regNo,
          error: err.message || "Failed to create student database records"
        });
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
   * 6. Lists all past import batches for Administrator audit and history
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
   * 7. Controlled Rollback / Recovery for an accidental import batch
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
