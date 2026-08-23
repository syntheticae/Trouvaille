const puppeteer = require('puppeteer');
const fs = require('fs');

async function make1024Icon() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const iconBase64 = 'data:image/png;base64,' + fs.readFileSync('public/icon.png').toString('base64');

  const resized1024 = await page.evaluate(async (dataUri) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 1024, 1024);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = dataUri;
    });
  }, iconBase64);

  const dest = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
  fs.writeFileSync(dest, Buffer.from(resized1024, 'base64'));

  await browser.close();
  console.log(`1024x1024 AppIcon generated at ${dest}!`);
}

make1024Icon();
