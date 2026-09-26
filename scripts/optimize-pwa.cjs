const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizePwaIcons() {
  const bgDarkRgb = { r: 10, g: 10, b: 11 };

  async function resize(size, destPath) {
    const iconSize = Math.round(size * 0.74);
    const resizedIcon = await sharp('public/icon-light.png')
      .resize(iconSize, iconSize, { fit: 'inside' })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: bgDarkRgb
      }
    })
      .composite([{ input: resizedIcon, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(destPath);

    console.log(`✓ ${path.basename(destPath)} (${size}x${size}): ${(fs.statSync(destPath).size / 1024).toFixed(1)} KB`);
  }

  await resize(192, 'public/pwa-192x192.png');
  await resize(512, 'public/pwa-512x512.png');
  await resize(180, 'public/apple-touch-icon.png');
  await resize(64, 'public/favicon.png');

  console.log('PWA app icons optimized!');
}

optimizePwaIcons();
