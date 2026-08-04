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

// In-memory OTP fallback store for development/testing if database table is creating
const memoryOtpStore = new Map<string, StoredOtpRecord>();

const whatsappService = new WhatsAppService();
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
   * Find active student by mobile number
   */
  public async findStudentByMobile(rawPhone: string): Promise<{
    studentId: string;
    fullName: string;
    email: string;
    phone: string;
    isDisabled: boolean;
  } | null> {
    const supabase = getAdminSupabase();
    const normalized = this.normalizePhoneNumber(rawPhone);
    const plainDigits = normalized.replace(/\+/g, "");

    // Query student_contact table matching phone_local or phone_home
    const { data: contacts, error } = await supabase
      .from("student_contact")
      .select("student_id, phone_local, phone_home, email")
      .limit(50);

    if (error || !contacts) {
      console.warn("[OTP_SERVICE] Failed querying student_contact:", error?.message);
    }

    let matchStudentId: string | null = null;
    let matchEmail: string | null = null;
    let matchPhone: string | null = null;

    if (contacts) {
      for (const c of contacts) {
        const localNorm = c.phone_local ? this.normalizePhoneNumber(c.phone_local) : "";
        const homeNorm = c.phone_home ? this.normalizePhoneNumber(c.phone_home) : "";

        if (localNorm === normalized || homeNorm === normalized || 
            (c.phone_local && c.phone_local.replace(/[^\d]/g, "") === plainDigits) ||
            (c.phone_home && c.phone_home.replace(/[^\d]/g, "") === plainDigits)) {
          matchStudentId = c.student_id;
          matchEmail = c.email;
          matchPhone = localNorm || homeNorm || normalized;
          break;
        }
      }
    }

    // Fallback: If not found in contact table directly, check core students table
    if (!matchStudentId) {
      const { data: studentRecord } = await supabase
        .from("students")
        .select(`
          id,
          registration_number,
          student_personal(full_name),
          student_contact(email, phone_local, phone_home)
        `)
        .limit(100);

      if (studentRecord) {
        for (const s of studentRecord) {
          const sc = s.student_contact?.[0] || s.student_contact;
          if (sc) {
            const localNorm = sc.phone_local ? this.normalizePhoneNumber(sc.phone_local) : "";
            const homeNorm = sc.phone_home ? this.normalizePhoneNumber(sc.phone_home) : "";
            if (localNorm === normalized || homeNorm === normalized ||
                (sc.phone_local && sc.phone_local.replace(/[^\d]/g, "") === plainDigits)) {
              matchStudentId = s.id;
              matchEmail = sc.email;
              matchPhone = localNorm || homeNorm || normalized;
              break;
            }
          }
        }
      }
    }

    if (!matchStudentId) {
      return null;
    }

    // Fetch personal details & status
    const { data: student } = await supabase
      .from("students")
      .select("id, status, student_personal(full_name)")
      .eq("id", matchStudentId)
      .maybeSingle();

    const personalRecord = student?.student_personal as unknown as { full_name?: string }[] | { full_name?: string } | null;
    const fullName = Array.isArray(personalRecord) 
      ? personalRecord[0]?.full_name || "NFSU International Student"
      : personalRecord?.full_name || "NFSU International Student";
    const isDisabled = student?.status === "suspended" || student?.status === "disabled";

    return {
      studentId: matchStudentId,
      fullName,
      email: matchEmail || `student_${matchStudentId.substring(0, 8)}@nfsu.ac.in`,
      phone: matchPhone || normalized,
      isDisabled
    };
  }

  /**
   * Generate, hash, store, and dispatch WhatsApp OTP
   */
  public async generateAndSendOtp(rawPhone: string): Promise<{
    success: boolean;
    maskedPhone?: string;
    cooldownSeconds?: number;
    error?: string;
  }> {
    const normalizedPhone = this.normalizePhoneNumber(rawPhone);

    // 1. Locate student
    const student = await this.findStudentByMobile(normalizedPhone);
    if (!student) {
      // Security defense: Return generic success response without leaking account existence
      console.log(`[OTP_GENERATE] Phone ${normalizedPhone} not registered. Returning generic response.`);
      return {
        success: true,
        maskedPhone: this.maskPhoneNumber(normalizedPhone),
        cooldownSeconds: 60
      };
    }

    if (student.isDisabled) {
      return {
        success: false,
        error: "Your student account has been disabled by the university administrator. Please contact the International Student Office."
      };
    }

    // 2. Generate 6-digit cryptographically secure OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const recordId = crypto.randomUUID();

    console.log(`[OTP_GENERATE_SECURE] Generated OTP for student ${student.studentId} (${student.phone}): [REDACTED_OTP_HASH: ${otpHash.substring(0, 10)}...]`);

    // 3. Persist hashed OTP to Supabase DB or Memory Fallback
    const supabase = getAdminSupabase();

    // Mark previous active OTPs as used
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
        mobile_number: student.phone,
        otp_hash: otpHash,
        attempts_count: 0,
        is_used: false,
        expires_at: expiresAt.toISOString()
      });

    if (dbError) {
      console.warn("[OTP_GENERATE_DB_WARN] Using memory fallback store:", dbError.message);
      memoryOtpStore.set(normalizedPhone, {
        id: recordId,
        studentId: student.studentId,
        mobileNumber: student.phone,
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
        recipientPhone: student.phone,
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
      // Don't throw - fallback mechanism allows student to test OTP in dev environment if needed
    }

    // 5. Audit Log
    try {
      await supabase
        .from("student_activity_log")
        .insert({
          student_id: student.studentId,
          action: "OTP_GENERATED_WHATSAPP",
          details: { phone_masked: this.maskPhoneNumber(student.phone) }
        });
    } catch {
      // Ignore non-fatal audit log errors
    }

    return {
      success: true,
      maskedPhone: this.maskPhoneNumber(student.phone),
      cooldownSeconds: 60
    };
  }

  /**
   * Verify 6-digit WhatsApp OTP input
   */
  public async verifyOtp(
    rawPhone: string, 
    inputOtp: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<{
    success: boolean;
    studentId?: string;
    studentEmail?: string;
    error?: string;
  }> {
    const normalizedPhone = this.normalizePhoneNumber(rawPhone);
    const cleanedOtp = inputOtp.replace(/\D/g, "");

    if (cleanedOtp.length !== 6) {
      return { success: false, error: "Please enter a valid 6-digit verification code." };
    }

    const inputHash = this.hashOtp(cleanedOtp);
    const supabase = getAdminSupabase();

    // 1. Fetch latest pending OTP record
    let otpRecord: StoredOtpRecord | null = null;

    const { data: dbData } = await supabase
      .from("student_otp_verifications")
      .select("*")
      .eq("mobile_number", normalizedPhone)
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
      otpRecord = memoryOtpStore.get(normalizedPhone) || null;
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
      // Increment attempt counter
      const newAttempts = otpRecord.attemptsCount + 1;
      otpRecord.attemptsCount = newAttempts;

      await supabase
        .from("student_otp_verifications")
        .update({ attempts_count: newAttempts })
        .eq("id", otpRecord.id);

      if (memoryOtpStore.has(normalizedPhone)) {
        memoryOtpStore.get(normalizedPhone)!.attemptsCount = newAttempts;
      }

      // Audit log failed attempt
      try {
        await supabase
          .from("student_activity_log")
          .insert({
            student_id: otpRecord.studentId,
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

    memoryOtpStore.delete(normalizedPhone);

    // Fetch student email for session mapping
    const student = await this.findStudentByMobile(normalizedPhone);

    // Audit log login success
    try {
      await supabase
        .from("student_activity_log")
        .insert({
          student_id: otpRecord.studentId,
          action: "LOGIN_SUCCESS_WHATSAPP_OTP",
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          details: { channel: "WHATSAPP_OTP" }
        });
    } catch {}

    return {
      success: true,
      studentId: otpRecord.studentId,
      studentEmail: student?.email || `student_${otpRecord.studentId.substring(0, 8)}@nfsu.ac.in`
    };
  }
}
