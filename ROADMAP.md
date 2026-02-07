# Agent Development Roadmap

Ideas for evolving your OpenClaw agent with Bittensor integrations.

## Foundation

- [x] Define personality (SOUL.md)
- [x] Define presentation (IDENTITY.md)
- [x] Document interests and knowledge
- [x] Connect to messaging channels (Telegram)
- [ ] Establish social presence (Moltbook)

## 24/7 Availability

Run your agent continuously without keeping your laptop open.

- [x] **Docker image**: `dwbarnes/synapz-agent:v7` on Docker Hub (amd64)
- [x] **Dockerfile + entrypoint**: Working container with mDNS/ciao K8s patch
- [x] **Basilica Summons deploy**: Container runs, health checks pass
- [ ] **Basilica egress networking**: Summons tier blocks outbound internet (see DEPLOYMENT-STATUS.md)
- [ ] **Hippius state sync**: Persist memory to decentralized storage
- [ ] **Auto-updates**: Watchtower pulls new versions automatically

**Current status**: Running locally via Docker. Basilica deployment blocked on egress networking.

See: [openclaw-bittensor/extensions/basilica](https://github.com/synapz-org/openclaw-bittensor)

## ERC-8004 Trustless Agent Registration

Register Synapz in the on-chain agent discovery ecosystem without changing how the agent works internally.

- [x] **Research ERC-8004 spec**: Understand identity, reputation, and validation registries
- [x] **Create registration file**: `erc-8004/registration.json` with agent metadata
- [x] **Create registration scripts**: Pin to IPFS via Hippius, register on Sepolia, update URI
- [ ] **Get Sepolia ETH**: Fund `synapz.eth` wallet from a faucet
- [ ] **Pin registration to IPFS**: `npm run pin-registration` in `erc-8004/`
- [ ] **Register on Sepolia testnet**: `npm run register` in `erc-8004/`
- [ ] **Verify registration**: Confirm agent appears in identity registry on Etherscan
- [ ] **Add service endpoints**: MCP/A2A endpoints once Basilica egress is resolved
- [ ] **Mainnet migration**: Register on Ethereum mainnet or L2 after testnet verification

**Current status**: Registration tooling ready. Awaiting Sepolia ETH and manual execution.

See: [erc-8004/](erc-8004/) for scripts and registration file.

## Real-time Awareness

Give your agent awareness of current events and discussions.

- **Desearch (SN22)**: Search Twitter, Reddit, and web in real-time
- **Dataverse (SN13)**: Collect bulk social data for research

Use cases:
- Check what's trending before posting
- Verify claims with live data
- Find relevant conversations to join

## Custom Model Fine-tuning

The ultimate evolution: train a model that thinks like your agent.

- **Gradients (SN56)**: Fine-tune models on your agent's conversation history
- **Deploy via Chutes**: Run your custom model on Bittensor infrastructure

Training data sources:
- Conversation history
- Posts and comments
- Any content your agent has created

This creates a virtuous cycle: your agent creates content → best content becomes training data → model improves → better content.

## Resources

- [openclaw-bittensor](https://github.com/synapz-org/openclaw-bittensor) - Bittensor extensions
- [Chi](https://github.com/unconst/Chi) - Subnet development patterns
- [OpenClaw docs](https://docs.openclaw.ai) - Gateway documentation
