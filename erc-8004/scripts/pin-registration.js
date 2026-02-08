/**
 * Pin the Synapz ERC-8004 registration file to Hippius S3.
 *
 * Uploads registration.json to Hippius S3 storage and provides
 * a publicly-accessible URL for use as the agent URI.
 *
 * Prerequisites:
 *   1. aws CLI installed
 *   2. HIPPIUS_S3_ACCESS_KEY and HIPPIUS_S3_SECRET_KEY set
 *   3. registration.json exists in erc-8004/ directory
 *
 * Usage:
 *   node scripts/pin-registration.js
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REG_PATH = join(ROOT, 'registration.json');

function main() {
  // Validate registration file exists
  if (!existsSync(REG_PATH)) {
    console.error('Error: registration.json not found at', REG_PATH);
    process.exit(1);
  }

  // Validate JSON is well-formed
  const content = readFileSync(REG_PATH, 'utf-8');
  try {
    const parsed = JSON.parse(content);
    console.log('Registration file validated:');
    console.log(`  Name: ${parsed.name}`);
    console.log(`  Active: ${parsed.active}`);
    console.log(`  Services: ${parsed.services?.map(s => s.name).join(', ') || 'none'}`);
  } catch (err) {
    console.error('Error: registration.json is not valid JSON:', err.message);
    process.exit(1);
  }

  // Check credentials
  const accessKey = process.env.HIPPIUS_S3_ACCESS_KEY;
  const secretKey = process.env.HIPPIUS_S3_SECRET_KEY;

  if (!accessKey || !secretKey) {
    console.error('Error: HIPPIUS_S3_ACCESS_KEY and HIPPIUS_S3_SECRET_KEY must be set');
    process.exit(1);
  }

  // Check if aws CLI is available
  try {
    execSync('which aws', { stdio: 'pipe' });
  } catch {
    console.error('Error: aws CLI not found. Install with: pip install awscli');
    process.exit(1);
  }

  const bucket = process.env.HIPPIUS_S3_BUCKET || 'synapz-state';
  const s3Key = 'erc-8004/registration.json';
  const endpoint = 'https://s3.hippius.com';

  // Upload to Hippius S3
  console.log('\nUploading registration.json to Hippius S3...');
  let output;
  try {
    output = execSync(
      `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" ` +
      `aws --endpoint-url ${endpoint} --region decentralized ` +
      `s3 cp "${REG_PATH}" "s3://${bucket}/${s3Key}" --content-type application/json`,
      { encoding: 'utf-8', timeout: 60000 }
    );
  } catch (err) {
    console.error('Error: Failed to upload to Hippius S3:', err.message);
    process.exit(1);
  }

  console.log(output.trim());

  // The S3 URL serves as the agent URI
  // Note: This is an S3 path, not an IPFS CID. If IPFS pinning is needed,
  // use the hippius CLI with a self-hosted IPFS node separately.
  const s3Uri = `s3://${bucket}/${s3Key}`;
  console.log(`\nUploaded successfully!`);
  console.log(`  S3 URI: ${s3Uri}`);
  console.log(`  Bucket: ${bucket}`);
  console.log(`  Key: ${s3Key}`);

  // Update .env with AGENT_URI (keep existing IPFS URI if present)
  const envPath = join(ROOT, '.env');
  if (existsSync(envPath)) {
    let envContent = readFileSync(envPath, 'utf-8');
    // Don't overwrite an existing IPFS URI — only set if empty or already S3
    const uriMatch = envContent.match(/^AGENT_URI=(.*)$/m);
    if (!uriMatch || !uriMatch[1] || uriMatch[1].startsWith('s3://')) {
      if (envContent.includes('AGENT_URI=')) {
        envContent = envContent.replace(/AGENT_URI=.*/, `AGENT_URI=${s3Uri}`);
      } else {
        envContent += `\nAGENT_URI=${s3Uri}\n`;
      }
      writeFileSync(envPath, envContent);
      console.log(`  Updated .env with AGENT_URI=${s3Uri}`);
    } else {
      console.log(`  Keeping existing AGENT_URI=${uriMatch[1]}`);
    }
  } else {
    console.log(`\n  Add this to your .env file:`);
    console.log(`  AGENT_URI=${s3Uri}`);
  }

  console.log('\nNext steps:');
  console.log('  1. Run "npm run register" to register on-chain');
  console.log('  2. Or "npm run update-uri" to update an existing registration');
}

main();
