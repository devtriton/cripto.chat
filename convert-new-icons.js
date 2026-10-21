const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convert() {
  const iconsDir = path.join(__dirname, 'icons');
  
  // Convert new 512
  await sharp(path.join(iconsDir, 'icon-512-new.svg'))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('Created icon-512.png (new)');
  
  // Convert new 192
  await sharp(path.join(iconsDir, 'icon-192-new.svg'))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('Created icon-192.png (new)');
  
  // Maskable versions (with padding)
  await sharp(path.join(iconsDir, 'icon-512-new.svg'))
    .resize(512, 512, { fit: 'contain', background: '#c4a35a' })
    .png()
    .toFile(path.join(iconsDir, 'icon-512-maskable.png'));
  console.log('Created icon-512-maskable.png (new)');
  
  await sharp(path.join(iconsDir, 'icon-192-new.svg'))
    .resize(192, 192, { fit: 'contain', background: '#c4a35a' })
    .png()
    .toFile(path.join(iconsDir, 'icon-192-maskable.png'));
  console.log('Created icon-192-maskable.png (new)');
}

convert().catch(console.error);