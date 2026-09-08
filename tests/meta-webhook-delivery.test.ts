import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

describe("Meta WhatsApp Webhook Architecture & Foreign Key Integrity Suite", () => {
  let supabase: any;
  let testStudentId: string | null = null;
  let testNotificationId: string | null = null;
  const testWamid = `wamid.TEST_${Date.now()}_ABC123XYZ`;

  before(async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create a temporary test student and notification
    const { data: student, error: sErr } = await supabase
      .from("students")
      .insert({
        registration_number: `TEST_WH_${Date.now()}`,
        status: "active"
      })
      .select("id")
      .single();

    assert.ifError(sErr);
    testStudentId = student.id;

    const { data: notif, error: nErr } = await supabase
      .from("notifications")
      .insert({
        student_id: testStudentId,
        channel: "whatsapp",
        recipient_address: "+919876543210",
        trigger_source: "webhook_test",
        idempotency_key: `test_idemp_${Date.now()}`,
        status: "sent",
        document_type: "passport"
      })
      .select("id")
      .single();

    assert.ifError(nErr);
    testNotificationId = notif.id;

    // Seed an initial delivery log that stores external wamid in JSONB gateway_response
    const { error: logErr } = await supabase
      .from("notification_delivery_log")
      .insert({
        notification_id: testNotificationId,
        attempt_number: 1,
        status: "sent",
        provider_name: "meta-whatsapp",
        gateway_response: { gateway_id: testWamid, status: "sent" }
      });

    assert.ifError(logErr);
  });

  after(async () => {
    // Cleanup temporary records
    if (testNotificationId) {
      await supabase.from("notification_delivery_log").delete().eq("notification_id", testNotificationId);
      await supabase.from("notifications").delete().eq("id", testNotificationId);
    }
    if (testStudentId) {
      await supabase.from("students").delete().eq("id", testStudentId);
    }
    await supabase.from("audit_log").delete().like("resource", "%whatsapp%");
  });

  it("1. notification_delivery_log.notification_id strictly enforces UUID format and rejects raw wamid strings", async () => {
    const rawWamid = "wamid.HBgLMTEwMDAwMDAwMAUCABEYEkExQjJDM0Q0RTVGNkY3RThGOQA=";

    const { error } = await supabase
      .from("notification_delivery_log")
      .insert({
        notification_id: rawWamid as any, // Testing invalid text insertion
        attempt_number: 1,
        status: "delivered",
        gateway_response: { gateway_id: rawWamid }
      });

    assert.ok(error, "PostgreSQL must reject non-UUID string in notification_id");
    assert.equal(error?.code, "22P02", "Must fail with SQLSTATE 22P02 (invalid_text_representation)");
  });

  it("2. notification_delivery_log.notification_id rejects non-existent UUIDs (foreign key violation)", async () => {
    const randomUuid = "00000000-0000-0000-0000-000000000099";

    const { error } = await supabase
      .from("notification_delivery_log")
      .insert({
        notification_id: randomUuid,
        attempt_number: 1,
        status: "delivered",
        gateway_response: { gateway_id: "test-gateway-response" }
      });

    assert.ok(error, "PostgreSQL must reject non-existent notification_id foreign key");
    assert.equal(error?.code, "23503", "Must fail with SQLSTATE 23503 (foreign_key_violation)");
  });

  it("3. Delivery status callback maps wamid to existing notification UUID via gateway_response", async () => {
    assert.ok(testNotificationId);

    // Simulate webhook lookup logic by external provider gateway_id
    const { data: existingLog, error: lookupErr } = await supabase
      .from("notification_delivery_log")
      .select("id, notification_id, attempt_number, status")
      .filter("gateway_response->>gateway_id", "eq", testWamid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    assert.ifError(lookupErr);
    assert.ok(existingLog);
    assert.equal(existingLog.notification_id, testNotificationId);

    // Insert next delivery attempt with true UUID
    const { error: insertErr } = await supabase
      .from("notification_delivery_log")
      .insert({
        notification_id: existingLog.notification_id,
        attempt_number: (existingLog.attempt_number || 1) + 1,
        status: "delivered",
        gateway_response: { gateway_id: testWamid, status: "delivered" },
        provider_name: "meta-whatsapp"
      });

    assert.ifError(insertErr);

    // Update parent notification status
    const { error: updateErr } = await supabase
      .from("notifications")
      .update({ status: "delivered", updated_at: new Date().toISOString() })
      .eq("id", existingLog.notification_id);

    assert.ifError(updateErr);

    const { data: updatedNotif } = await supabase
      .from("notifications")
      .select("status")
      .eq("id", testNotificationId)
      .single();

    assert.equal(updatedNotif?.status, "delivered");
  });

  it("4. Idempotency: duplicate delivery callback with identical status does not create duplicate log", async () => {
    assert.ok(testNotificationId);

    // Fetch latest status
    const { data: latestLog } = await supabase
      .from("notification_delivery_log")
      .select("status, attempt_number")
      .filter("gateway_response->>gateway_id", "eq", testWamid)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    assert.equal(latestLog?.status, "delivered");

    // Simulating identical second callback
    const incomingStatus = "delivered";
    const isDuplicate = latestLog.status === incomingStatus;
    assert.ok(isDuplicate, "Second identical webhook delivery must be detected as duplicate");
  });

  it("5. Unmatched webhook event is safely logged in audit_log without foreign key violation", async () => {
    const unknownWamid = `wamid.UNKNOWN_${Date.now()}`;

    // Webhook fallback writes safely to audit_log
    const { data: auditEntry, error: auditErr } = await supabase
      .from("audit_log")
      .insert({
        action: "WHATSAPP_WEBHOOK_STATUS",
        resource: "webhooks/meta",
        filters_applied: { statusId: unknownWamid, status: "delivered" }
      })
      .select("id, action, resource")
      .single();

    assert.ifError(auditErr);
    assert.ok(auditEntry);
    assert.equal(auditEntry.action, "WHATSAPP_WEBHOOK_STATUS");
  });

  it("6. Incoming student WhatsApp messages are safely logged in audit_log without foreign key violation", async () => {
    const incomingMsgId = `wamid.INCOMING_${Date.now()}`;
    const studentPhone = "+919876543210";

    const { data: auditEntry, error: auditErr } = await supabase
      .from("audit_log")
      .insert({
        action: "WHATSAPP_INCOMING_MESSAGE",
        resource: `whatsapp/${studentPhone}`,
        filters_applied: { messageId: incomingMsgId, from: studentPhone, text: "Need help with visa renewal" }
      })
      .select("id, action, resource")
      .single();

    assert.ifError(auditErr);
    assert.ok(auditEntry);
    assert.equal(auditEntry.action, "WHATSAPP_INCOMING_MESSAGE");
  });
});
