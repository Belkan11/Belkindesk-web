import fs from 'fs';
import path from 'path';
import pkg from 'firebase-admin';
const { applicationDefault } = pkg;

const EXPECTED_PROJECT_ID = 'atlantean-market-d6shk';
const CONFIG_FILE_NAME = 'firebase-applet-config.json';
const EXPECTED_HOSTNAME = 'belkindesk.ai.studio';

console.log('🛡️ Starting Server-Side Firebase Auth Providers Security Audit...');

// 1. Read firebase-applet-config.json
const configPath = path.resolve(CONFIG_FILE_NAME);
if (!fs.existsSync(configPath)) {
  console.error(`❌ ERROR: Configuration file "${CONFIG_FILE_NAME}" was not found.`);
  process.exit(1);
}

const configContent = fs.readFileSync(configPath, 'utf8');
let appConfig;
try {
  appConfig = JSON.parse(configContent);
} catch (err) {
  console.error(`❌ ERROR: Failed to parse "${CONFIG_FILE_NAME}" as JSON:`, err.message);
  process.exit(1);
}

const projectId = appConfig.projectId;

// 2. Validate Project ID
if (projectId !== EXPECTED_PROJECT_ID) {
  console.error(`❌ ERROR: Invalid project ID. Expected "${EXPECTED_PROJECT_ID}", but found "${projectId || 'empty'}".`);
  process.exit(1);
}
console.log(`✅ Project ID validation passed: "${projectId}"`);

// 3. Obtain Google Application Default Credentials (ADC)
console.log('🔑 Obtaining Application Default Credentials...');
let accessToken;
try {
  // Initialize Admin SDK with Application Default Credentials
  const cred = applicationDefault();
  const tokenObj = await cred.getAccessToken();
  accessToken = tokenObj.access_token;
  console.log('✅ Google OAuth Access Token successfully generated.');
} catch (err) {
  console.error('\n❌ ERROR: Insufficient or missing Google Application Default Credentials (ADC).');
  console.error('This script performs a REAL read-only query to the Google Identity Toolkit API to verify Auth providers.');
  console.error('To run this check successfully, you must provide a valid Google Cloud credential.');
  console.error('\n📋 REQUIRED CONFIGURATION:');
  console.error('1. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to your service account JSON file:');
  console.error('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"');
  console.error('2. Or run local gcloud authentication:');
  console.error('   gcloud auth application-default login');
  console.error('\n🔑 REQUIRED IAM PERMISSIONS:');
  console.error('- "firebaseauth.configs.get" (on project "atlantean-market-d6shk")');
  console.error('- This permission is standard in roles:');
  console.error('  * Firebase Auth Viewer (roles/firebaseauth.viewer)');
  console.error('  * Viewer (roles/viewer)');
  console.error('  * Browser (roles/browser)');
  console.error('\nDetailed Error from Firebase Admin SDK:', err.message || err);
  console.error('\n⚠️ Stopping check with exit code 1 to avoid false-positive PASS.');
  process.exit(1);
}

// 4. Decode Token Info for deep diagnosis
async function fetchTokenInfo(token) {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // ignore
  }
  return null;
}

const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let fileServiceAccount = null;
let fileProject = null;
if (adcPath && fs.existsSync(adcPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(adcPath, 'utf8'));
    fileServiceAccount = raw.client_email;
    fileProject = raw.project_id;
  } catch (e) {
    // ignore
  }
}

const tokenInfo = await fetchTokenInfo(accessToken);
const currentPrincipal = tokenInfo?.email || fileServiceAccount || 'Unknown Principal (ADC)';
const quotaProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || fileProject || 'Unknown Quota Project';

