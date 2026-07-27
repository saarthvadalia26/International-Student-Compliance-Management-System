# ISO 3166-1 Country Dataset Specification

- **Target Institution**: National Forensic Sciences University (NFSU)
- **Standard**: ISO 3166-1 Country Codes & Demonyms
- **Module**: `src/utils/countries.ts`

---

## 1. Data Schema

Each country entry in the centralized reference array conforms to the following schema:

```typescript
export interface Country {
  code: string;         // ISO 3166-1 Alpha-3 Code (e.g., "IND")
  alpha2: string;       // ISO 3166-1 Alpha-2 Code (e.g., "IN")
  numeric: string;      // ISO 3166-1 Numeric Code (e.g., "356")
  name: string;         // Common Country Name (e.g., "India")
  officialName: string; // Official Country Name (e.g., "Republic of India")
  nationality: string;  // Demonym (e.g., "Indian")
  flag: string;         // Unicode Emoji Flag (e.g., "🇮🇳")
  region: string;       // Geographic Region (e.g., "Asia")
  subregion: string;    // Geographic Subregion (e.g., "Southern Asia")
}
```

---

## 2. Sample Dataset Records

| Alpha-3 | Alpha-2 | Numeric | Common Name | Official Name | Demonym | Flag | Region |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `IND` | `IN` | `356` | India | Republic of India | Indian | 🇮🇳 | Asia |
| `USA` | `US` | `840` | United States | United States of America | American | 🇺🇸 | Americas |
| `GBR` | `GB` | `826` | United Kingdom | United Kingdom of Great Britain | British | 🇬🇧 | Europe |
| `NPL` | `NP` | `524` | Nepal | Federal Democratic Republic of Nepal | Nepalese | 🇳🇵 | Asia |
| `BGD` | `BD` | `050` | Bangladesh | People's Republic of Bangladesh | Bangladeshi | 🇧🇩 | Asia |
| `DEU` | `DE` | `276` | Germany | Federal Republic of Germany | German | 🇩🇪 | Europe |
| `FRA` | `FR` | `250` | France | French Republic | French | 🇫🇷 | Europe |
| `JPN` | `JP` | `392` | Japan | Japan | Japanese | 🇯🇵 | Asia |
| `AUS` | `AU` | `036` | Australia | Commonwealth of Australia | Australian | 🇦🇺 | Oceania |
| `CAN` | `CA` | `124` | Canada | Canada | Canadian | 🇨🇦 | Americas |

---

## 3. Database Migration Seeding

Migration `supabase/migrations/015_iso_countries.sql` configures the `reference_data` lookup table with `category = 'country'` and stores ISO 3166-1 Alpha-3 codes as immutable reference keys.
