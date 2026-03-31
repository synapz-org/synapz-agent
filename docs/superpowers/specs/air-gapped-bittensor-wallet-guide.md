# Air-Gapped Bittensor Wallet: A Practical Guide

**Why bother?** The recent axios supply chain attack is a reminder: if malware hits your dev machine, any coldkey mnemonic on that machine is compromised. An air-gapped device has no network connection — ever — so even if you generate keys on it, there's no channel for malware to phone home.

**Coldkey vs Hotkey refresher:**
- **Coldkey** = your treasury key. Controls staking, delegation, transfers. This is what you protect with your life. Keep it cold.
- **Hotkey** = your operational key. Runs on your miner/validator, registers on subnets, earns rewards. This one *needs* to be on a connected machine. If compromised, you lose pending rewards but not your staked TAO — regen a new one from your coldkey.

**Bottom line:** Your coldkey mnemonic should never exist on a network-connected device.

---

## Setting Up the Air-Gapped Device

**What you need:** An old iPhone or Android you're not using. Doesn't need to be fancy — just needs to turn on.

**Step 1 — Factory reset while still online**
- Update to the latest OS version first (gets you the latest security patches)
- Then factory reset: Settings > General > Transfer or Reset (iPhone) or Settings > System > Reset (Android)

**Step 2 — Permanent airplane mode**
- During initial setup, skip all wifi/cellular/sign-in prompts
- Turn on airplane mode immediately
- Remove the SIM card physically (or use a phone with no SIM)
- Disable Bluetooth and wifi at the hardware level if possible
- **This device never touches a network again.** If it accidentally connects, start over.

**Step 3 — Install what you need BEFORE going air-gapped**
- Option A (recommended): Before the factory reset, install a password manager app (e.g., KeePass/Strongbox on iOS, KeePassDX on Android) that works fully offline. Then reset, and reinstall via USB sideload or just use the Notes app.
- Option B (simpler): Just use the built-in Notes app or a paper backup. The phone is just a secure storage device.

---

## Generating Your Bittensor Wallet

**Option A — Generate on a separate air-gapped Linux machine (ideal)**
If you have a spare laptop, boot Tails/Ubuntu from USB (never connect to internet), install btcli, run:
```
btcli wallet create --wallet.name my-coldwallet
```
Write down the mnemonic. Type it into your air-gapped phone's notes/KeePass. Wipe the laptop.

**Option B — Generate on your connected machine, immediately move cold**
```
btcli wallet create --wallet.name my-coldwallet
```
- Immediately copy the mnemonic to your air-gapped phone (type it manually — no airdrop, no copy-paste across devices)
- Delete the coldkey from your connected machine: `rm -rf ~/.bittensor/wallets/my-coldwallet/coldkey`
- Keep the coldkeypub (you need it for reference)
- Keep the hotkey on your connected machine — that's the one your miner/validator uses

**Option C — BIP39 mnemonic generator app**
Install a BIP39 mnemonic generator on the phone before air-gapping. Generate the 12/24 word seed directly on the air-gapped device. Then use `btcli wallet regen_coldkey --mnemonic <words>` on your connected machine only when you need to sign, then immediately delete.

---

## Signing Transactions (The Hard Part)

Bittensor doesn't have great native support for offline signing yet (unlike Bitcoin/Ethereum hardware wallets). Current practical workflow:

1. **When you need to do a coldkey operation** (stake, transfer, etc.):
   - Pull up the mnemonic from your air-gapped phone
   - On your connected machine: `btcli wallet regen_coldkey --mnemonic "word1 word2 ..."`
   - Perform the transaction
   - Immediately delete the coldkey file again: `rm ~/.bittensor/wallets/*/coldkey`
   - Clear your shell history: `history -c` or delete the relevant lines

2. **QR code method** (reduces manual typing errors):
   - On the air-gapped phone, encode the mnemonic as a QR code using an offline QR generator app (install before air-gapping)
   - Scan it with your connected machine's camera when needed
   - Same drill — regen, sign, delete

This isn't as clean as a Ledger hardware wallet flow, but until Bittensor has native hardware wallet support, it's the best practical option.

---

## Best Practices Checklist
- [ ] Mnemonic exists ONLY on the air-gapped device (and ideally a paper backup in a safe)
- [ ] Air-gapped phone: airplane mode on, SIM removed, wifi off, Bluetooth off — always
- [ ] Optional: keep the phone in a Faraday bag when not in use (~$10 on Amazon)
- [ ] Never plug the air-gapped phone into a computer via USB
- [ ] If you must regen the coldkey on a connected machine, do it fast and delete immediately
- [ ] Use different mnemonics for different wallets (don't reuse across subnets/purposes)
- [ ] Test your backup: regen from mnemonic on a throwaway machine to verify you copied it correctly *before* you send real TAO to it
- [ ] Hotkeys can live on your miner — they're meant to be hot. Don't stress about those.

**TL;DR:** Old phone + factory reset + permanent airplane mode = your coldkey never touches the internet. Not perfect, but a massive improvement over keeping mnemonics on your dev machine where one bad npm package can grab them.
