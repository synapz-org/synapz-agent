/**
 * Pin the Synapz ERC-8004 registration file to IPFS via Hippius.
 *
 * Uses the hipc CLI (Hippius IPFS client) to upload the registration
 * JSON and returns the IPFS CID for use as the agent URI.
 *
 * Prerequisites:
 *   1. hipc CLI installed and configured (~/.hippius/.env)
 *   2. registration.json exists in erc-8004/ directory
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

  // Check if hipc is available
  try {
    execSync('which hipc', { stdio: 'pipe' });
  } catch {
    console.error('Error: hipc CLI not found. Install Hippius CLI first.');
    console.error('See: https://github.com/hippius/hippius-cli');
    process.exit(1);
  }

  // Upload to IPFS via Hippius
  console.log('\nUploading registration.json to Hippius IPFS...');
  let output;
  try {
    output = execSync(`hipc upload-to-ipfs "${REG_PATH}"`, {
      encoding: 'utf-8',
      timeout: 60000,
    });
  } catch (err) {
    console.error('Error: Failed to upload to Hippius:', err.message);
    process.exit(1);
  }

  console.log(output);

  // Extract CID from output (handles both Qm... and bafy... formats)
  const cidMatch = output.match(/"Hash":"([^"]+)"/);
  if (!cidMatch) {
    // Try alternative output format
    const altMatch = output.match(/\b(Qm[a-zA-Z0-9]{44}|bafy[a-zA-Z0-9]+)\b/);
    if (!altMatch) {
      console.error('Error: Could not extract CID from hipc output');
      console.error('Raw output:', output);
      process.exit(1);
    }
    var cid = altMatch[1];
  } else {
    var cid = cidMatch[1];
  }

  const ipfsUri = `ipfs://${cid}`;
  console.log(`\nPinned successfully!`);
  console.log(`  CID: ${cid}`);
  console.log(`  IPFS URI: ${ipfsUri}`);
  console.log(`  Gateway: https://ipfs.io/ipfs/${cid}`);

  // Update .env with AGENT_URI
  const envPath = join(ROOT, '.env');
  if (existsSync(envPath)) {
    let envContent = readFileSync(envPath, 'utf-8');
    if (envContent.includes('AGENT_URI=')) {
      envContent = envContent.replace(/AGENT_URI=.*/, `AGENT_URI=${ipfsUri}`);
    } else {
      envContent += `\nAGENT_URI=${ipfsUri}\n`;
    }
    writeFileSync(envPath, envContent);
    console.log(`  Updated .env with AGENT_URI=${ipfsUri}`);
  } else {
    console.log(`\n  Add this to your .env file:`);
    console.log(`  AGENT_URI=${ipfsUri}`);
  }

  console.log('\nNext steps:');
  console.log('  1. Run "npm run register" to register on-chain');
  console.log('  2. Or "npm run update-uri" to update an existing registration');
}

main();
