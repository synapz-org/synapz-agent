/**
 * Register Synapz as an ERC-8004 Trustless Agent on Sepolia testnet.
 *
 * Prerequisites:
 *   1. npm install (in erc-8004/ directory)
 *   2. Copy .env.example to .env and fill in PRIVATE_KEY, SEPOLIA_RPC_URL
 *   3. Run pin-registration.js first to get AGENT_URI
 *   4. Fund wallet with Sepolia ETH from a faucet
 *
 * Usage:
 *   node scripts/register.js
 */

import 'dotenv/config';
import { ERC8004Client, EthersAdapter } from 'erc-8004-js';
import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Sepolia contract addresses (CREATE2 vanity addresses from ERC-8004)
const CONTRACTS = {
  sepolia: {
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    validationRegistry: '0x8004Cb1BF31DAf7788923b405b754f57acEB4272',
    chainId: 11155111,
  },
  mainnet: {
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    validationRegistry: '0x8004Cb1BF31DAf7788923b405b754f57acEB4272',
    chainId: 1,
  },
};

async function main() {
  const network = process.env.NETWORK || 'sepolia';
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const agentUri = process.env.AGENT_URI;

  if (!rpcUrl) {
    console.error('Error: SEPOLIA_RPC_URL not set in .env');
    process.exit(1);
  }
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  if (!agentUri) {
    console.error('Error: AGENT_URI not set in .env');
    console.error('Run "npm run pin-registration" first to pin the registration file to IPFS.');
    process.exit(1);
  }

  const addresses = CONTRACTS[network];
  if (!addresses) {
    console.error(`Error: Unknown network "${network}". Use "sepolia" or "mainnet".`);
    process.exit(1);
  }

  console.log(`Registering Synapz on ${network}...`);
  console.log(`  RPC: ${rpcUrl}`);
  console.log(`  Agent URI: ${agentUri}`);

  // Set up ethers provider and signer
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const address = await signer.getAddress();
  console.log(`  Owner wallet: ${address}`);

  // Check balance
  const balance = await provider.getBalance(address);
  console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) {
    console.error('Error: Wallet has no ETH. Get Sepolia ETH from a faucet.');
    process.exit(1);
  }

  // Initialize ERC-8004 client
  const adapter = new EthersAdapter(provider, signer);
  const client = new ERC8004Client({ adapter, addresses });

  // Register with URI
  console.log('\nSubmitting registration transaction...');
  const result = await client.identity.registerWithURI(agentUri);

  console.log('\nRegistration successful!');
  console.log(`  Agent ID: ${result.agentId}`);
  console.log(`  Tx Hash: ${result.txHash}`);

  // Update .env with agent ID
  const envPath = join(ROOT, '.env');
  let envContent = readFileSync(envPath, 'utf-8');
  if (envContent.includes('AGENT_ID=')) {
    envContent = envContent.replace(/AGENT_ID=.*/, `AGENT_ID=${result.agentId}`);
  } else {
    envContent += `\nAGENT_ID=${result.agentId}\n`;
  }
  writeFileSync(envPath, envContent);
  console.log(`  Updated .env with AGENT_ID=${result.agentId}`);

  // Update registration.json with the agent ID and registry reference
  const regPath = join(ROOT, 'registration.json');
  const registration = JSON.parse(readFileSync(regPath, 'utf-8'));
  const registryRef = `eip155:${addresses.chainId}:${addresses.identityRegistry}`;
  registration.registrations = [
    { agentRegistry: registryRef, agentId: String(result.agentId) },
  ];
  writeFileSync(regPath, JSON.stringify(registration, null, 2) + '\n');
  console.log(`  Updated registration.json with agent ID and registry reference`);

  console.log('\nNext steps:');
  console.log('  1. Re-pin updated registration.json: npm run pin-registration');
  console.log('  2. Update on-chain URI with new CID: npm run update-uri');
  console.log(`  3. Verify at: https://sepolia.etherscan.io/tx/${result.txHash}`);
}

main().catch((err) => {
  console.error('Registration failed:', err.message);
  process.exit(1);
});
