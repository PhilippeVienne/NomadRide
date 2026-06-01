import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brands = [
  { name: 'totalenergies', domain: 'totalenergies.com' },
  { name: 'esso', domain: 'essocard.com' },
  { name: 'bp', domain: 'bp.com' },
  { name: 'shell', domain: 'shell.fr' },
  { name: 'avia', domain: 'avia-france.fr' },
  { name: 'intermarche', domain: 'intermarche.com' },
  { name: 'e.leclerc', domain: 'leclerc.fr' },
  { name: 'carrefour', domain: 'carrefour.fr' },
  { name: 'systeme_u', domain: 'systeme-u.fr' },
  { name: 'auchan', domain: 'auchan.fr' },
  { name: 'eni', domain: 'eni.fr' }
];

// Target directory: app/public/logos
const targetDir = path.join(__dirname, '../public/logos');

const token = process.argv[2] || process.env.LOGO_DEV_TOKEN;

if (!token) {
  console.error(`
❌ Error: logo.dev API token is required!
To download high-quality station logos, please obtain a token from logo.dev and run:

    node scripts/download_logos.js <YOUR_LOGO_DEV_TOKEN>

Or set the LOGO_DEV_TOKEN environment variable.
`);
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function downloadLogo(brand) {
  const fileName = `${brand.name}.png`;
  const filePath = path.join(targetDir, fileName);
  const url = `https://img.logo.dev/${brand.domain}?token=${token}`;

  try {
    console.log(`Downloading ${brand.name} logo from logo.dev...`);
    const response = await fetch(url);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ Saved: ${fileName}`);
    } else {
      console.error(`❌ Failed: status ${response.status} from logo.dev (check your token)`);
    }
  } catch (err) {
    console.error(`❌ Error downloading ${brand.name}:`, err);
  }
}

async function main() {
  console.log('🚀 Downloading station logos locally from logo.dev...');
  for (const brand of brands) {
    await downloadLogo(brand);
  }
  console.log('🎉 Done! Logos saved in app/public/logos/');
}

main();
