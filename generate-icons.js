#!/usr/bin/env node

// PWA Icon Generator Script
// Generates basic colored icons for PWA testing
// In production, replace with actual app icons

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Generate SVG-based placeholder icons
function generateIcon(size) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d9488;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f766e;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#grad)"/>
  
  <!-- Lead Machine icon - simplified chart/graph -->
  <g transform="translate(${size*0.2}, ${size*0.2})">
    <!-- Chart bars -->
    <rect x="${size*0.1}" y="${size*0.4}" width="${size*0.08}" height="${size*0.2}" fill="white" opacity="0.9"/>
    <rect x="${size*0.25}" y="${size*0.3}" width="${size*0.08}" height="${size*0.3}" fill="white" opacity="0.9"/>
    <rect x="${size*0.4}" y="${size*0.2}" width="${size*0.08}" height="${size*0.4}" fill="white" opacity="0.9"/>
    
    <!-- Connecting line -->
    <path d="M${size*0.14} ${size*0.45} L${size*0.29} ${size*0.35} L${size*0.44} ${size*0.25}" 
          stroke="white" stroke-width="2" fill="none" opacity="0.8"/>
    
    <!-- Growth arrow -->
    <path d="M${size*0.38} ${size*0.3} L${size*0.45} ${size*0.23} L${size*0.45} ${size*0.3} Z" 
          fill="white" opacity="0.8"/>
  </g>
  
  <!-- Text (for larger icons) -->
  ${size >= 192 ? `
  <text x="${size/2}" y="${size*0.85}" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-size="${size*0.08}" font-weight="bold">
    LEAD
  </text>` : ''}
</svg>`;

  return svg;
}

// Convert SVG to simple data URL (for testing purposes)
function svgToDataUrl(svg) {
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Generate all icon sizes
iconSizes.forEach(size => {
  const svg = generateIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`Generated ${filename}`);
});

// Create a PNG placeholder instruction file
const pngInstructions = `# PWA Icon Instructions

The SVG icons have been generated as placeholders. For production, you should:

1. Create PNG versions of these icons using the following sizes:
   ${iconSizes.map(size => `- ${size}x${size}px`).join('\n   ')}

2. Use tools like:
   - Adobe Illustrator/Photoshop
   - Figma
   - Online PWA icon generators
   - ImageMagick for conversion

3. Replace the SVG files with PNG files:
   ${iconSizes.map(size => `- icon-${size}x${size}.png`).join('\n   ')}

4. Ensure icons follow PWA guidelines:
   - Minimum 48x48px
   - Maximum 512x512px
   - Square aspect ratio
   - Clear, recognizable design
   - Works well on various backgrounds

Current placeholder shows a simple chart/graph representing lead management.
`;

fs.writeFileSync(path.join(iconDir, 'README.md'), pngInstructions);

console.log('PWA icons generated successfully!');
console.log('Check public/icons/ directory for SVG placeholders.');
console.log('Replace with PNG versions for production use.');