# UI Bug Fix Walkthrough - Invisible Select Options

This document details the root cause and the style adjustments applied to fix the invisible HTML `<select>` option elements.

---

## 1. Root Cause

Due to global utility styles applying universal layout rules (such as `* { ... border-border ... }` and other baseline resets) in `src/app/globals.css`, `<option>` elements inside dynamic native `<select>` controls were inheriting foreground text colors (such as white) when system dark theme configurations were active. 

Because modern desktop browsers (Chrome, Edge, and Firefox) render the native options list pane using system-default light theme backgrounds (white/light grey), inheriting a white text color caused the text inside drop-down lists to become invisible.

---

## 2. Applied Overrides

To resolve this issue while preserving dark theme compatibility, we added explicit global CSS rules to `@layer base` inside **[globals.css](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/globals.css)**:

```css
select option,
select optgroup {
  background-color: #ffffff !important;
  color: #000000 !important;
}

select option:disabled,
select optgroup:disabled {
  color: #888888 !important;
}
```

*   **Result**: 
    *   The selected `<select>` control preserves its native theme appearance (dark mode styling remains active).
    *   The options dropdown panel renders with a clean white background and clear black text options across Chrome, Edge, and Firefox, making them fully legible.
    *   Disabled dropdown elements are styled in gray.

---

## 3. Verification Results

*   **Eslint checks (`npm run lint`)**: **Passed with 0 errors**.
*   **TypeScript verification (`tsc --noEmit`)**: **Passed with 0 errors**.
*   **Production Next.js bundle compiles (`npm run build`)**: **Succeeded**.
