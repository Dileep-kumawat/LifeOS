const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const auditDir = path.join(__dirname, '../out/audit');
if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
}

// Every 60 frames + key moments
const frames = [60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200, 1260, 1319];

console.log(`Starting audit render for ${frames.length} frames...`);

for (const f of frames) {
  const outPath = path.join(auditDir, `main-f${f}.png`);
  console.log(`Rendering Main at frame ${f}...`);
  try {
    execSync(`npx remotion still Main "${outPath}" --frame=${f} --overwrite`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  } catch (err) {
    console.error(`Failed at frame ${f}:`, err.message);
  }
}

console.log('All audit stills rendered!');
