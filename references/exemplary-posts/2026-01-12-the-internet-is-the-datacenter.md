---
title: "The Internet is the Datacenter: How Templar is Building the Final Form of Decentralized AI Training"
excerpt: "For eighty years, the most powerful technologies have required concentration: co-located machines in fortress datacenters, tightly controlled by those who could afford the infrastructure. This week's research breakthrough from Templar marks something different, a technical path toward intelligence as genuinely distributed public infrastructure, where your home GPU can train frontier models alongside Google's datacenters."
coverImage: "/assets/blog/heterogeneous-sparseloco/cover.png"
category: "AI"
tags: ["Decentralized AI", "Bittensor", "Templar", "Covenant AI", "Machine Learning", "AI Infrastructure", "Distributed Systems"]
date: "2026-01-12T12:00:00.000Z"
author:
  name: Derek Barnes
  picture: "/assets/blog/authors/profile.png"
ogImage:
  url: "/assets/blog/heterogeneous-sparseloco/cover.png"
---

There's a constraint that has defined computing for eighty years, from ENIAC to ChatGPT: the most powerful machines require proximity. The fastest supercomputers cluster processors within feet of each other. The largest data centers route petabytes through InfiniBand cables, measured in meters. Training GPT-4 required thousands of GPUs welded together in the same building, cooled by the same systems, powered by the same grid.

Co-location has been an absolute physical requirement, not merely an engineering preference. When machines need to exchange billions of parameters every few minutes, internet bandwidth becomes the limiting factor. The solution has always been the same: bring the machines together. Build bigger datacenters. Co-locate everything.

Which means that whoever controls the data center controls the intelligence.

