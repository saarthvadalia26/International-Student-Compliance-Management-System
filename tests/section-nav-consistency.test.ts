import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("ISCMS — Standardized Section Navigation & Dimension Stability", () => {
  const srcRoot = path.join(__dirname, "..", "src");

  test("verifies SectionNav component exists and exports SectionNavGroup and SectionNavCard", () => {
    const sectionNavPath = path.join(srcRoot, "components", "ui", "section-nav.tsx");
    assert.ok(fs.existsSync(sectionNavPath), "src/components/ui/section-nav.tsx must exist");

    const content = fs.readFileSync(sectionNavPath, "utf-8");
    assert.ok(content.includes("export function SectionNavGroup"), "Must export SectionNavGroup");
    assert.ok(content.includes("export const SectionNavCard"), "Must export SectionNavCard");
  });

  test("verifies SectionNavCard enforces dimension stability between active and inactive states", () => {
    const sectionNavPath = path.join(srcRoot, "components", "ui", "section-nav.tsx");
    const content = fs.readFileSync(sectionNavPath, "utf-8");

    // Must use items-start for leading icon alignment
    assert.ok(content.includes("items-start"), "Must use items-start so icons align to first line of text");
    // Must handle natural word wrapping
    assert.ok(content.includes("break-words"), "Must support break-words for long section titles");
    // Must include min-h to prevent layout jumps
    assert.ok(content.includes("min-h-[42px]") || content.includes("min-h-[38px]"), "Must define consistent min-height");
    // Must support accessible attributes
    assert.ok(content.includes("role=\"tab\""), "Must have role tab for accessibility");
    assert.ok(content.includes("aria-selected"), "Must have aria-selected attribute");
  });

  test("verifies Student Registration page uses SectionNavGroup and SectionNavCard", () => {
    const pagePath = path.join(srcRoot, "app", "(app)", "students", "add", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    assert.ok(content.includes("SectionNavGroup"), "Registration page must use SectionNavGroup");
    assert.ok(content.includes("SectionNavCard"), "Registration page must use SectionNavCard");
    assert.ok(content.includes("Personal & Demographic"), "Must include Personal & Demographic section");
    assert.ok(content.includes("Academic & Admission"), "Must include Academic & Admission section");
    assert.ok(content.includes("Contact & Guardian"), "Must include Contact & Guardian section");
    assert.ok(content.includes("Documents & Legal"), "Must include Documents & Legal section");
  });

  test("verifies Student Profile page uses SectionNavGroup and SectionNavCard for drill-down tabs", () => {
    const pagePath = path.join(srcRoot, "app", "(app)", "students", "[id]", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    assert.ok(content.includes("SectionNavGroup"), "Student profile page must use SectionNavGroup");
    assert.ok(content.includes("SectionNavCard"), "Student profile page must use SectionNavCard");
    assert.ok(content.includes("Legal & Immigration"), "Must include Legal & Immigration tab");
    assert.ok(content.includes("Personal Identity"), "Must include Personal Identity tab");
    assert.ok(content.includes("Academic Profile"), "Must include Academic Profile tab");
    assert.ok(content.includes("Contact & Guardian"), "Must include Contact & Guardian tab");
  });

  test("verifies Settings and Reminders pages use standardized SectionNav components", () => {
    const settingsPath = path.join(srcRoot, "app", "(app)", "settings", "page.tsx");
    const remindersPath = path.join(srcRoot, "app", "(app)", "reminders", "page.tsx");
    const settingsContent = fs.readFileSync(settingsPath, "utf-8");
    const remindersContent = fs.readFileSync(remindersPath, "utf-8");

    assert.ok(settingsContent.includes("SectionNavGroup"), "Settings page must use SectionNavGroup");
    assert.ok(settingsContent.includes("SectionNavCard"), "Settings page must use SectionNavCard");

    assert.ok(remindersContent.includes("SectionNavGroup"), "Reminders page must use SectionNavGroup");
    assert.ok(remindersContent.includes("SectionNavCard"), "Reminders page must use SectionNavCard");
  });
});
