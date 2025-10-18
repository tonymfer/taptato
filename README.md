# TapTato 🥔
<img width="950" height="1065" alt="Screenshot 2025-10-18 at 16 20 12" src="https://github.com/user-attachments/assets/db53fefb-24a0-4a68-af6d-d3608225a3cb" />

**Zero-Popup Potato Farming on Base**

> A farming game demonstrating [Base Account Sub Accounts](https://docs.base.org/base-account/improve-ux/sub-accounts) — plant potatoes, harvest for USDC rewards, no wallet popups after first approval.

**🎮 [Play Demo](https://tabptato.vercel.app)** | **📺 [Watch Demo Video](https://x.com/tonymfer/status/1979189014386348271)** | **🏆 Base Builder Quest #11**

---

## What is TapTato?

A pixel-art farming game where you plant potatoes and harvest them at the perfect moment for USDC rewards. **Uses Base Sub Accounts to eliminate wallet popups** — approve once, play forever.

**The Problem:** Traditional Web3 games need constant wallet signatures  
**The Solution:** Sub Accounts + Auto Spend Permissions = instant, frictionless gameplay

---

## Quick Start Guide

### For Players

1. **Visit** [https://taptato.vercel.app](https://taptato.vercel.app)
2. **Connect** your [Base Account wallet](https://account.base.app)
3. **Stock Up**: Click "Stock Up" to get test USDC from the faucet
4. **Start Playing:**
   - Click empty plots to plant (0.01 USDC each)
   - Wait 20 seconds for growth
   - Harvest at perfect timing for 2x bonus!

💡 **First Plant**: Approve Auto Spend Permission once — then no more popups!

### Understanding Your Wallets

TapTato uses a **two-wallet system** with farming terminology:

- 🏪 **Potato Barn** (Universal Account): Your main USDC storage — connected Base Account wallet
- 👝 **Field Pouch** (Sub Account): Active planting wallet — auto-created smart wallet with spending permissions

**How it works:**
1. Faucet sends USDC → Potato Barn (universal account)
2. Smart Refill auto-transfers → Field Pouch (sub account) when planting
3. Field Pouch handles all transactions with zero popups

---

## Game Mechanics

### Core Loop
1. **Plant**: Click empty plots (costs 0.01 USDC each)
2. **Wait**: 20 seconds for potatoes to grow (Seed → Sprout → Mid → Ripe)
3. **Harvest**: Timing determines rewards:
   - ⏱️ **Perfect** (±2s): 0.02 USDC (+100% bonus)
   - 👍 **Good** (±5s): 0.015 USDC (+50% bonus)
   - 😞 **Late**: 0 USDC (no refund!)

### Key Features

✨ **Batch Planting**: Plant up to 3 plots at once with `wallet_sendCalls`  
⚡ **Zero Popups**: One-time approval, then instant transactions  
🎯 **Real Rewards**: Tiered USDC payouts based on precision timing  
🏗️ **CDP Backend**: Server wallets for reward distribution (no smart contract needed)  
🎨 **Pixel Art**: Custom retro visuals and animations  

---

## Technical Implementation

### Sub Accounts Configuration

```typescript
// Auto-create Sub Account on wallet connection
baseAccount({
  appName: "TapTato",
  subAccounts: {
    creation: "on-connect",     // Auto-create
    defaultAccount: "sub",       // Use sub account by default
  }
})
```

**Flow:** Connect wallet → Sub Account created → First tx asks for permission → All future txs instant

### Batch Transactions

```typescript
// Plant multiple plots with one signature using wallet_sendCalls (EIP-5792)
const calls = plotIds.map(() => ({
  to: USDC.address,
  data: encodeFunctionData({
    functionName: "transfer",
    args: [SERVER_WALLET, parseUnits("0.01", 6)]
  })
}));

await provider.request({ method: "wallet_sendCalls", params: [{ calls }] });
```

### Two-Wallet Architecture

```typescript
// Potato Barn = Universal Account (main wallet)
const potatoBarn = connections[1];  

// Field Pouch = Sub Account (smart wallet with Auto Spend)
const fieldPouch = connections[0];
```

**Smart Refill:** When planting, if Field Pouch needs USDC, it auto-transfers from Potato Barn

---

## Why CDP Server Wallets Instead of Smart Contracts?

For this demo, I used [CDP SDK](https://docs.cdp.coinbase.com/cdp-sdk/docs/welcome) server wallets for reward distribution:

```typescript
// Server calculates timing and sends USDC rewards
const account = await cdp.evm.getOrCreateAccount({ name: "taptato-spender" });
await account.transfer({
  to: userAddress,
  amount: parseUnits(totalPayout, 6),
  token: "usdc"
});
```

**Why?**
- ✅ Faster development (focus on Sub Accounts UX, not Solidity)
- ✅ Flexible rewards (easy adjustments without contract upgrades)
- ✅ No gas optimization needed

**Trade-offs:**
- ⚠️ Centralized reward logic (vs fully on-chain)
- ⚠️ Players trust the server

**For showcasing Sub Accounts, this was the right choice.** The Sub Account integration is fully decentralized — only rewards are centralized.

---

## Known Issues & Notes

### Balance Updates
- May take 2-3 seconds after transactions (blockchain confirmation delay)
- Just wait — balance will update automatically

### State Management
- Game state stored in localStorage (client-side only)
- Use single tab per wallet to avoid conflicts
- Refresh page if states look wrong

### Future Improvements
- 🗄️ Database for multi-device sync
- 🔐 Server validation for exploit prevention
- 📊 Leaderboards
- 🎮 More game mechanics

---

## For Developers

### Quick Setup

```bash
git clone https://github.com/yourusername/taptato.git
cd taptato
pnpm install
```

### Environment Variables

Create `.env.local`:

```bash
# CDP Server Wallet (get from https://portal.cdp.coinbase.com/)
CDP_API_KEY_ID=your_id
CDP_API_KEY_SECRET=your_secret
CDP_WALLET_SECRET=your_base64_private_key

# Optional
NEXT_PUBLIC_PAYMASTER_SERVICE_URL=...
NEXT_PUBLIC_GROW_SECS=20
```

**Get CDP Keys:**
1. Visit [CDP Portal](https://portal.cdp.coinbase.com/)
2. Create project → Generate API credentials
3. Download JSON → Extract `id`, `privateKey`, secret
4. Fund server account with USDC from [faucet](https://portal.cdp.coinbase.com/products/faucet)

### Run Locally

```bash
pnpm dev
# Open http://localhost:3000
```

### Deploy to Vercel

1. Push to GitHub
2. Import to [Vercel](https://vercel.com/new)
3. Add environment variables in Settings
4. Deploy → Check logs for server wallet address → Fund with USDC

---

## Project Structure

```
taptato/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── faucet/route.ts          # CDP faucet
│   │   │   └── harvest/route.ts         # Reward distribution
│   │   ├── page.tsx                     # Main game (150 lines)
│   │   └── providers.tsx                # Wagmi + Sub Accounts config
│   ├── components/
│   │   ├── FarmField.tsx                # Plot grid
│   │   ├── PotatoVault.tsx              # Barn/Pouch wallet UI
│   │   └── PlotTile.tsx                 # Individual plot
│   ├── hooks/
│   │   ├── usePlantingManager.ts        # Planting + batching
│   │   ├── useHarvestManager.ts         # Harvesting + stats
│   │   └── useWalletManager.ts          # Wallet + balances
│   ├── store/
│   │   └── gameStore.ts                 # Zustand state
│   └── wagmi/
│       └── onConfig.ts                  # Sub Accounts setup
└── public/                              # Pixel art sprites
```

**Modular hooks-based architecture** — main page is just 150 lines orchestrating reusable components

---

## Resources & Links

**Manage Sub Account:** [account.base.app](https://account.base.app) — view/revoke permissions, monitor transactions

**Documentation:**
- [Base Sub Accounts](https://docs.base.org/base-account/improve-ux/sub-accounts)
- [CDP SDK](https://docs.cdp.coinbase.com/cdp-sdk/docs/welcome)
- [wagmi](https://wagmi.sh) | [Base Sepolia Explorer](https://sepolia.basescan.org)

**Troubleshooting:**
- **"Insufficient allowance"**: Disconnect and reconnect wallet
- **Transactions not batching**: Click multiple plots within 500ms
- **Potatoes not growing**: Check console for errors

---

## Built For Base Builder Quest #11

**Challenge:** Build an onchain app with no wallet popups

**Solution:** TapTato — a farming game proving Sub Accounts enable entirely new Web3 experiences

**Stack:** Sub Accounts • Auto Spend Permissions • Batch Transactions • CDP SDK

---

<div align="center">

**[🎮 Play TapTato Now](https://taptato.vercel.app)**

Built with 🥔 for Base Builder Quest #11

MIT License | [Watch Demo Video](https://x.com/tonymfer/status/1979189014386348271)

</div>