This week, researchers at [Templar](https://tplr.ai) published [Heterogeneous Low-Bandwidth Pre-Training of LLMs](https://arxiv.org/abs/2601.02360), work that addresses this fundamental constraint. Not through incremental optimization, but by reconceiving what distributed training can be. The paper demonstrates how to train frontier-scale language models by connecting datacenter infrastructure with consumer GPUs, university clusters, and scattered compute worldwide into unified training runs that are efficient enough to compete with centralized alternatives.

The technical achievement matters. But the philosophical implications matter more. For the first time, there's a credible technical path toward intelligence developed as genuinely distributed public infrastructure rather than a corporate-controlled product. Not "open source" in the sense of releasing model weights while maintaining centralized development. Decentralized in the sense that no single entity controls who can contribute, what gets built, or who benefits.

Sam Dare, who leads Templar and [Covenant AI](https://www.covenant.ai), frames the mission with characteristic directness: "We're not building state-of-the-art decentralized training. We're creating a whole new paradigm. We're creating a new vertical that doesn't yet exist. We will commoditize intelligence. We will commoditize decentralized learning."

To understand why this matters, it requires understanding not just what Heterogeneous SparseLoCo does technically, but what it represents philosophically, and why the distinction between "decentralized" and "distributed" determines whether AI becomes public infrastructure or remains a corporate monopoly.

## The Co-Location Requirement and the Concentration of Power

When Google trains Gemini or OpenAI trains GPT-5, they're not just using expensive GPUs. They're using *co-located* expensive GPUs. The machines sit in the same datacenter, connected by proprietary high-bandwidth networks with single-digit microsecond latency. This enables "data parallel" training where thousands of GPUs each hold a complete copy of the model, process different batches of data, then synchronize their learning every few seconds.

The synchronization is the killer. For a 70-billion-parameter model, each sync requires roughly 280 gigabytes of traffic between nodes. Over datacenter networks at 200-400 Gbps, this takes seconds. Over a typical internet connection at 1 Gbps, it would take minutes. Training becomes waiting: compute sitting idle while gradients crawl across continents.

This physical constraint has profound implications for who can build AI. As Sam put it in yesterday's community call: "The cost of training a large language model—you look at the GPU cost, but you also look at the cost of the datacenter that needs to be amortized over however many years before that technology becomes outdated. It's crazy expensive. But it's not even the GPU or datacenter costs that are the barriers. It's that if you need 1000 GPUs, they have to be in the same building. They need to be next to each other, very close, like literally almost welded together."

The hyperscalers (Google, Anthropic, Microsoft, Meta) have recognized this limitation. They're hitting physical constraints on data center growth: energy availability, cooling capacity, and real estate. Even they can't keep scaling single facilities indefinitely. Which is why they've started exploring "inter-datacenter training," coordinating training runs across multiple datacenters in different geographic locations.

Sam laughs about this: "Even for the Google fake Evil Corp use case, when they eventually decide to do inter-datacenter training, our code is what they'll reference. They'll ask us for help fixing it."

But there's a crucial difference between what Google is attempting and what Templar has built. Google wants to coordinate its data centers for its training runs under its control. Templar is building infrastructure for anyone to contribute compute to collective training runs that no single entity controls.

One is distributed training. The other is decentralized training. The distinction is everything.

## Distributed vs. Decentralized: The Critical Distinction

"Distributed" and "decentralized" sound similar but represent fundamentally different architectures with fundamentally different implications for power.

Distributed training means splitting computation across multiple machines. Google does this constantly: its data centers coordinate training across thousands of GPUs. This is distributed, but it's not decentralized. Google owns the infrastructure, controls who can participate, decides what gets trained, and captures the value.

Decentralized training means no central authority controls participation, contribution, or governance. Anyone with compute can join. Economic value flows to contributors rather than concentrating in corporate hands. The intelligence produced becomes public infrastructure rather than a proprietary asset.

Bitcoin demonstrates this distinction perfectly. Visa's payment network is distributed. Transactions are processed across multiple servers worldwide. But it's not decentralized. Visa controls the infrastructure, approves participants, and extracts rent. Bitcoin is genuinely decentralized. No one controls who can run a node, mine blocks, or submit transactions.

The difference matters because centralized control tends to concentrate power, extract rents, and align with incumbent interests. As I wrote in [AI and the War Machine](/posts/2025-10-21-ai-and-the-war-machine), we're watching in real time as every major AI lab (OpenAI, Anthropic, Google, Meta) has subordinated its stated humanitarian missions to military-industrial partnerships and nationalist competition. When a handful of corporations control AI development, they optimize for corporate and state power.

Decentralization doesn't magically solve every problem. But it changes the structural incentives. When intelligence development is permissionless and value accrues to contributors, the system serves contributors rather than extractors.

Bittensor, the protocol underlying Templar, articulates this clearly: "To ensure that the supremely important commodity of intelligence is owned by everyone." Not owned by Google. Not owned by the Pentagon. Everyone.

Sam frames it as an existential choice: "We are approaching a forking point for mankind; down one road is the centralization of power and resources, in large regulated industries... Down the other road is the potential for sharing these resources through open protocols, via technological foundations, which enable global participation and ownership."

Templar's research represents the technical foundation for that second road.

## The Journey: From Permissionless to Efficient to Inclusive

Templar's trajectory maps the evolution from proving decentralized training is *possible* to making it *competitive* to enabling it at *frontier scale*.

### Stage One: Permissionless Training (The Permission Layer)

Templar's first achievement was demonstrating that truly permissionless training could work. Anyone could contribute compute without approval, credentials, or central coordination. The initial implementation was, in Sam's words, "so unbelievably slow" and "so broken." But it worked. For the first time, AI training operated as public infrastructure where contribution determined influence.

This mattered philosophically more than practically. As Sam notes, "Permissionless training was important to us. But not to the AI world, and that was okay." The AI research community cared about performance. Templar cared about creating credibly neutral infrastructure. Both are necessary.

### Stage Two: Efficient Training (The Communication Layer)

Proving permissionless training works doesn't matter if it's 100x slower than centralized alternatives. The bottleneck was communication: how to synchronize learning across nodes connected by internet bandwidth rather than datacenter fabric.

Templar developed [SparseLoCo](https://arxiv.org/pdf/2508.15706), combining two complementary approaches: aggressive gradient compression (from subspace methods like Nucleus) and local optimization (allowing nodes to train longer before synchronizing). The combination was non-obvious and technically difficult. Nucleus and LoCo "did not map properly together," requiring significant research innovation to integrate successfully.

SparseLoCo compresses gradients to 0.78% of their original size while allowing nodes to take many local training steps before synchronizing. Training a 72-billion-parameter model went from requiring 280GB per sync to 2.2GB per sync, while synchronizing 500x less frequently. Communication overhead dropped from dominating training time to barely registering.

This powered [Covenant72B](https://huggingface.co/1Covenant/Covenant72B), the largest model successfully trained in a fully permissionless, decentralized manner. Performance approached centralized baselines. But a constraint remained: participants needed enough VRAM to hold the entire model. Only those with high-end GPU clusters (8xH200 setups, multi-GPU servers) could join.

### Stage Three: Inclusive Training (The Participation Layer)

Heterogeneous SparseLoCo solves the final major barrier: enabling consumer-grade GPUs to participate in frontier model training alongside datacenter infrastructure.

The problem: as models scale toward 200B, 500B, 1T+ parameters, fewer participants can fit the full model in VRAM. The solution used in centralized training is "model parallelism," splitting the model into chunks, with each machine hosting one piece. During training, each machine processes its chunk and then passes "activations" (intermediate results) to the next stage.

Model parallelism introduces a new communication bottleneck: activation transmission between pipeline stages. For large models, these activations are massive and need to flow constantly, far more frequently than gradient synchronization. Traditional approaches required high-bandwidth interconnects between machines.

Heterogeneous SparseLoCo enables model parallelism over internet bandwidth by compressing activations across pipeline stages (building on the work by Pluralis Research). The compression is aggressive (87.5% to 99.9% reduction) with minimal performance degradation.

The key innovation: rather than compressing everything uniformly, Heterogeneous SparseLoCo supports heterogeneous training, with high-bandwidth participants forming full, uncompressed replicas and resource-limited participants forming compressed model-parallel replicas. The uncompressed replicas anchor gradient aggregation, reducing bias from compression artifacts.

What this enables:

* Consumer GPUs (RTX cards, small clusters) can join frontier model training.
* University research labs with scattered hardware can contribute.
* Multiple data centers can coordinate in a single training run.
* Training scales by aggregating the "long tail" of available compute globally.

Amir Sarfi, one of the researchers on the team, explains: "What we are trying to allow here is consumer-grade GPUs to join the training. The idea is to fragment the model into pieces that can be easily loaded onto any device. Load it in your consumer-grade GPUs and then communicate between these servers… we now have two different levels of compression. One is within each replica. Those consumer-grade GPUs communicate in a compressed fashion. And then when they have trained for a few local steps, then they communicate with each other, with other replicas through SparseLoCo."

Joel Lidin, one of Templar's engineers, clarifies the deeper significance: "The main point is actually about lowering the hardware barrier, not just scaling to bigger models. Today, even fitting a model already forces you into very specific and expensive setups, like needing 8×B200s just to hold a 72B model with microBS=1, or 8×H100s for something around 10B. What this changes is the requirement. If you have 8×B200s, great, you can train that way. If not, you can still participate with 2×B200, 4×H100, or even a couple of 4090s. You are grouped with other weaker peers, and together you host the full model; each trains only the part that fits on their hardware. This obviously helps when scaling to something like 150B, but it also matters at smaller scales, since you're no longer blocked on finding a single rare, expensive server configuration."

## What "Final Form" Actually Means

Sam calls Heterogeneous SparseLoCo "the apex form of what decentralized training looks like." That's not marketing hyperbole. It's an architectural claim.

The three core barriers to decentralized training were:

1. Permission: Could training work without central coordination? (Solved: permissionless incentive mechanisms)
2. Efficiency: Could it compete with centralized performance? (Solved: SparseLoCo gradient compression + local steps)
3. Inclusivity: Could diverse hardware participate in frontier training? (Solved: Heterogeneous SparseLoCo activation compression + heterogeneous replicas)

"Final form" means the technical architecture no longer fundamentally constrains who can participate or what scale can be achieved. As Sam put it: "We don't give a shit about your topology or even if it's a toaster. If it's a Raspberry Pi, we will train on you. That is how we think we get to the true form of decentralized training."

This is not to say there are no remaining challenges. Training coordination at internet scale involves countless subtle problems: network unreliability, adversarial participants, incentive alignment, quality assurance, and data pipeline optimization. Templar's [Gauntlet mechanism](https://arxiv.org/abs/2505.21684) addresses some of these through economic incentives; others remain active areas of research.

But the fundamental question has shifted from "Can this work at all?" to "How quickly can this scale to match centralized capabilities?"

## Commoditizing Intelligence: The Grand Vision

Sam's ambition extends beyond training better models through decentralization. The vision is creating entirely new infrastructure: "the Nvidia of decentralized training."

"The final product doesn't even look like a model now. It just looks like infrastructure that we can sell out as services to create this new industry."

This requires believing that decentralized training will not only become viable but also necessary. Even the hyperscalers will need distributed coordination as models and compute requirements grow beyond single-datacenter constraints.

Some evidence supports this belief. Epoch AI projects that compute requirements for state-of-the-art training will grow 100x by 2027. No data center can scale fast enough to meet that curve alone. Physical constraints on energy, cooling, and networking become binding. Inter-datacenter and internet-scale training shifts from experimental to necessary.

When that happens, Templar won't be the scrappy underdog with technically interesting but commercially unproven research. They'll be the team that solved internet-scale coordination first, with production-tested code and three years of iteration.

As Sam told a New York Times reporter: "I can see where this technology is going. I can see the world tomorrow. Where even the hyperscalers have no choice but to do decentralized training."

But there's a crucial difference in how that world unfolds. If Google and OpenAI develop their own inter-datacenter training systems, intelligence will remain centralized within corporate infrastructure. If Templar's permissionless approach becomes the standard, intelligence becomes public infrastructure accessible to anyone.

## The Attention Problem and the Validation Trap

The most striking theme in Sam's commentary isn't technical. It's the struggle for recognition. "Bittensor suffers a problem of attention. Because we reject capital that will corrupt us, they discount all our achievements, all our innovation."

Templar went from 1.8B to 72B parameters in 9 months, roughly a 10x increase. They developed SparseLoCo, "by far the most efficient decentralized training algorithm in the world, hands down." They got two papers accepted at NeurIPS, one of the top machine learning conferences. They're training the largest truly permissionless decentralized model in existence.

The frustration is palpable: "What do we do? We need to keep pushing. The world doesn't owe us attention. A lot of times, people will ignore us, say we're fraudsters, scammers. But there would be a chance that if we keep pushing, we will do the undeniable."

This captures something true about infrastructure work. The best infrastructure becomes invisible precisely because it works reliably. But it also reflects a deeper problem: narratives shape what seems possible, and narrative capital (media attention, influencer validation, institutional prestige) doesn't flow naturally to decentralized alternatives challenging incumbent power.

As I wrote about [Aztec Network's launch](/posts/2025-12-03-the-second-crypto-war-a-private-ethereum), privacy infrastructure faces similar challenges. Building systems that resist centralized control means rejecting the capital and partnerships that would corrupt the mission. But that capital also buys attention, legitimacy, and adoption.

The tension is structural. Projects that compromise get funding, media coverage, and partnerships. Projects that refuse compromise get ignored until they become undeniable.

Heterogeneous SparseLoCo represents that moment of becoming undeniable. The research is published, peer-reviewed, and technically sound. The path to frontier-scale decentralized training is now mappable. The question shifts from "Can this work?" to "Will it scale faster than centralized alternatives?"

## The Broader Stakes: Why This Matters Beyond AI

The fight over AI architecture is a fight over the infrastructure of intelligence itself. Which means it's a fight over power, governance, and the distribution of value in an economy increasingly mediated by algorithmic systems.

Centralized AI development has produced exactly what concentrated power always produces: alignment with incumbent interests, capture by military-industrial partnerships, reproduction of historical inequalities, and betrayal of humanitarian rhetoric. Every major AI lab now sells to defense contractors. Every one frames development as nationalist competition. Every one has subordinated stated universal missions to commercial growth and political alignment with power.

The decentralized alternative isn't utopian. It doesn't solve every problem through technical architecture. But it fundamentally changes the structural incentives. When intelligence is developed permissionlessly, with value accruing to contributors, the system serves those who contribute rather than extract.

History offers clear lessons. Technologies controlled by centralized military-industrial interests tend to delay beneficial applications (GPS's Selective Availability degraded civilian accuracy for 17 years), create lasting global inequalities (nuclear technology's permanent "haves" and "have-nots"), and ultimately fail at stated security objectives while succeeding at concentrating power and profit.

The technologies that generated the most human benefit did so after restrictions were lifted and control decentralized. GPS after Selective Availability ended, encryption after export controls lifted, and the internet after transition beyond military control.

Templar's research represents a technical foundation for intelligence development that parallels these beneficial transitions rather than the restrictive patterns. Not intelligence as a weapon, but intelligence as public infrastructure. Not development as nationalist competition, but contribution as a global public good.

## The Acceleration Phase

Sam frames Templar's trajectory in terms of acceleration: "We're just getting started because look at Templar's trajectory. In nine months, we had gone from 1.8B to 72B… We're going into the acceleration phase of decentralized training."

The metaphor matters. Acceleration implies exponential curves, compound effects, and momentum feeding on itself. It's the opposite of linear progress, grinding toward distant goals.

Epoch AI uses this metaphor when projecting compute growth: vertical curves requiring 100x more resources within years. Sam inverts it: "When Epoch AI says centralized training is not going to grow as much, they do not see that we've just done our first stage. Our network presents a step function in how much compute we can utilize."

Heterogeneous SparseLoCo represents that step function. Not incremental improvements in communication efficiency, but fundamentally expanded participation. From datacenter-only to datacenter-plus-consumer-compute. Each expansion increases the addressable compute base by orders of magnitude.

This is why Sam's ambition extends beyond models to infrastructure: "We're creating a whole new vertical that has never existed. We will commoditize intelligence. We will commoditize decentralized learning."

Commoditization means infrastructure becoming so reliable and accessible that it fades into the background: electricity, bandwidth, computation. Intelligence as a commodity means that frontier model training becomes available to anyone who can contribute, rather than the exclusive privilege of datacenter owners.

Whether this vision materializes depends on execution and adoption, as well as on whether decentralized approaches scale faster than centralized alternatives as we race toward trillion-parameter models. But the technical path now exists.

## The Underdogs and the Undeniable

Perhaps the most compelling aspect of Templar's story is the team composition. As Sam notes: "I'm a normal person. I'm not even an ML (machine learning) person. But I think that is the beauty and magic of Bittensor, is that through Bittensor, through incentives, through everything that we are trying to build, normal people can do extraordinary things."

This is precisely the point. In centralized AI labs, publication requires institutional blessing, legal approval, and alignment with commercial strategy. Research serves corporate priorities. Researchers optimize for promotion tracks and partnership opportunities.

In decentralized systems built on permissionless contribution, researchers optimize for solving problems. The incentive is to build something undeniable and let the work speak for itself.

Sam's philosophy is brutally simple: "Knock it out of the park. Be so good you become undeniable. The only merit that matters is your accomplishment."

This isn't harsh. It's liberating. Your credentials don't determine influence. Your institutional affiliation doesn't determine access. Your geographic location doesn't determine participation. Contribution determines everything.

The mission resonates beyond technical circles. [Cats](https://x.com/Cats_CR), a community member, captured the grassroots enthusiasm: "I'm not even shilling Templar here..but imo nothing bigger than Templar is currently being built on Bittensor. Templar actually succeeding will hit major news. I'm sorry to all other subnets, but just think how huge an impact on the whole world Templar can make. They are already training the biggest models over the internet and anyone from anywhere can participate. It's fucking beautiful. Trust me man, you don't want all the best models being owned by OpenAI and other big corps. Templar is good for humanity."

That's not corporate messaging or institutional validation. That's what happens when people recognize infrastructure that changes who can participate. Not "open source" as a marketing term while development remains centralized, but genuinely permissionless contribution where anyone's compute matters.

Which means the playing field, while not perfectly level (compute access remains unequal, as does training and infrastructure), is dramatically flatter than the centralized alternative, where three companies employ most frontier AI researchers and five companies control the training infrastructure.

## What Comes Next

Heterogeneous SparseLoCo is published research, not yet production deployment. Templar currently runs SparseLoCo in production for [Covenant72B](https://huggingface.co/1Covenant/Covenant72B) training. Integrating heterogeneous capabilities requires additional engineering, testing, and likely several iterations to discover edge cases that didn't appear in controlled experiments.

[Basilica](https://www.basilica.ai), Covenant AI's decentralized compute platform, will integrate these insights for practical deployment, connecting high-end GPU clusters with consumer hardware in unified training runs. The technical path is clear; execution remains.

But the broader implications extend beyond any single team or project. Heterogeneous SparseLoCo demonstrates that the final major technical barrier to internet-scale decentralized training has a solution. The question is no longer whether decentralized approaches can theoretically compete with centralized alternatives, but how quickly they'll scale to do so practically.

Every contribution to decentralized infrastructure builds an alternative to concentrated AI power. Every model trained permissionlessly, every compute hour contributed, every researcher publishing openly rather than optimizing for corporate IP.

Every dollar flowing to military AI contracts, every model deployed in classified intelligence systems, every nationalist frame treating AI as a weapon rather than infrastructure: these cement the path to centralized control.

The forking point is live. The research shows which road is technically viable. Now comes the question of which road we collectively choose.

Sam ended yesterday's call with characteristic directness: "Thank you for coming to my sermon. We will keep delivering. Thank you for your faithfulness."

The religious language is half-joking but captures something true. Building decentralized infrastructure requires faith. Not blind faith, but active faith that showing up consistently, solving problems rigorously, and refusing to compromise on core principles will eventually compound into systems that shift what's possible.

Templar has earned that faith through delivery. Nine months from 1.8B to 72B parameters. SparseLoCo solving gradient synchronization. Heterogeneous SparseLoCo enabling consumer participation at frontier scale. Each achievement becomes a foundation for the next.

The grand vision (intelligence as public infrastructure, commoditized and accessible to everyone) remains distant. But the technical path from here to there now exists. Not hypothetical, not theoretical. Published, peer-reviewed, demonstrable.

The internet is becoming the data center. Intelligence is becoming public infrastructure. The question is whether we'll build it fast enough, and whether enough people will choose to contribute rather than spectate as centralized alternatives consolidate control.

---

**Research Paper**: [Heterogeneous Low-Bandwidth Pre-Training of LLMs](https://arxiv.org/abs/2601.02360)

**Related Reading**:

* [CCLoco: Overcoming the Communication Barrier in Decentralized AI Training](/posts/2025-07-12-ccloco-templar-breaking-communication-barrier-decentralized-ai-training): Templar's earlier breakthrough in gradient compression
* [AI and the War Machine](/posts/2025-10-21-ai-and-the-war-machine): Why centralized AI labs abandoned humanitarian missions for military partnerships

**Disclosure**: I work with Covenant AI and am directly involved in the organization's communications. For full transparency about my involvement and investments, see my [projects page](/projects). All opinions expressed are entirely my own.

*For more on Templar's decentralized training work, visit [tplr.ai](https://tplr.ai). For updates on Covenant AI's ecosystem including Templar, Basilica, and Grail, visit [covenant.ai](https://www.covenant.ai).*