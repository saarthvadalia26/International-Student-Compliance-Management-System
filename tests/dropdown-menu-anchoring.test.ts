import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("ISCMS — DropdownMenu Anchoring & Ref Forwarding Architecture", () => {
  const buttonPath = path.resolve(__dirname, "../src/components/ui/button.tsx");
  const dropdownPath = path.resolve(__dirname, "../src/components/ui/dropdown-menu.tsx");
  const accountMenuPath = path.resolve(__dirname, "../src/components/header/account-menu.tsx");

  it("verifies Button component uses React.forwardRef to allow Floating UI ref attachment", () => {
    const content = fs.readFileSync(buttonPath, "utf-8");
    assert.match(
      content,
      /const\s+Button\s*=\s*React\.forwardRef/,
      "Button component must use React.forwardRef so that render={<Button />} passes ref to DOM"
    );
    assert.match(
      content,
      /ref=\{ref\}/,
      "Button component must pass ref to ButtonPrimitive"
    );
    assert.match(
      content,
      /Button\.displayName\s*=\s*["']Button["']/,
      "Button must define displayName"
    );
  });

  it("verifies DropdownMenu primitives use React.forwardRef and proper width classes", () => {
    const content = fs.readFileSync(dropdownPath, "utf-8");
    assert.match(
      content,
      /const\s+DropdownMenuTrigger\s*=\s*React\.forwardRef/,
      "DropdownMenuTrigger must use React.forwardRef"
    );
    assert.match(
      content,
      /const\s+DropdownMenuContent\s*=\s*React\.forwardRef/,
      "DropdownMenuContent must use React.forwardRef"
    );
    assert.match(
      content,
      /const\s+DropdownMenuItem\s*=\s*React\.forwardRef/,
      "DropdownMenuItem must use React.forwardRef"
    );
    assert.match(
      content,
      /const\s+DropdownMenuLabel\s*=\s*React\.forwardRef/,
      "DropdownMenuLabel must use React.forwardRef"
    );
    assert.doesNotMatch(
      content,
      /w-\(--anchor-width\)/,
      "DropdownMenuContent must not force anchor width (w-(--anchor-width))"
    );
  });

  it("verifies AccountMenu anchors DropdownMenuContent to trigger with side=bottom and align=end", () => {
    const content = fs.readFileSync(accountMenuPath, "utf-8");
    assert.match(
      content,
      /<DropdownMenuContent[^>]*align=["']end["']/,
      "AccountMenu must align dropdown to the end (right edge of trigger)"
    );
    assert.match(
      content,
      /<DropdownMenuContent[^>]*side=["']bottom["']/,
      "AccountMenu must set side=bottom so menu opens directly below avatar"
    );
  });
});
