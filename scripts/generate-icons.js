/**
 * NFSU Favicon & Icon Generator
 * 
 * Generates production-ready icons from the official NFSU shield logo.
 * Crops the shield area, adds appropriate padding, and exports at all
 * required sizes for browsers, mobile devices, and PWAs.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '..', 'public', 'assets', 'branding', 'nfsu-logo.png');
const OUT_DIR = path.join(__dirname, '..', 'public');

async function generateIcons() {
  console.log('[ICON-GEN] Starting icon generation from NFSU shield logo...');
  
  // Load and inspect source image
  const meta = await sharp(SOURCE).metadata();
  console.log(`[ICON-GEN] Source image: ${meta.width}x${meta.height}, format: ${meta.format}`);

  // Step 1: Extract the central shield region.
  // The shield is roughly centered. We'll crop to square focusing on the shield.
  const size = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - size) / 2);
  const top = Math.floor((meta.height - size) * 0.05); // Slight upward offset to capture "NFSU" text
  const cropHeight = Math.min(size, meta.height - top);
  
  const shieldBuffer = await sharp(SOURCE)
    .extract({ left, top, width: size, height: cropHeight })
    .png()
    .toBuffer();

  console.log(`[ICON-GEN] Extracted shield region: ${size}x${cropHeight}`);

  // Step 2: Create a padded square version with background for favicons
  // This adds slight padding around the shield for better icon presentation
  const paddedShield = await sharp(shieldBuffer)
    .resize(460, 460, { fit: 'contain', background: { r: 11, g: 60, b: 93, alpha: 1 } }) // Navy #0b3c5d
    .extend({
      top: 26, bottom: 26, left: 26, right: 26,
      background: { r: 11, g: 60, b: 93, alpha: 1 }
    })
    .png()
    .toBuffer();

  console.log('[ICON-GEN] Created padded shield base (512x512)');

  // Step 3: Generate all required sizes
  const iconSizes = [
    { name: 'favicon-16.png',       size: 16 },
    { name: 'favicon-32.png',       size: 32 },
    { name: 'favicon-48.png',       size: 48 },
    { name: 'favicon-64.png',       size: 64 },
    { name: 'favicon-128.png',      size: 128 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'mstile-150x150.png',   size: 150 },
    { name: 'android-chrome-192.png', size: 192 },
    { name: 'android-chrome-512.png', size: 512 },
  ];

  for (const icon of iconSizes) {
    const outPath = path.join(OUT_DIR, icon.name);
    await sharp(paddedShield)
      .resize(icon.size, icon.size, { fit: 'contain', background: { r: 11, g: 60, b: 93, alpha: 1 } })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outPath);
    
    const stats = fs.statSync(outPath);
    console.log(`[ICON-GEN] ✓ ${icon.name} (${icon.size}x${icon.size}) — ${stats.size} bytes`);
  }

  // Step 4: Generate favicon.ico (multi-size ICO via 32x32 PNG)
  // ICO format: we generate a high-quality 32x32 PNG and save as .ico
  // Modern browsers primarily use the 32x32 PNG version
  const ico32 = await sharp(paddedShield)
    .resize(32, 32, { fit: 'contain', background: { r: 11, g: 60, b: 93, alpha: 1 } })
    .png()
    .toBuffer();

  // Write a basic ICO file with a single 32x32 PNG entry
  const icoBuffer = createIcoFromPng(ico32, 32);
  fs.writeFileSync(path.join(OUT_DIR, 'favicon.ico'), icoBuffer);
  console.log(`[ICON-GEN] ✓ favicon.ico (32x32 ICO) — ${icoBuffer.length} bytes`);

  // Step 5: Generate the high-res OG image for social sharing (preserving full logo)
  const ogImage = await sharp(SOURCE)
    .resize(1200, 630, { fit: 'contain', background: { r: 11, g: 60, b: 93, alpha: 1 } })
    .png()
    .toFile(path.join(OUT_DIR, 'og-image.png'));
  console.log('[ICON-GEN] ✓ og-image.png (1200x630) — Open Graph social image');

  console.log('\n[ICON-GEN] ✅ All icons generated successfully!');
}

/**
 * Creates a minimal ICO file from a single PNG buffer.
 * ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function createIcoFromPng(pngBuffer, size) {
  // ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type: 1 = ICO
  header.writeUInt16LE(1, 4);     // Number of images: 1

  // ICO Directory Entry (16 bytes)
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // Width (0 = 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // Height (0 = 256)
  entry.writeUInt8(0, 2);          // Color palette
  entry.writeUInt8(0, 3);          // Reserved
  entry.writeUInt16LE(1, 4);       // Color planes
  entry.writeUInt16LE(32, 6);      // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);   // Image data size
  entry.writeUInt32LE(6 + 16, 12); // Offset to image data

  return Buffer.concat([header, entry, pngBuffer]);
}

generateIcons().catch(err => {
  console.error('[ICON-GEN] Failed:', err);
  process.exit(1);
});
