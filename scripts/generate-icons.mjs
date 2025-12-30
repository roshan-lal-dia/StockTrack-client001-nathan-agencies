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

// Generate screenshots for PWA install UI
const createScreenshot = async (width, height, filename, isWide) => {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f172a"/>
          <stop offset="100%" style="stop-color:#1e293b"/>
        </linearGradient>
      </defs>
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
      
      <!-- Sidebar -->
      <rect x="0" y="0" width="${isWide ? 240 : 0}" height="${height}" fill="#1e293b"/>
      
      <!-- Header -->
      <rect x="${isWide ? 240 : 0}" y="0" width="${width - (isWide ? 240 : 0)}" height="64" fill="#1e293b"/>
      
      <!-- Logo area -->
      <rect x="20" y="16" width="32" height="32" rx="8" fill="#6366f1"/>
      <text x="60" y="38" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">StockTrack Pro</text>
      
      <!-- Stats cards -->
      <rect x="${isWide ? 280 : 20}" y="100" width="${isWide ? 200 : (width - 40) / 2 - 10}" height="100" rx="16" fill="#1e293b"/>
      <rect x="${isWide ? 500 : (width / 2) + 10}" y="100" width="${isWide ? 200 : (width - 40) / 2 - 10}" height="100" rx="16" fill="#1e293b"/>
      ${isWide ? '<rect x="720" y="100" width="200" height="100" rx="16" fill="#1e293b"/>' : ''}
      ${isWide ? '<rect x="940" y="100" width="200" height="100" rx="16" fill="#1e293b"/>' : ''}
      
      <!-- Product cards -->
      <rect x="${isWide ? 280 : 20}" y="230" width="${isWide ? 350 : width - 40}" height="140" rx="16" fill="#1e293b"/>
      ${isWide ? '<rect x="650" y="230" width="350" height="140" rx="16" fill="#1e293b"/>' : ''}
      <rect x="${isWide ? 280 : 20}" y="390" width="${isWide ? 350 : width - 40}" height="140" rx="16" fill="#1e293b"/>
      ${isWide ? '<rect x="650" y="390" width="350" height="140" rx="16" fill="#1e293b"/>' : ''}
      
      <!-- Product placeholders -->
      <rect x="${isWide ? 300 : 40}" y="250" width="60" height="60" rx="8" fill="#334155"/>
      <rect x="${isWide ? 380 : 120}" y="260" width="120" height="16" rx="4" fill="#475569"/>
      <rect x="${isWide ? 380 : 120}" y="286" width="80" height="12" rx="3" fill="#334155"/>
      
      <!-- Accent elements -->
      <circle cx="${isWide ? 320 : 60}" y="120" r="24" fill="#6366f1" opacity="0.3"/>
      <rect x="${isWide ? 300 : 40}" y="150" width="60" height="20" rx="4" fill="#10b981"/>
      
      <!-- Bottom nav for mobile -->
      ${!isWide ? `<rect x="0" y="${height - 80}" width="${width}" height="80" fill="#1e293b"/>` : ''}
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toFile(join(publicDir, filename));
  
  console.log(`Generated ${filename}`);
};

await createScreenshot(1280, 720, 'screenshot-wide.png', true);
await createScreenshot(390, 844, 'screenshot-mobile.png', false);

console.log('All icons and screenshots generated successfully!');
