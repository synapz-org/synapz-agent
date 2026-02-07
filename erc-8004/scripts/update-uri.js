/**
 * Update the on-chain agent URI for Synapz.
 *
 * Use this after re-pinning an updated registration.json to IPFS.
 *
 * Prerequisites:
 *   1. AGENT_ID set in .env (from registration)
 *   2. AGENT_URI set in .env (new IPFS URI)
 *
 * Usage:
 *   node scripts/update-uri.js
 */

import 'dotenv/config';
import { ERC8004Client, EthersAdapter } from 'erc-8004-js';
import { ethers } from 'ethers';

const CONTRACTS = {
  sepolia: {
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    validationRegistry: '0x8004Cb1BF31DAf7788923b405b754f57acEB4272',
    chainId: 11155111,
  },
  mainnet: {
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
    validationRegistry: null,
    chainId: 1,
  },
};

async function main() {
  const network = process.env.NETWORK || 'sepolia';
  const rpcUrl = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const agentId = process.env.AGENT_ID;
  const agentUri = process.env.AGENT_URI;

  if (!rpcUrl || !privateKey || !agentId || !agentUri) {
    console.error('Error: RPC_URL, PRIVATE_KEY, AGENT_ID, and AGENT_URI must be set in .env');
    process.exit(1);
  }

  const addresses = CONTRACTS[network];
  if (!addresses) {
    console.error(`Error: Unknown network "${network}".`);
    process.exit(1);
  }

  console.log(`Updating agent URI on ${network}...`);
  console.log(`  Agent ID: ${agentId}`);
  console.log(`  New URI: ${agentUri}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const adapter = new EthersAdapter(provider, signer);
  const client = new ERC8004Client({ adapter, addresses });

  const result = await client.identity.setAgentURI(Number(agentId), agentUri);

  console.log('\nURI updated successfully!');
  console.log(`  Tx Hash: ${result.txHash}`);

  // Verify
  const currentUri = await client.identity.getTokenURI(Number(agentId));
  console.log(`  Verified on-chain URI: ${currentUri}`);
}

main().catch((err) => {
  console.error('URI update failed:', err.message);
  process.exit(1);
});
