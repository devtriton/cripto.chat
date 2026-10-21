const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convert() {
  const iconsDir = path.join(__dirname, 'icons');
  
  // Convert icon-192.svg -> icon-192.png
  await sharp(path.join(iconsDir, 'icon-192.svg'))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('Created icon-192.png');
  
  // Convert icon-512.svg -> icon-512.png
  await sharp(path.join(iconsDir, 'icon-512.svg'))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('Created icon-512.png');
  
  // Also create a maskable version (with padding for safe zone)
  await sharp(path.join(iconsDir, 'icon-512.svg'))
    .resize(512, 512, { fit: 'contain', background: '#c4a35a' })
    .png()
    .toFile(path.join(iconsDir, 'icon-512-maskable.png'));
  console.log('Created icon-512-maskable.png');
  
  await sharp(path.join(iconsDir, 'icon-192.svg'))
    .resize(192, 192, { fit: 'contain', background: '#c4a35a' })
    .png()
    .toFile(path.join(iconsDir, 'icon-192-maskable.png'));
  console.log('Created icon-192-maskable.png');
}

convert().catch(console.error);