const sharp = require('sharp');

async function make1024Icon() {
  const dest = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
  const iconBuffer = await sharp('public/icon-light.png')
    .resize(760, 760, { fit: 'inside' })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 10, g: 10, b: 11 }
    }
  })
    .composite([{ input: iconBuffer, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(dest);

  console.log(`1024x1024 AppIcon generated at ${dest}!`);
}

make1024Icon();
