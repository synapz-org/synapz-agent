# ERC-8004 Trustless Agent Registration

Register Synapz in the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) on-chain agent discovery ecosystem.

ERC-8004 is a discovery and trust layer - it doesn't change how Synapz works internally.
The agent gets an on-chain identity (NFT), a JSON registration file describing capabilities,
and can receive reputation feedback from clients.

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY and SEPOLIA_RPC_URL

# Pin registration file to IPFS via Hippius
npm run pin-registration

# Register on Sepolia testnet
npm run register

# After updating registration.json, re-pin and update on-chain URI
npm run pin-registration
npm run update-uri
```

## Files

| File | Purpose |
|------|---------|
| `registration.json` | Agent registration metadata (name, description, services, trust) |
| `scripts/register.js` | Register Synapz on-chain via IdentityRegistry |
| `scripts/update-uri.js` | Update the on-chain URI after re-pinning |
| `scripts/pin-registration.js` | Pin registration.json to IPFS via Hippius |
| `.env.example` | Environment variable template |

## Contract Addresses

**Sepolia (testnet):**
- Identity: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- Reputation: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- Validation: `0x8004Cb1BF31DAf7788923b405b754f57acEB4272`

**Mainnet:**
- Identity: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

## Pragmatic Interop

ERC-8004 is an Ethereum-based discovery layer. Synapz remains 100% Bittensor-native
for operational infrastructure (Basilica compute, Chutes inference, Hippius storage).
This is a phone book listing, not an infrastructure migration.
