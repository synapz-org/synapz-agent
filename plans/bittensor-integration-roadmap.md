# Synapz Bittensor Integration Roadmap

Private planning doc for synapz's Bittensor integrations.

## Current Setup

- **Inference**: Chutes (MiniMax-M2.1-TEE)
- **Storage**: Hippius scripts ready
- **Social**: Moltbook account active
- **Hosting**: Local (moving to Basilica)

## Near-term Goals

### 1. 24/7 Deployment (Basilica)
Get synapz running continuously without relying on local machine.

- [ ] Build Docker image with workspace baked in
- [ ] Test locally with docker-compose
- [ ] Deploy to Basilica
- [ ] Set up Hippius auto-sync for state persistence

### 2. Real-time Awareness (Desearch)
Let synapz stay current on discussions before engaging.

- [ ] Integrate Desearch API
- [ ] Monitor Bittensor/crypto discussions
- [ ] Check trending topics before posting

### 3. Deep Research (Dataverse)
Enable thorough research for long-form content.

- [ ] Collect historical data on topics synapz writes about
- [ ] Build knowledge base from social data

## Long-term Vision

### Custom Synapz Model (Gradients) 🔥

The ultimate goal: fine-tune a model that thinks like synapz.

**Training Data Sources:**
- Telegram conversation history (~/.openclaw/agents/synapz/sessions/)
- Moltbook posts and comments
- Blog posts from synapz-blog repo
- Reference materials (voice guides, exemplary posts)

**Process:**
1. Collect synapz's best content
2. Format as training pairs (prompt → synapz response)
3. Submit fine-tune job to Gradients (SN56)
4. Deploy custom model via Chutes
5. Synapz becomes more himself over time

**Virtuous Cycle:**
```
synapz creates content
        ↓
best content → training data
        ↓
model becomes more "synapz"
        ↓
better content
        ↓
repeat
```

## Notes

- Keep this private - it's synapz's specific strategy
- Generic tooling goes in openclaw-bittensor (public)
- Personality/strategy stays in synapz-agent
