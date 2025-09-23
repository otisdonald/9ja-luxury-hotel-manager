// Icon generation script for Hotel Manager PWA
// This creates a simple hotel icon in different sizes

const iconSizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// Create SVG template for hotel icon
function generateIconSVG(size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#2c3e50" rx="${Math.round(size * 0.1)}"/>
  <g fill="white">
    <!-- Hotel building -->
    <rect x="${Math.round(size * 0.2)}" y="${Math.round(size * 0.3)}" width="${Math.round(size * 0.6)}" height="${Math.round(size * 0.5)}" fill="#34495e"/>
    <rect x="${Math.round(size * 0.25)}" y="${Math.round(size * 0.35)}" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.45)}" fill="#2c3e50"/>
    
    <!-- Windows grid -->
    ${generateWindows(size)}
    
    <!-- Door -->
    <rect x="${Math.round(size * 0.4)}" y="${Math.round(size * 0.65)}" width="${Math.round(size * 0.2)}" height="${Math.round(size * 0.15)}" fill="#e67e22"/>
    
    <!-- Crown symbol -->
    <g transform="translate(${size/2}, ${Math.round(size * 0.25)})">
      <path d="M${-size*0.06},${-size*0.03} L${-size*0.03},${size*0.03} L0,${-size*0.015} L${size*0.03},${size*0.03} L${size*0.06},${-size*0.03} L${size*0.04},${size*0.06} L${-size*0.04},${size*0.06} Z" fill="#f1c40f"/>
    </g>
  </g>
</svg>`;
}

function generateWindows(size) {
    const windowSize = Math.round(size * 0.06);
    const spacing = Math.round(size * 0.12);
    const startX = Math.round(size * 0.3);
    const startY = Math.round(size * 0.4);
    
    let windows = '';
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const x = startX + (col * spacing);
            const y = startY + (row * spacing);
            if (!(row === 2 && col === 1)) { // Skip middle window on bottom row (door area)
                windows += `<rect x="${x}" y="${y}" width="${windowSize}" height="${windowSize}" fill="#f39c12"/>\\n    `;
            }
        }
    }
    return windows;
}

// Instructions for creating actual PNG files:
console.log('To create PNG icons, use an online SVG to PNG converter or Node.js with a library like sharp');
console.log('For each size, convert the generated SVG to PNG format');

// Export sizes and SVG generator
if (typeof module !== 'undefined') {
    module.exports = { iconSizes, generateIconSVG };
}