const { execSync } = require('child_process');

console.log('Delegating icon generation to scripts/generate-all-app-icons.cjs...');
execSync('node scripts/generate-all-app-icons.cjs', { stdio: 'inherit' });
