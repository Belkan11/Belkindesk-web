import fs from 'fs';
import path from 'path';

const EXPECTED_PROJECT_ID = 'atlantean-market-d6shk';
const CONFIG_FILE_NAME = 'firebase-applet-config.json';

console.log('🔍 Running Firebase Production Configuration Audit...');

try {
  const configPath = path.resolve(CONFIG_FILE_NAME);
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Error: Config file "${CONFIG_FILE_NAME}" was not found at the root of the project.`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(configPath, 'utf8');
  let config;
  
  try {
    config = JSON.parse(fileContent);
  } catch (err) {
    console.error(`❌ Error: Failed to parse "${CONFIG_FILE_NAME}" as valid JSON.`, err.message);
    process.exit(1);
  }

  const errors = [];

  // 1. Verify expected projectId
  if (config.projectId !== EXPECTED_PROJECT_ID) {
    errors.push(`projectId mismatch: expected "${EXPECTED_PROJECT_ID}", but found "${config.projectId || 'empty'}"`);
  }

  // 2. Verify presence of apiKey
  if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
    errors.push('apiKey is missing or empty');
  }

  // 3. Verify presence of authDomain
  if (!config.authDomain || typeof config.authDomain !== 'string' || config.authDomain.trim() === '') {
    errors.push('authDomain is missing or empty');
  }

  // 4. Verify presence of appId
  if (!config.appId || typeof config.appId !== 'string' || config.appId.trim() === '') {
    errors.push('appId is missing or empty');
  }

  if (errors.length > 0) {
    console.error('\n❌ FIREBASE PRODUCTION CONFIGURATION AUDIT FAILED!');
    errors.forEach((err) => console.error(`  - ${err}`));
    console.error(`\nPlease restore the correct production keys in "${CONFIG_FILE_NAME}".`);
    process.exit(1);
  }

  console.log('✅ PASS: Firebase configuration matches expected production schema and values.');
  process.exit(0);
} catch (err) {
  console.error('❌ Error during Firebase production config validation:', err);
  process.exit(1);
}
