import sharp from 'sharp';
const src = '/home/z/my-project/upload/logo-mark.avif';
const meta = await sharp(src).metadata();
console.log('uploaded logo:', meta.format, meta.width + 'x' + meta.height, 'hasAlpha:', meta.hasAlpha);
await sharp(src).png().toFile('/tmp/logo-uploaded.png');
console.log('converted to /tmp/logo-uploaded.png');
