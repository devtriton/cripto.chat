const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = 'C:\\laragon\\www\\cripto.chat\\icons';
const svgPath = path.join(ICONS_DIR, 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

console.log('SVG loaded, size:', svgBuffer.length);

// Generate 192x192
sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(path.join(ICONS_DIR, 'icon-192.png'))
  .then(info => console.log('icon-192.png created:', info.size))
  .catch(err => console.error('Error creating 192:', err));

// Generate 512x512
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(path.join(ICONS_DIR, 'icon-512.png'))
  .then(info => console.log('icon-512.png created:', info.size))
  .catch(err => console.error('Error creating 512:', err));

// Generate maskable versions (same for now)
sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(path.join(ICONS_DIR, 'icon-192-maskable.png'))
  .then(info => console.log('icon-192-maskable.png created:', info.size))
  .catch(err => console.error('Error creating 192-maskable:', err));

sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(path.join(ICONS_DIR, 'icon-512-maskable.png'))
  .then(info => console.log('icon-512-maskable.png created:', info.size))
  .catch(err => console.error('Error creating 512-maskable:', err));