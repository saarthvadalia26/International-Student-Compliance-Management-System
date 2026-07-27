# Branding Icons Reference

- **Status**: Complete & Production-Ready
- **Target Institution**: National Forensic Sciences University (NFSU)

---

## 1. Icon File Locations

All production icons are stored under `public/`:

```
public/
├── favicon.ico                  # 32×32 ICO (legacy browsers)
├── favicon-16.png               # 16×16 PNG
├── favicon-32.png               # 32×32 PNG
├── favicon-48.png               # 48×48 PNG
├── favicon-64.png               # 64×64 PNG
├── favicon-128.png              # 128×128 PNG
├── apple-touch-icon.png         # 180×180 PNG (iOS)
├── mstile-150x150.png           # 150×150 PNG (Windows)
├── android-chrome-192.png       # 192×192 PNG (Android)
├── android-chrome-512.png       # 512×512 PNG (PWA splash)
├── og-image.png                 # 1200×630 PNG (Social sharing)
├── mask-icon.svg                # Scalable SVG (Safari pinned tabs)
├── site.webmanifest             # PWA manifest
└── assets/
    └── branding/
        └── nfsu-logo.png        # Source logo (full shield with motto)
```

---

## 2. Browser Coverage

| Browser / Platform | Icon Used |
| :--- | :--- |
| Chrome (Desktop) | `favicon-32.png` → `favicon.ico` |
| Chrome (Android) | `android-chrome-192.png` via manifest |
| Firefox | `favicon-32.png` |
| Safari (Desktop) | `favicon-32.png` |
| Safari (iOS) | `apple-touch-icon.png` |
| Safari (Pinned Tab) | `mask-icon.svg` |
| Edge | `favicon-32.png` → `favicon.ico` |
| Windows Tiles | `mstile-150x150.png` |
| PWA Install | `android-chrome-512.png` (maskable) |

---

## 3. Social Sharing

| Platform | Image | Dimensions |
| :--- | :--- | :--- |
| Open Graph (Facebook, LinkedIn) | `og-image.png` | 1200×630 |
| Twitter Cards | `og-image.png` | 1200×630 |

Both use `summary_large_image` card type for maximum visual impact.

---

## 4. Centralized Configuration

All icon paths are managed through `src/config/branding.ts`:

```typescript
faviconPaths: {
  ico: "/favicon.ico",
  png16: "/favicon-16.png",
  png32: "/favicon-32.png",
  png48: "/favicon-48.png",
  png64: "/favicon-64.png",
  png128: "/favicon-128.png",
  appleTouch: "/apple-touch-icon.png",
  chrome192: "/android-chrome-192.png",
  chrome512: "/android-chrome-512.png",
  mstile: "/mstile-150x150.png",
  maskIcon: "/mask-icon.svg",
  ogImage: "/og-image.png"
}
```
