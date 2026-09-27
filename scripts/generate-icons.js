// Simple standalone script to generate PNG icons using native zlib and PNG format specification
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer with filter byte per row: (width * 4 + 1) * height
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  const bgColor = { r: 33, g: 37, b: 41, a: 255 }; // #212529
  const pageColor = { r: 250, g: 248, b: 245, a: 255 }; // #FAF8F5
  const pageShadow = { r: 211, g: 206, b: 191, a: 255 };
  const lineCol = { r: 156, g: 163, b: 175, a: 160 };
  const bookmarkCol = { r: 217, g: 119, b: 6, a: 255 }; // Amber 600

  // Safe margin for maskable icons is 15%, regular icons use ~10% padding
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Normalized coordinates relative to center (-1 to 1)
      const nx = (x - cx) / (cx * scale);
      const ny = (y - cy) / (cy * scale);

      let r = bgColor.r;
      let g = bgColor.g;
      let b = bgColor.b;
      let a = bgColor.a;

      // Squircle background corner radius check for non-maskable icons
      if (!isMaskable) {
        const cornerDist = Math.pow(Math.abs(x - cx) / (cx * 0.94), 4) + Math.pow(Math.abs(y - cy) / (cy * 0.94), 4);
        if (cornerDist > 1) {
          a = 0;
        }
      }

      if (a > 0) {
        // Book boundary test
        const inBookX = Math.abs(nx) <= 0.82;
        const bookTop = -0.52 + Math.abs(nx) * 0.08 - (1 - Math.abs(nx)) * 0.04;
        const bookBottom = 0.54 - Math.abs(nx) * 0.04;

        if (inBookX && ny >= bookTop && ny <= bookBottom) {
          // Inside open book pages
          r = pageColor.r;
          g = pageColor.g;
          b = pageColor.b;

          // Page curve shadow towards spine
          const distToSpine = Math.abs(nx);
          if (distToSpine < 0.08) {
            const shadowFactor = distToSpine / 0.08;
            r = Math.round(pageShadow.r + (pageColor.r - pageShadow.r) * shadowFactor);
            g = Math.round(pageShadow.g + (pageColor.g - pageShadow.g) * shadowFactor);
            b = Math.round(pageShadow.b + (pageColor.b - pageShadow.b) * shadowFactor);
          }

          // Spine line
          if (distToSpine < 0.015) {
            r = 160;
            g = 150;
            b = 140;
          }

          // Subtle text lines
          if (distToSpine > 0.15 && distToSpine < 0.72) {
            const lineYPositions = [-0.25, -0.08, 0.09, 0.26];
            for (const ly of lineYPositions) {
              if (Math.abs(ny - ly) < 0.025) {
                r = Math.round((r * 100 + lineCol.r * 155) / 255);
                g = Math.round((g * 100 + lineCol.g * 155) / 255);
                b = Math.round((b * 100 + lineCol.b * 155) / 255);
              }
            }
          }

          // Bookmark ribbon
          if (Math.abs(nx) < 0.035 && ny >= -0.60 && ny <= 0.12) {
            r = bookmarkCol.r;
            g = bookmarkCol.g;
            b = bookmarkCol.b;
          }
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // PNG Specification chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // Bit depth
  ihdr.writeUInt8(6, 17); // Color type: RGBA
  ihdr.writeUInt8(0, 18); // Compression
  ihdr.writeUInt8(0, 19); // Filter
  ihdr.writeUInt8(0, 20); // Interlace
  ihdr.writeInt32BE(crc32(ihdr.subarray(4, 21)), 21);

  // IDAT
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  idat.writeInt32BE(crc32(idat.subarray(4, compressed.length + 8)), compressed.length + 8);

  // IEND
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4);
  iend.writeInt32BE(crc32(iend.subarray(4, 8)), 8);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 implementation
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), createPNG(32, 32, false));

console.log('Successfully generated all PWA PNG icons in /public.');
