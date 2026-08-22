const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function optimizeIcons() {
  console.log('Launching headless browser to optimize icons...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const baseDir = path.resolve('public/icons');
  
  function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(fullPath));
      } else if (file.endsWith('.png')) {
        results.push(fullPath);
      }
    });
    return results;
  }

  const files = getFiles(baseDir);
  console.log(`Found ${files.length} icon files to optimize.`);

  let totalOld = 0;
  let totalNew = 0;

  for (const filePath of files) {
    const oldSize = fs.statSync(filePath).size;
    totalOld += oldSize;

    const dataUri = 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
    
    // Resize to 128x128 canvas with high quality
    const optimizedBase64 = await page.evaluate(async (dataUri) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 128;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.src = dataUri;
      });
    }, dataUri);

    fs.writeFileSync(filePath, Buffer.from(optimizedBase64, 'base64'));
    const newSize = fs.statSync(filePath).size;
    totalNew += newSize;

    console.log(`✓ ${path.basename(filePath)}: ${(oldSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB`);
  }

  await browser.close();
  console.log('----------------------------------------------------');
  console.log(`Optimization complete!`);
  console.log(`Original total size: ${(totalOld / 1024 / 1024).toFixed(2)} MB`);
  console.log(`New total size:      ${(totalNew / 1024).toFixed(2)} KB`);
  console.log(`Saved:               ${((totalOld - totalNew) / 1024 / 1024).toFixed(2)} MB (${((1 - totalNew/totalOld)*100).toFixed(1)}% reduction)`);
}

optimizeIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
