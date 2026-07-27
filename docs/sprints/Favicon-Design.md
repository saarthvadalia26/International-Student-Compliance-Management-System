# NFSU Favicon & Icon Design System

- **Status**: Complete & Production-Ready
- **Source Asset**: `public/assets/branding/nfsu-logo.png` (Official NFSU Shield)
- **Generation Script**: `scripts/generate-icons.js` (Sharp-based, reproducible)

---

## 1. Design Decisions

### Shield Extraction Strategy
The official NFSU logo (260×343px JPEG) contains the shield emblem with "NFSU" text above and Sanskrit motto below. For favicons, we:

1. **Crop** to a square region centered on the shield (260×260px)
2. **Pad** with the official navy background (`#0b3c5d`) to create a 512×512 base
3. **Resize** down to each target size using high-quality Lanczos resampling

This ensures the shield's four-quadrant detail (computer, fingerprint, microscope, DNA) remains recognizable even at 16×16.

### Color Palette
- **Background**: Navy Blue `#0b3c5d` (NFSU primary)
- **Shield Gold**: Preserved from source asset
- **Quadrant Colors**: Blue/Red preserved from source

---

## 2. Generated Icons Inventory

| File | Dimensions | Purpose | Size |
| :--- | :--- | :--- | :--- |
| `favicon.ico` | 32×32 | Browser tab (legacy) | ~2 KB |
| `favicon-16.png` | 16×16 | Browser tab (small) | ~868 B |
| `favicon-32.png` | 32×32 | Browser tab (standard) | ~1.5 KB |
| `favicon-48.png` | 48×48 | Browser tab (HiDPI) | ~2.2 KB |
| `favicon-64.png` | 64×64 | Windows shortcut | ~2.8 KB |
| `favicon-128.png` | 128×128 | Chrome Web Store | ~6.8 KB |
| `apple-touch-icon.png` | 180×180 | iOS home screen | ~11.4 KB |
| `mstile-150x150.png` | 150×150 | Windows Live Tiles | ~8.7 KB |
| `android-chrome-192.png` | 192×192 | Android home screen | ~12.7 KB |
| `android-chrome-512.png` | 512×512 | Android splash / PWA | ~53.2 KB |
| `og-image.png` | 1200×630 | Open Graph / Twitter cards | Social sharing |
| `mask-icon.svg` | Scalable | Safari pinned tabs | Monochrome |

---

## 3. Integration Points

### Next.js Metadata API (`src/app/layout.tsx`)
- All icon sizes registered via `metadata.icons`
- `metadataBase` set to suppress Next.js warning
- Open Graph image uses dedicated 1200×630 `og-image.png`
- Twitter card upgraded to `summary_large_image`

### Web Manifest (`public/site.webmanifest`)
- 48px, 192px, and 512px icons registered
- 512px also registered with `purpose: "maskable"` for Android adaptive icons
- Background color matches navy theme

### Branding Config (`src/config/branding.ts`)
- All paths exported via `Branding.faviconPaths`
- Used consistently across layout, sidebar, header, and login pages

---

## 4. Regeneration

To regenerate all icons from a new source logo:

```bash
# Replace the source image
cp new-logo.png public/assets/branding/nfsu-logo.png

# Run the generator
node scripts/generate-icons.js
```

The script automatically handles cropping, padding, and multi-size export.
