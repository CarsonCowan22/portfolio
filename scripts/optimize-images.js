const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const images = [
  'public/images/www.privix.com_project-details.png',
  'public/images/www.tecsolar.net_home.png',
  'public/images/cad-automation-1.png',
  'public/images/cad-automation-2.png',
];
const sizes = [800, 1200, 1400];
const outDir = 'public/images/optimized';
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  for (const img of images) {
    const abs = path.resolve(img);
    if (!fs.existsSync(abs)) {
      console.error('Source not found:', img);
      continue;
    }
    const name = path.basename(img, path.extname(img));
    for (const w of sizes) {
      const outWebp = path.join(outDir, `${name}-${w}.webp`);
      await sharp(abs).resize({ width: w }).webp({ quality: 80 }).toFile(outWebp);
      console.log('Wrote', outWebp);
    }

    // write an optimized PNG copy as a fallback
    const outPng = path.join(outDir, `${name}-optimized.png`);
    await sharp(abs).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outPng);
    console.log('Wrote', outPng);
  }
  console.log('All images processed');
})();
