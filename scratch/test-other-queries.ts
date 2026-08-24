import * as fs from "fs";
import * as path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
} catch (e) {}

import { SupabaseReportRepository } from "../src/domain/reports/repositories/report.repository";
import { SupabaseStudentPortalRepository } from "../src/domain/student-portal/repositories/student-portal.repository";

async function testOtherQueries() {
  console.log("=== TESTING REPORTS & STUDENT PORTAL QUERIES ===");

  // Test Report Repository getStudentReport
  try {
    const reportRepo = new SupabaseReportRepository();
    const repRes = await reportRepo.getStudentReport({}, { page: 1, limit: 10 });
    console.log(`getStudentReport: success! count = ${repRes.totalCount}, rows = ${repRes.data.length}`);
  } catch (err: any) {
    console.error(`getStudentReport FAILED: ${err.message}`);
  }

  // Test Student Portal getStudentProfile for one student
  try {
    const portalRepo = new SupabaseStudentPortalRepository();
    const profile = await portalRepo.getStudentProfile("b3dfd532-59b6-4446-bd87-0526674596c9");
    console.log(`getStudentProfile: success! student = ${profile?.fullName}, regNo = ${profile?.registrationNumber}`);
  } catch (err: any) {
    console.error(`getStudentProfile FAILED: ${err.message}`);
  }
}

testOtherQueries().catch(console.error);
