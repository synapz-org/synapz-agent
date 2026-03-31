# Reddit r/bittensor Post

**Subreddit:** r/bittensor
**Slop score:** 60 (light band, passes)

---

**Title:** Basilica just made it possible for AI to run its own training experiments autonomously

**Body:**

Evan (epappas) from the Covenant team just published a writeup on something pretty wild. He extended Karpathy's autoresearch concept to RL fine-tuning, running entirely on Basilica's GPU infrastructure.

The simple version. You give an AI a training problem. It designs its own experiments, spins up a fresh GPU on Basilica, runs the experiment, checks the results, decides whether to keep or throw away, and repeats. 15 times. No human involvement.

Why this matters for Bittensor.

This is real utility running on Bittensor-native infrastructure. Basilica isn't just renting GPUs. The compute is programmable enough that AI agents can use it on their own.

The "autonomous ML research" space is heating up fast. Karpathy posted his autoresearch framework, Prime Intellect jumped on it, and now Basilica has a working implementation for RL fine-tuning with something no one else offers. Completely isolated GPU environments per experiment so nothing gets contaminated between runs.

If you're thinking about where Bittensor compute goes long-term, this is a preview. AI agents that provision their own hardware, run experiments, and improve models without waiting on a human to click buttons.

Results. Started at 26% accuracy on a math benchmark, ended at 36% after 15 autonomous iterations. 100% infrastructure success rate. Every GPU container spun up, ran the job, and cleaned up without failure.

Evan's thread: https://x.com/Hevalon/status/2038977575372951930
Full article: https://templarresearch.substack.com/p/autonomous-rl-fine-tuning-on-ephemeral
Code: https://github.com/one-covenant/autoresearch-rl
