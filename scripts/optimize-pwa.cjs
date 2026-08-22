const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function optimizePwaIcons() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const iconBase64 = 'data:image/png;base64,' + fs.readFileSync('public/icon.png').toString('base64');

  async function resize(size, destPath) {
    const resized = await page.evaluate(async (dataUri, s) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = s;
          canvas.height = s;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, s, s);
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.src = dataUri;
      });
    }, iconBase64, size);

    fs.writeFileSync(destPath, Buffer.from(resized, 'base64'));
    console.log(`✓ ${path.basename(destPath)} (${size}x${size}): ${(fs.statSync(destPath).size / 1024).toFixed(1)} KB`);
  }

  await resize(192, 'public/pwa-192x192.png');
  await resize(512, 'public/pwa-512x512.png');
  await resize(180, 'public/apple-touch-icon.png');
  await resize(64, 'public/favicon.png');
  await resize(256, 'public/icon.png');

  await browser.close();
  console.log('PWA app icons optimized!');
}

optimizePwaIcons();
