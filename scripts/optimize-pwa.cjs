const { execSync } = require('child_process');

console.log('Delegating PWA icon optimization to scripts/generate-all-app-icons.cjs...');
execSync('node scripts/generate-all-app-icons.cjs', { stdio: 'inherit' });
