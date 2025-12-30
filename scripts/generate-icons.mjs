import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// Create a simple icon programmatically
const createIcon = async (size, filename) => {
  // Create a simple indigo background with a white inventory icon
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1"/>
          <stop offset="100%" style="stop-color:#4f46e5"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#bg)" rx="${size * 0.15}"/>
      <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size * 0.006})">
        <rect x="10" y="10" width="80" height="15" rx="3" fill="white" opacity="0.9"/>
        <rect x="10" y="35" width="80" height="15" rx="3" fill="white" opacity="0.7"/>
        <rect x="10" y="60" width="80" height="15" rx="3" fill="white" opacity="0.5"/>
        <circle cx="75" cy="65" r="20" fill="#10b981"/>
        <path d="M68 65 L73 70 L82 60" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(publicDir, filename));
  
  console.log(`Generated ${filename}`);
};

// Generate icons
await createIcon(192, 'pwa-192x192.png');
await createIcon(512, 'pwa-512x512.png');
await createIcon(180, 'apple-touch-icon.png');
await createIcon(32, 'favicon-32x32.png');
await createIcon(16, 'favicon-16x16.png');

console.log('All icons generated successfully!');
