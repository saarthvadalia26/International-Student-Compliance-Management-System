import crypto from "crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";

interface StoredOtpRecord {
  id: string;
  studentId: string;
  mobileNumber: string;
  otpHash: string;
  attemptsCount: number;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory OTP fallback store for development/testing
const memoryOtpStore = new Map<string, StoredOtpRecord>();

const whatsappService = new WhatsAppService();
// SECURITY: SUPABASE_JWT_SECRET must be configured in production.
// Falling back to a hardcoded default will make OTP tokens cryptographically weak.
if (!process.env.SUPABASE_JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[SECURITY_WARNING] SUPABASE_JWT_SECRET is not set. Student OTP HMAC is using an insecure default secret. Set SUPABASE_JWT_SECRET in the production environment.");
}
const OTP_SECRET = process.env.SUPABASE_JWT_SECRET || "nfsu-iscm-otp-secret-2026";

export class StudentOtpService {
  /**
   * Normalize input phone number into E.164 format (+919876543210)
   */
  public normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+")) {
      return cleaned;
    }
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
      return `+${cleaned}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Mask phone number for public display (e.g. "+91 ***** **210")
   */
  public maskPhoneNumber(phone: string): string {
    if (!phone) return "No Phone Registered";
    const normalized = this.normalizePhoneNumber(phone);
    if (normalized.length < 8) return "****";
    const prefix = normalized.substring(0, 3);
    const suffix = normalized.substring(normalized.length - 3);
    return `${prefix} ***** **${suffix}`;
  }

  /**
   * Hash 6-digit OTP using SHA-256 with salt
   */
  private hashOtp(otp: string): string {
    return crypto
      .createHash("sha256")
      .update(`${otp}:${OTP_SECRET}`)
      .digest("hex");
  }

  /**
   * Constant time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Find active student by permanent University Registration / Enrollment Number
   */
  public async findStudentByIdentifier(rawIdentifier: string): Promise<{
    studentId: string;
    registrationNumber: string;
    fullName: string;
    email: string;
    whatsappNumber: string | null;
    isDisabled: boolean;
  } | null> {
    const supabase = getAdminSupabase();
    const identifier = rawIdentifier.trim();

    // Query core students record by registration_number or ID
    const { data: student, error } = await supabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        student_personal(full_name),
        student_contact(email, phone_local, phone_home)
      `)
      .or(`registration_number.ilike.${identifier},id.eq.${identifier}`)
      .maybeSingle();

    if (error || !student) {
      // Security fallback: Search for case-insensitive partial or exact match
      const { data: allStudents } = await supabase
        .from("students")
        .select(`
          id,
          registration_number,
          status,
          student_personal(full_name),
          student_contact(email, phone_local, phone_home)
        `)
        .limit(100);

      const match = allStudents?.find(
        s => s.registration_number?.toLowerCase() === identifier.toLowerCase() ||
             s.id === identifier
      );

      if (!match) return null;
      return this.formatStudentMatch(match);
    }

    return this.formatStudentMatch(student);
  }

  private formatStudentMatch(student: Record<string, unknown>) {
    const personalRecord = student.student_personal as unknown as { full_name?: string }[] | { full_name?: string } | null;
    const fullName = Array.isArray(personalRecord) 
      ? personalRecord[0]?.full_name || "NFSU Student"
      : personalRecord?.full_name || "NFSU Student";

    const contactRecord = student.student_contact as unknown as { email?: string; phone_local?: string; phone_home?: string }[] | { email?: string; phone_local?: string; phone_home?: string } | null;
    const contact = Array.isArray(contactRecord) ? contactRecord[0] : contactRecord;

    const studentId = String(student.id || "");
    const registrationNumber = String(student.registration_number || student.id || "");
    const email = contact?.email || `student_${studentId.substring(0, 8)}@nfsu.ac.in`;
    const whatsappNumber = contact?.phone_local || contact?.phone_home || null;
    const isDisabled = student.status === "suspended" || student.status === "disabled" || student.status === "withdrawn";

    return {
      studentId,
      registrationNumber,
      fullName,
      email,
      whatsappNumber,
      isDisabled
    };
  }

  /**
   * Check duplicate WhatsApp number across active students
   */
  public async isDuplicateWhatsAppNumber(rawPhone: string, excludeStudentId?: string): Promise<boolean> {
    const supabase = getAdminSupabase();
    const normalized = this.normalizePhoneNumber(rawPhone);
    const plainDigits = normalized.replace(/\+/g, "");

    const { data: contacts } = await supabase
      .from("student_contact")
      .select("student_id, phone_local, phone_home");

    if (!contacts) return false;

    for (const c of contacts) {
      if (excludeStudentId && c.student_id === excludeStudentId) continue;
      const localNorm = c.phone_local ? this.normalizePhoneNumber(c.phone_local) : "";
      const homeNorm = c.phone_home ? this.normalizePhoneNumber(c.phone_home) : "";

      if (localNorm === normalized || homeNorm === normalized ||
          (c.phone_local && c.phone_local.replace(/[^\d]/g, "") === plainDigits)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Log contact number modification in student_contact_audit
   */
  public async logContactNumberUpdate(
    studentId: string,
    previousPhone: string | null,
    newPhone: string,
    updatedBy?: string | null,
    reason?: string
  ): Promise<void> {
    const supabase = getAdminSupabase();
    try {
      await supabase
        .from("student_contact_audit")
        .insert({
          student_id: studentId,
          previous_phone: previousPhone || null,
          new_phone: newPhone,
          updated_by: updatedBy || null,
          reason: reason || "Administrator profile modification"
        });

      await supabase
        .from("student_activity_log")
        .insert({
          student_id: studentId,
          action: "WHATSAPP_NUMBER_UPDATED_BY_ADMIN",
          details: { previous_phone: previousPhone, new_phone: newPhone, reason }
        });
    } catch (err) {
      console.warn("[OTP_SERVICE_AUDIT_WARN] Failed writing contact audit:", err);
    }
  }

  /**
   * Generate, hash, store, and dispatch WhatsApp OTP using permanent Student Registration Number
   */
  public async generateAndSendOtpByIdentifier(rawIdentifier: string): Promise<{
    success: boolean;
    registrationNumber?: string;
    maskedPhone?: string;
    cooldownSeconds?: number;
    error?: string;
  }> {
    const student = await this.findStudentByIdentifier(rawIdentifier);

    if (!student) {
      // Security Defense: Generic response preventing student registration number probing
      console.log(`[OTP_GENERATE] Enrollment No ${rawIdentifier} not found. Returning generic response.`);
      return {
        success: true,
        registrationNumber: rawIdentifier.toUpperCase(),
        maskedPhone: "+91 ***** **000",
        cooldownSeconds: 60
      };
    }

    if (student.isDisabled) {
      return {
        success: false,
        error: "Your student account has been disabled by the university administrator. Please contact the International Student Office."
      };
    }

    if (!student.whatsappNumber) {
      return {
        success: false,
        error: "No verified WhatsApp mobile number is registered for your Enrollment Number. Please contact the International Student Office to update your contact profile."
      };
    }

    const normalizedPhone = this.normalizePhoneNumber(student.whatsappNumber);

    // 2. Generate 6-digit cryptographically secure OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const recordId = crypto.randomUUID();

    console.log(`[OTP_GENERATE_SECURE] Generated OTP for Registration ${student.registrationNumber} (ID: ${student.studentId}): [OTP_HASH: ${otpHash.substring(0, 10)}...]`);

    // 3. Persist hashed OTP to Supabase DB or Memory Fallback
    const supabase = getAdminSupabase();

    // Mark previous active OTPs for this student_id as used
    await supabase
      .from("student_otp_verifications")
      .update({ is_used: true })
      .eq("student_id", student.studentId)
      .eq("is_used", false);

    const { error: dbError } = await supabase
      .from("student_otp_verifications")
      .insert({
        id: recordId,
        student_id: student.studentId,
        mobile_number: normalizedPhone,
        otp_hash: otpHash,
        attempts_count: 0,
        is_used: false,
        expires_at: expiresAt.toISOString()
      });

    if (dbError) {
      console.warn("[OTP_GENERATE_DB_WARN] Using memory fallback store:", dbError.message);
      memoryOtpStore.set(student.studentId, {
        id: recordId,
        studentId: student.studentId,
        mobileNumber: normalizedPhone,
        otpHash,
        attemptsCount: 0,
        isUsed: false,
        expiresAt,
        createdAt: new Date()
      });
    }

    // 4. Dispatch WhatsApp Message
    try {
      await whatsappService.sendWhatsApp({
        recipientPhone: normalizedPhone,
        templateName: "student_otp",
        templateParameters: {
          code: rawOtp,
          name: student.fullName,
          validity: "5 minutes"
        }
      });
    } catch (wsErr: unknown) {
      const msg = wsErr instanceof Error ? wsErr.message : String(wsErr);
      console.log(`[WHATSAPP_DISPATCH_NOTICE] WhatsApp dispatch: ${msg}`);
    }

    // 5. Audit Log
    try {
      await supabase
        .from("student_activity_log")
        .insert({
          student_id: student.studentId,
          action: "OTP_GENERATED_BY_REGISTRATION_NO",
          details: { registration_number: student.registrationNumber, phone_masked: this.maskPhoneNumber(normalizedPhone) }
        });
    } catch {}

    return {
      success: true,
      registrationNumber: student.registrationNumber,
      maskedPhone: this.maskPhoneNumber(normalizedPhone),
      cooldownSeconds: 60
    };
  }

  /**
   * Verify 6-digit WhatsApp OTP input bound to Student Registration Number
   */
  public async verifyOtpByIdentifier(
    rawIdentifier: string, 
    inputOtp: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<{
    success: boolean;
    studentId?: string;
    studentEmail?: string;
    error?: string;
  }> {
    const student = await this.findStudentByIdentifier(rawIdentifier);

    if (!student) {
      return { success: false, error: "Enrollment Number not recognized. Please check your details." };
    }

    const cleanedOtp = inputOtp.replace(/\D/g, "");
    if (cleanedOtp.length !== 6) {
      return { success: false, error: "Please enter a valid 6-digit verification code." };
    }

    const inputHash = this.hashOtp(cleanedOtp);
    const supabase = getAdminSupabase();

    // 1. Fetch latest pending OTP record by student_id
    let otpRecord: StoredOtpRecord | null = null;

    const { data: dbData } = await supabase
      .from("student_otp_verifications")
      .select("*")
      .eq("student_id", student.studentId)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbData) {
      otpRecord = {
        id: dbData.id,
        studentId: dbData.student_id,
        mobileNumber: dbData.mobile_number,
        otpHash: dbData.otp_hash,
        attemptsCount: dbData.attempts_count,
        isUsed: dbData.is_used,
        expiresAt: new Date(dbData.expires_at),
        createdAt: new Date(dbData.created_at)
      };
    } else {
      otpRecord = memoryOtpStore.get(student.studentId) || null;
    }

    if (!otpRecord) {
      return {
        success: false,
        error: "Verification code expired or not found. Please request a new code."
      };
    }

    // 2. Validate expiration
    if (new Date() > otpRecord.expiresAt) {
      return {
        success: false,
        error: "The verification code has expired. Please click 'Resend OTP' to receive a new code."
      };
    }

    // 3. Validate attempt rate-limiting (< 5 attempts)
    if (otpRecord.attemptsCount >= 5) {
      return {
        success: false,
        error: "Maximum verification attempts exceeded. For security, please request a new verification code."
      };
    }

    // 4. Compare OTP Hash
    const isMatch = this.constantTimeCompare(inputHash, otpRecord.otpHash);

    if (!isMatch) {
      const newAttempts = otpRecord.attemptsCount + 1;
      otpRecord.attemptsCount = newAttempts;

      await supabase
        .from("student_otp_verifications")
        .update({ attempts_count: newAttempts })
        .eq("id", otpRecord.id);

      if (memoryOtpStore.has(student.studentId)) {
        memoryOtpStore.get(student.studentId)!.attemptsCount = newAttempts;
      }

      try {
        await supabase
          .from("student_activity_log")
          .insert({
            student_id: student.studentId,
            action: "OTP_VERIFICATION_FAILED",
            ip_address: ipAddress || null,
            user_agent: userAgent || null,
            details: { attempts: newAttempts }
          });
      } catch {}

      const remaining = 5 - newAttempts;
      return {
        success: false,
        error: remaining > 0 
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : "Maximum verification attempts exceeded. Please request a new code."
      };
    }

    // 5. Successful Verification: Mark OTP as used
    await supabase
      .from("student_otp_verifications")
      .update({ is_used: true })
      .eq("id", otpRecord.id);

    memoryOtpStore.delete(student.studentId);

    // Audit log login success
    try {
      await supabase
        .from("student_activity_log")
        .insert({
          student_id: student.studentId,
          action: "LOGIN_SUCCESS_ENROLLMENT_NO_OTP",
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          details: { registration_number: student.registrationNumber, channel: "WHATSAPP_OTP" }
        });
    } catch {}

    return {
      success: true,
      studentId: student.studentId,
      studentEmail: student.email
    };
  }
}
