# ISO-Compliant Country & Nationality Reference System

- **Status**: Complete & Production-Ready
- **Release Version**: v1.0.0
- **Target Institution**: National Forensic Sciences University (NFSU)
- **Standard**: ISO 3166-1 Alpha-2, Alpha-3, Numeric

---

## 1. System Architecture

The Country & Nationality Reference System establishes a single source of truth for international student nationality and geographic data across the ISCMS platform.

```
                    ISO 3166-1 Centralized Reference
                                   │
         ┌─────────────────────────┼────────────────────────┐
         ▼                         ▼                        ▼
Database Storage           Utility Engine           UI Selector Component
(`public.reference_data`)  (`src/utils/countries.ts`) (`NationalitySelector`)
   Category: 'country'     Lookup & Filtering        SVG Flag + ARIA Combobox
   Code: Alpha-3           ISO Codes & Demonyms      Keyboard Navigation
```

---

## 2. Key Business Rules

1. **Storage Constraint**: Database fields (`student_personal.nationality_code`) exclusively store ISO 3166-1 Alpha-3 uppercase string codes (e.g., `IND`, `USA`, `GBR`, `NPL`, `BGD`). Display labels are never stored directly.
2. **Flag Rendering**: UI components leverage scalable vector SVG flag assets via `CountryFlag` component, with graceful fallback to Unicode flag emojis (`🇮🇳`, `🇺🇸`, `🇬🇧`).
3. **Lookup & Search**: Multi-vector search enables matching by common name, official name, demonym (nationality), ISO Alpha-2 code, ISO Alpha-3 code, ISO Numeric code, or geographic region.

---

## 3. Component API

### `NationalitySelector` / `CountrySelector`

```tsx
import { NationalitySelector } from "@/components/ui/nationality-selector";

<NationalitySelector
  value={nationalityCode} // ISO Alpha-3 code (e.g. "IND")
  onChange={(code) => setNationalityCode(code)}
  allowClear={true}
  placeholder="Select nationality..."
/>
```

### `CountryFlag`

```tsx
import { CountryFlag } from "@/components/ui/country-flag";

<CountryFlag countryCode="IND" size="md" />
```
