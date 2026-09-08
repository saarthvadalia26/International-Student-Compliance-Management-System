import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getAllTsFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", ".git", "npm-cache"].includes(entry.name)) {
        results = results.concat(getAllTsFiles(fullPath));
      }
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("Schema Column Integrity & Regression Suite (SQLSTATE 42703 Prevention)", () => {
  let supabase: any;
  const srcFiles = getAllTsFiles(path.resolve("src"));

  before(() => {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it("1. student_snapshot authoritative schema: primary key is student_id (zero queries reference nonexistent id)", async () => {
    // 1. Static codebase audit
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (content.includes("student_snapshot")) {
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          assert.ok(
            !(line.includes('.from("student_snapshot")') && (line.includes('.gte("id"') || line.includes('.eq("id"'))),
            `Found illegal student_snapshot.id query in ${path.relative(".", file)}:${i + 1}`
          );
        }
      }
    }

    // 2. Live database test
    const { data, error } = await supabase
      .from("student_snapshot")
      .select("student_id, compliance_status, passport_status, visa_status, efrro_status")
      .limit(1);

    assert.ifError(error);
    assert.ok(Array.isArray(data));
  });

  it("2. system_config authoritative schema: primary key is key (zero queries reference nonexistent id)", async () => {
    // 1. Static codebase audit
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (content.includes("system_config")) {
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          assert.ok(
            !(line.includes('.from("system_config")') && (line.includes('.gte("id"') || line.includes('.eq("id"'))),
            `Found illegal system_config.id query in ${path.relative(".", file)}:${i + 1}`
          );
        }
      }
    }

    // 2. Live database test
    const { data, error } = await supabase
      .from("system_config")
      .select("key, value")
      .limit(1);

    assert.ifError(error);
    assert.ok(Array.isArray(data));
  });

  it("3. reference_data authoritative schema: column is display_name (zero queries reference nonexistent name)", async () => {
    // 1. Static codebase audit: All queries must select display_name
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (content.includes("reference_data")) {
        const regex = /\.from\(\s*['"]reference_data['"]\s*\)([\s\S]*?);/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const queryStr = match[1];
          assert.ok(
            !queryStr.includes('.order("name"') && !queryStr.includes(".order('name'"),
            `Found illegal reference_data order by 'name' in ${path.relative(".", file)}`
          );
          if (queryStr.includes(".select(")) {
            assert.ok(
              !queryStr.includes('"name"') && !queryStr.includes("'name'"),
              `Found illegal reference_data select 'name' in ${path.relative(".", file)}`
            );
          }
        }
      }
    }

    // 2. Live database test
    const { data, error } = await supabase
      .from("reference_data")
      .select("code, display_name, category")
      .limit(5);

    assert.ifError(error);
    assert.ok(Array.isArray(data));
    if (data.length > 0) {
      assert.ok("display_name" in data[0], "Record must have display_name");
      assert.ok(!("name" in data[0]), "Record must NOT have column 'name'");
    }
  });

  it("4. audit_log authoritative schema: column is timestamp (zero queries reference nonexistent created_at)", async () => {
    // 1. Static codebase audit
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (content.includes("audit_log")) {
        const regex = /\.from\(\s*['"]audit_log['"]\s*\)([\s\S]*?);/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const queryStr = match[1];
          assert.ok(
            !queryStr.includes('.order("created_at"') && !queryStr.includes(".order('created_at'"),
            `Found illegal audit_log order by 'created_at' in ${path.relative(".", file)}`
          );
          if (queryStr.includes(".select(")) {
            assert.ok(
              !queryStr.includes("created_at"),
              `Found illegal audit_log select 'created_at' in ${path.relative(".", file)}`
            );
          }
        }
      }
    }

    // 2. Live database test
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, action, resource, timestamp")
      .order("timestamp", { ascending: false })
      .limit(5);

    assert.ifError(error);
    assert.ok(Array.isArray(data));
    if (data.length > 0) {
      assert.ok("timestamp" in data[0], "Record must have timestamp");
      assert.ok(!("created_at" in data[0]), "Record must NOT have created_at");
    }
  });
});