// 5. Call Google Identity Toolkit Admin API to fetch project configuration
console.log(`📡 Querying Google Identity Toolkit API for project "${projectId}"...`);
let apiConfig;
try {
  const res = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorObj = null;
    try {
      errorObj = JSON.parse(errorText);
    } catch (e) {}

    const errorMessage = errorObj?.error?.message || errorText;

    if (res.status === 403) {
      console.error(`\n❌ ERROR 403: ACCESS DENIED / FORBIDDEN`);
      console.error(`--------------------------------------------------`);
      console.error(`🛡️  Target Firebase Project:  ${EXPECTED_PROJECT_ID}`);
      console.error(`🔑  Actual ADC Principal:     ${currentPrincipal}`);
      console.error(`💼  Quota/Billing Project:    ${quotaProject}`);
      console.error(`📁  Credentials Project ID:   ${fileProject || 'Not set in keyfile'}`);
      console.error(`--------------------------------------------------`);
      console.error(`💬  Google API Error Message:`);
      console.error(`    ${errorMessage}`);
      console.error(`--------------------------------------------------`);

      console.error(`🔍 PRECISE DIAGNOSIS:`);
      if (errorMessage.includes('Identity Toolkit API has not been used') || errorMessage.includes('is disabled')) {
        console.error(`   👉 Reason B: The "Identity Toolkit API" is DISABLED in the calling GCP project.`);
        console.error(`   👉 Action: Visit the activation link in the error message to enable the API for the calling project.`);
      } else if (fileProject && fileProject !== EXPECTED_PROJECT_ID) {
        console.error(`   👉 Reason C: Project mismatch. Your ADC credentials belong to project "${fileProject}", but you are trying to query "${EXPECTED_PROJECT_ID}".`);
        console.error(`   👉 Action: Authenticate with the correct project or service account.`);
      } else {
        console.error(`   👉 Reason A: The authenticated principal lacks the necessary "firebaseauth.configs.get" permission.`);
        console.error(`   👉 Action: Ensure the principal has been granted "Firebase Auth Viewer" (roles/firebaseauth.viewer) or "Viewer" role in project "${EXPECTED_PROJECT_ID}".`);
      }
      console.error(`--------------------------------------------------`);
      process.exit(1);
    }

    console.error(`\n❌ ERROR: Identity Toolkit API returned status ${res.status}.`);
    console.error(`Response details: ${errorMessage}`);
    process.exit(1);
  }

  apiConfig = await res.json();
  console.log('✅ Identity Platform project configuration retrieved successfully.');
} catch (err) {
  console.error('\n❌ ERROR: Failed to make HTTP request to Identity Toolkit API:', err.message || err);
  process.exit(1);
}

// 6. Verify Email/Password Provider State
const emailConfig = apiConfig.signIn?.email;
if (!emailConfig || !emailConfig.enabled) {
  console.error('\n❌ ERROR: Firebase Email/Password authentication is DISABLED in Firebase Console!');
  console.error('To resolve this, enable "Email/Password" under Authentication -> Sign-in method in the Firebase Console.');
  process.exit(1);
}
console.log('✅ PASS: Firebase Email/Password authentication is ENABLED.');

// 7. Verify Google Provider State
console.log('📡 Querying Identity Toolkit API for Google IdP configuration...');
try {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v2/projects/${projectId}/defaultSupportedIdpConfigs/google.com`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (res.status === 404) {
    console.error('\n❌ ERROR: Google authentication is DISABLED or not configured in Firebase Console!');
    console.error('To resolve this, enable "Google" under Authentication -> Sign-in method in the Firebase Console.');
    process.exit(1);
  } else if (!res.ok) {
    const errorBody = await res.text();
    console.error(`\n❌ ERROR: Failed to retrieve Google provider configuration. Status: ${res.status}.`);
    console.error(`Details: ${errorBody}`);
    process.exit(1);
  } else {
    const googleIdpConfig = await res.json();
    if (!googleIdpConfig.enabled) {
      console.error('\n❌ ERROR: Google authentication is DISABLED in the retrieved configuration.');
      process.exit(1);
    }
    console.log('✅ PASS: Google authentication is ENABLED.');
  }
} catch (err) {
  console.error('\n❌ ERROR: Failed to make HTTP request for Google IdP configuration:', err.message || err);
  process.exit(1);
}

// 8. Verify Authorized Domains by exact hostname match
const authorizedDomains = apiConfig.authorizedDomains || [];
console.log(`🌐 Checking authorized domains list: ${JSON.stringify(authorizedDomains)}`);
const hasProdDomain = authorizedDomains.includes(EXPECTED_HOSTNAME);
if (!hasProdDomain) {
  console.error(`\n❌ ERROR: Production authorized domains do not contain exact hostname "${EXPECTED_HOSTNAME}"!`);
  console.error(`Please add "${EXPECTED_HOSTNAME}" to the Authorized Domains list under Authentication -> Settings -> Authorized Domains in the Firebase Console.`);
  process.exit(1);
}
console.log(`✅ PASS: Authorized domains list successfully contains "${EXPECTED_HOSTNAME}".`);

console.log('\n🌟 Firebase Authentication Providers Security Audit completed successfully! ALL CHECKPOINTS PASSED.');
process.exit(0);
