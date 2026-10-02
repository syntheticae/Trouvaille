const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOCAL_MASTER = path.resolve(__dirname, '../public/trouvaille-3d-logo.png');
const UPLOAD_MASTER = 'C:/Users/afa/.gemini/antigravity/brain/e3457543-52cf-4dd3-a420-2598e8ccfddc/.user_uploaded/media_1790905966591.png';
const BG_DARK_RGB = { r: 10, g: 10, b: 11 }; // #0A0A0B Apple luxury obsidian

async function generateAllIcons() {
  let sourcePath = LOCAL_MASTER;
  if (!fs.existsSync(sourcePath)) {
    if (fs.existsSync(UPLOAD_MASTER)) {
      console.log(`Copying upload master to local master at ${LOCAL_MASTER}`);
      fs.copyFileSync(UPLOAD_MASTER, LOCAL_MASTER);
    } else {
      throw new Error(`Master logo not found at ${LOCAL_MASTER} or ${UPLOAD_MASTER}`);
    }
  }

  console.log('Loading source master logo from:', sourcePath);

  // Get trimmed logo buffer
  const trimmedBuffer = await sharp(sourcePath)
    .trim()
    .toBuffer();

  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log(`Trimmed logo dimensions: ${trimmedMeta.width}x${trimmedMeta.height}`);
  const aspectRatio = trimmedMeta.width / trimmedMeta.height;

  // Helper to generate a solid background icon
  async function makeSolidIcon(canvasSize, logoScaleRatio, destPath) {
    const targetHeight = Math.round(canvasSize * logoScaleRatio);
    const targetWidth = Math.round(targetHeight * aspectRatio);

    const resizedLogo = await sharp(trimmedBuffer)
      .resize(targetWidth, targetHeight, { fit: 'inside' })
      .toBuffer();

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 3,
        background: BG_DARK_RGB
      }
    })
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(destPath);

    const sizeKb = (fs.statSync(destPath).size / 1024).toFixed(1);
    console.log(`✓ Generated ${destPath} (${canvasSize}x${canvasSize}): ${sizeKb} KB`);
  }

  // Helper to generate a transparent foreground icon (for Android adaptive icons)
  async function makeTransparentForeground(canvasSize, logoScaleRatio, destPath) {
    const targetHeight = Math.round(canvasSize * logoScaleRatio);
    const targetWidth = Math.round(targetHeight * aspectRatio);

    const resizedLogo = await sharp(trimmedBuffer)
      .resize(targetWidth, targetHeight, { fit: 'inside' })
      .toBuffer();

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(destPath);

    const sizeKb = (fs.statSync(destPath).size / 1024).toFixed(1);
    console.log(`✓ Generated foreground ${destPath} (${canvasSize}x${canvasSize}): ${sizeKb} KB`);
  }

  // Helper to generate transparent standalone logo
  async function makeTransparentLogo(canvasSize, destPath) {
    const targetHeight = Math.round(canvasSize * 0.85);
    const targetWidth = Math.round(targetHeight * aspectRatio);

    const resizedLogo = await sharp(trimmedBuffer)
      .resize(targetWidth, targetHeight, { fit: 'inside' })
      .toBuffer();

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(destPath);

    const sizeKb = (fs.statSync(destPath).size / 1024).toFixed(1);
    console.log(`✓ Generated transparent logo ${destPath} (${canvasSize}x${canvasSize}): ${sizeKb} KB`);
  }

  console.log('\n--- Generating Web & PWA Icons ---');
  await makeSolidIcon(192, 0.70, 'public/pwa-192x192.png');
  await makeSolidIcon(512, 0.70, 'public/pwa-512x512.png');
  await makeSolidIcon(180, 0.70, 'public/apple-touch-icon.png');
  await makeSolidIcon(64, 0.75, 'public/favicon.png');
  await makeSolidIcon(512, 0.70, 'public/icon-dark.png');
  await makeSolidIcon(512, 0.70, 'public/icon-light.png');
  await makeTransparentLogo(512, 'public/logo.png');

  console.log('\n--- Generating iOS AppIcon ---');
  await makeSolidIcon(1024, 0.70, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');

  console.log('\n--- Generating Android Icons ---');
  const androidDensities = [
    { name: 'mdpi', launcherSize: 48, fgSize: 108 },
    { name: 'hdpi', launcherSize: 72, fgSize: 162 },
    { name: 'xhdpi', launcherSize: 96, fgSize: 216 },
    { name: 'xxhdpi', launcherSize: 144, fgSize: 324 },
    { name: 'xxxhdpi', launcherSize: 192, fgSize: 432 },
  ];

  for (const d of androidDensities) {
    const baseDir = `android/app/src/main/res/mipmap-${d.name}`;
    await makeSolidIcon(d.launcherSize, 0.70, `${baseDir}/ic_launcher.png`);
    await makeSolidIcon(d.launcherSize, 0.65, `${baseDir}/ic_launcher_round.png`);
    await makeTransparentForeground(d.fgSize, 0.65, `${baseDir}/ic_launcher_foreground.png`);
  }

  // Update android/app/src/main/res/values/ic_launcher_background.xml
  const bgXmlPath = 'android/app/src/main/res/values/ic_launcher_background.xml';
  const bgXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0A0A0B</color>
</resources>
`;
  fs.writeFileSync(bgXmlPath, bgXmlContent, 'utf-8');
  console.log(`✓ Updated ${bgXmlPath} with #0A0A0B`);

  // Remove old drawable-v24/ic_launcher_foreground.xml if present
  const oldAndroidRobot = 'android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml';
  if (fs.existsSync(oldAndroidRobot)) {
    fs.unlinkSync(oldAndroidRobot);
    console.log(`✓ Deleted obsolete ${oldAndroidRobot}`);
  }

  // Update drawable/ic_launcher_background.xml to #0A0A0B
  const drawableBgPath = 'android/app/src/main/res/drawable/ic_launcher_background.xml';
  if (fs.existsSync(drawableBgPath)) {
    const solidBgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#0A0A0B"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`;
    fs.writeFileSync(drawableBgPath, solidBgXml, 'utf-8');
    console.log(`✓ Updated ${drawableBgPath} with obsidian #0A0A0B`);
  }

  console.log('\nAll application icons successfully generated and synced!');
}

generateAllIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
