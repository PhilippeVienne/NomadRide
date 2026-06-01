import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, '../public/logos');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const placeholders = {
  totalenergies: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff0055" />
        <stop offset="50%" stop-color="#ffaa00" />
        <stop offset="100%" stop-color="#00bbff" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#tg)"/>
    <path d="M35,30 C55,25 75,45 65,65 C55,75 35,65 40,45" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  </svg>`,

  esso: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="50" rx="46" ry="32" fill="#ffffff" stroke="#0f3b94" stroke-width="6"/>
    <text x="50" y="58" font-family="'Outfit', sans-serif" font-weight="900" font-size="24" fill="#ca0a14" text-anchor="middle" letter-spacing="1">ESSO</text>
  </svg>`,

  bp: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#00853f"/>
    <path d="M50,10 L58,35 L83,30 L65,48 L80,70 L52,58 L40,78 L42,52 L18,48 L38,36 Z" fill="#ffd500"/>
    <circle cx="50" cy="50" r="16" fill="#ffffff"/>
  </svg>`,

  shell: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50,10 C25,25 15,65 20,85 L35,85 C40,75 45,75 50,85 C55,75 60,75 65,85 L80,85 C85,65 75,25 50,10 Z" fill="#ffd500" stroke="#ca0a14" stroke-width="6"/>
    <path d="M35,85 L38,50 M45,85 L46,45 M55,85 L54,45 M65,85 L62,50" stroke="#ca0a14" stroke-width="4" stroke-linecap="round"/>
  </svg>`,

  avia: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="#e30613"/>
    <text x="50" y="59" font-family="'Orbitron', sans-serif" font-weight="900" font-size="26" fill="#ffffff" text-anchor="middle">AVIA</text>
  </svg>`,

  intermarche: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="#13131a" stroke="#ca0913" stroke-width="4"/>
    <path d="M35,35 L65,65 M65,35 L35,65 M50,25 L50,75" stroke="#ca0913" stroke-width="8" stroke-linecap="round"/>
  </svg>`,

  "e.leclerc": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="#0066b2"/>
    <circle cx="50" cy="50" r="28" fill="#ffffff"/>
    <text x="50" y="60" font-family="'Outfit', sans-serif" font-weight="900" font-size="34" fill="#ff7f00" text-anchor="middle">L</text>
  </svg>`,

  carrefour: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M15,50 L45,20 L45,80 Z" fill="#ca0a14"/>
    <path d="M85,50 L55,20 L55,80 Z" fill="#003893"/>
    <circle cx="50" cy="50" r="20" fill="#ffffff"/>
    <path d="M42,50 C42,40 58,40 58,50 C58,60 42,60 42,50 Z" fill="none" stroke="#003893" stroke-width="6"/>
  </svg>`,

  systeme_u: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="#004C99"/>
    <text x="50" y="63" font-family="'Outfit', sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">U</text>
  </svg>`,

  auchan: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#e30613" stroke-width="6"/>
    <path d="M30,60 C40,40 60,30 75,45 C65,55 45,55 35,65 C30,70 25,65 30,60 Z" fill="#e30613"/>
    <circle cx="70" cy="40" r="4" fill="#4ea93b"/>
  </svg>`,

  eni: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="12" fill="#ffd500" stroke="#121214" stroke-width="6"/>
    <text x="50" y="58" font-family="'Outfit', sans-serif" font-weight="900" font-size="28" fill="#121214" text-anchor="middle">eni</text>
  </svg>`
};

console.log('Generating local SVG placeholders for brands...');
for (const [name, content] of Object.entries(placeholders)) {
  const filePath = path.join(targetDir, `${name}.svg`);
  fs.writeFileSync(filePath, content);
  console.log(`✅ Generated: ${name}.svg`);
}
console.log('🎉 Done! Placeholders created.');
