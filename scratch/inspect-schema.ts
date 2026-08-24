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

import { getAdminSupabase } from "../src/lib/supabase/admin";

async function inspectSchema() {
  const supabase = getAdminSupabase();

  console.log("=== INSPECTING LIVE SCHEMA ===");

  // Check student_academic row columns
  const { data: acadSample, error: acadErr } = await supabase
    .from("student_academic")
    .select("*")
    .limit(1);

  if (acadSample && acadSample.length > 0) {
    console.log("student_academic actual live columns:", Object.keys(acadSample[0]));
    console.log("Sample student_academic row:", acadSample[0]);
  } else {
    console.log("student_academic query result:", { data: acadSample, error: acadErr });
  }

  // Check students row columns
  const { data: stuSample } = await supabase.from("students").select("*").limit(1);
  if (stuSample && stuSample.length > 0) {
    console.log("students actual live columns:", Object.keys(stuSample[0]));
    console.log("Sample students row:", stuSample[0]);
  }

  // Check student_personal row columns
  const { data: persSample } = await supabase.from("student_personal").select("*").limit(1);
  if (persSample && persSample.length > 0) {
    console.log("student_personal actual live columns:", Object.keys(persSample[0]));
    console.log("Sample student_personal row:", persSample[0]);
  }

  // Check student_snapshot row columns
  const { data: snapSample } = await supabase.from("student_snapshot").select("*").limit(1);
  if (snapSample && snapSample.length > 0) {
    console.log("student_snapshot actual live columns:", Object.keys(snapSample[0]));
    console.log("Sample student_snapshot row:", snapSample[0]);
  }
}

inspectSchema().catch(console.error);
