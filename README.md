# TapTato 🥔
<img width="739" height="902" alt="Screenshot 2025-10-17 at 23 11 53" src="https://github.com/user-attachments/assets/8cdcc9d0-166f-4bbb-b9f9-8a8e40f543c3" />

**Zero-Popup Potato Farming on Base**

> A Next.js farming game demonstrating the power of [Base Account Sub Accounts](https://docs.base.org/base-account/improve-ux/sub-accounts) and Auto Spend Permissions through addictive gameplay with real USDC rewards.

**🎮 [Play Demo](https://your-demo-url.vercel.app)** | **📺 [Watch Demo Video](#)** | **🏆 Built for Base Builder Quest #11**

---

## What is TapTato?

TapTato is a pixel-art farming game where you plant potatoes, wait for them to grow, and harvest them at the perfect moment for bonus USDC rewards. But here's the twist: **it uses Base Sub Accounts to make every transaction feel instant** — no wallet popups, no friction, just pure gameplay.

### The Challenge: High-Frequency Transactions

Traditional farming games require:
- 🌱 Planting (costs 0.01 USDC per plot)
- 🥔 Harvesting (pays 0.01-0.02 USDC based on timing)
- 🔄 Repeating hundreds of times

**Without Sub Accounts:** Every action = wallet popup = broken game experience  
**With Sub Accounts:** One-time permission → seamless gameplay forever

---

## Why I Built This

I wanted to prove that **Sub Accounts aren't just a UX improvement — they enable entirely new types of onchain applications**. TapTato would be unplayable with traditional wallet interactions. By integrating Base's Sub Account technology, I've created a game that feels like Web2 but runs entirely onchain.

### What Makes TapTato Special

✨ **Batch Transactions**: Plant multiple plots simultaneously using `wallet_sendCalls` (EIP-5792)  
⚡ **Zero Latency**: Sub Accounts eliminate signing delays for instant game actions  
🎯 **Real Rewards**: Tiered USDC payouts based on precision timing (Perfect/Good/Late)  
🏗️ **CDP-Powered Backend**: Using Coinbase Developer Platform's Server Wallets instead of smart contracts  
🎨 **Retro Pixel Art**: Custom pixel fonts and hand-crafted potato sprites  

---

## Game Mechanics

### Core Loop
1. **Plant** potatoes (costs 0.01 USDC per plot)
2. Wait **20 seconds** for them to grow through 4 visual stages:
   - 🌱 Seed → Sprout → Mid → 🥔 Ripe
3. **Harvest** within the timing window for bonuses:
   - ⏱️ **Perfect** (±2s): +100% bonus = **0.02 USDC payout**
   - 👍 **Good** (±5s): +50% bonus = **0.015 USDC payout**
   - 😞 **Late** (beyond window): 0% bonus = **no refund!**

### Why This Tests Sub Accounts

- **12 plots** on screen = potential for 12 simultaneous transactions
- **Time-sensitive gameplay** = no room for popup delays
- **Economic incentives** = real pressure to optimize speed

Perfect test case for frictionless Web3 UX.

---

## Technical Implementation

### Sub Accounts Integration

TapTato uses wagmi's `baseAccount` connector with Sub Account auto-creation:

```typescript
// src/wagmi/onConfig.ts
export function getOnConfig() {
  return createConfig({
    chains: [baseSepolia],
    connectors: [
      baseAccount({
        appName: "TapTato",
        subAccounts: {
          creation: "on-connect",    // 🔑 Auto-create sub account
          defaultAccount: "sub",      // 🔑 Use sub account by default
        },
        paymasterUrls: {
          [baseSepolia.id]: process.env.NEXT_PUBLIC_PAYMASTER_SERVICE_URL,
        },
      }),
    ],
    // ... rest of config
  });
}
```

**Key Flow:**
1. User connects wallet → Sub Account auto-created
2. First transaction → Auto Spend Permission requested once
3. All future transactions → Zero popups, instant execution

### Batch Transaction Optimization

For multi-plot operations, TapTato queues transactions and sends them as a batch:

```typescript
// Batch planting with wallet_sendCalls (EIP-5792)
const calls = plotIds.map(() => ({
  to: USDC.address,
  data: encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [SERVER_WALLET_ADDRESS, parseUnits("0.01", 6)],
  }),
}));

await provider.request({
  method: "wallet_sendCalls",
  params: [{
    version: "2.0",
    from: account.address,
    calls,
    capabilities: { atomicBatch: { supported: false } }
  }]
});
```

**Result:** Plant 3+ plots in a single user action with one signature.

---

## Why No Smart Contract?

### The Original Plan

I initially planned to build a full smart contract system with:
- On-chain plot state management
- Tiered bonus calculations
- Treasury system with safety caps

### The Reality

Smart contract development is **hard** and **time-intensive**:
- Extensive testing required for economic logic
- Gas optimization challenges
- Complex upgrade strategies
- Audit considerations for handling real funds

### The Solution: CDP Server Wallets

Instead, I leveraged [Coinbase Developer Platform's CDP SDK](https://docs.cdp.coinbase.com/cdp-sdk/docs/welcome) to build a **server-managed reward system**:

```typescript
// src/app/api/harvest/route.ts
const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({
  name: "taptato-spender"
});

// Send tiered USDC rewards based on harvest timing
await account.transfer({
  to: userAddress,
  amount: parseUnits(totalPayout.toString(), 6),
  token: "usdc",
  network: "base-sepolia",
});
```

### Benefits of This Approach

✅ **Faster Development**: Focus on game logic instead of Solidity  
✅ **Flexible Rewards**: Easy to adjust timing/bonuses without contract upgrades  
✅ **CDP Integration**: Seamless server wallet management with enterprise-grade security  
✅ **Gas Efficiency**: No complex on-chain calculations  

### Trade-offs

⚠️ **Trust Model**: Players trust the server to calculate and distribute rewards fairly  
⚠️ **Centralization**: Reward logic runs off-chain vs fully decentralized  

**For a game demo showcasing Sub Accounts UX, this was the right choice.** The Sub Accounts integration is still fully decentralized — only the reward distribution is centralized.

---

## Key Features

### 🎮 Seamless Gameplay
- **No wallet popups** during gameplay after initial permission
- **Multi-plot selection** for batch operations
- **Real-time visual updates** showing potato growth stages
- **Floating damage numbers** showing costs/earnings

### 💰 Economic System
- Plant cost: **0.01 USDC** per plot
- Perfect harvest: **0.02 USDC** (+100% bonus)
- Good harvest: **0.015 USDC** (+50% bonus)
- Late harvest: **0 USDC** (no refund!)

### 🛠️ Base Technology Stack
- **Sub Accounts**: Zero-popup transaction flow
- **Auto Spend Permissions**: One-time authorization for all future actions
- **Base Account SDK**: Latest features via pnpm overrides
- **CDP SDK**: Server wallet management for rewards
- **Base Sepolia**: Testnet deployment with USDC

### 🎨 Polish
- Custom pixel fonts (Press Start 2P, VT323, Pixelify Sans)
- Hand-crafted potato growth sprites
- Retro field background with precise plot positioning
- Tutorial dialog for first-time players
- Persistent game state via Zustand + localStorage

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- [Base Account wallet](https://account.base.app)
- Base Sepolia USDC (get from [faucet](https://portal.cdp.coinbase.com/products/faucet))

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/taptato.git
cd taptato

# Install dependencies
pnpm install
```

### Environment Setup

Create `.env.local`:

```bash
# Required for CDP Server Wallet (reward distribution)
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret

# Optional: Paymaster for gas sponsorship
NEXT_PUBLIC_PAYMASTER_SERVICE_URL=https://api.developer.coinbase.com/rpc/v1/base-sepolia/...

# Game configuration (optional)
NEXT_PUBLIC_GROW_SECS=20
NEXT_PUBLIC_HARVEST_WINDOW_SECS=5
NEXT_PUBLIC_TIER_PERFECT_SECS=2
NEXT_PUBLIC_TIER_GOOD_SECS=5
```

**Get CDP API Keys:**
1. Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create a new project
3. Generate API credentials
4. Fund your CDP wallet with USDC for rewards

### Run the Game

```bash
# Start development server
pnpm dev

# Open http://localhost:3000
```

### Deploy to Production

```bash
# Build for production
pnpm build

# Deploy to Vercel, Netlify, or your preferred host
```

---

## Project Structure

```
taptato/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── faucet/route.ts      # CDP faucet for initial USDC
│   │   │   └── harvest/route.ts     # CDP reward distribution
│   │   ├── layout.tsx               # Root layout with Wagmi provider
│   │   ├── page.tsx                 # ⭐ Main game UI (12-plot grid)
│   │   └── providers.tsx            # Wagmi config with Sub Accounts
│   ├── components/
│   │   ├── FloatingText.tsx         # Animated +/- USDC indicators
│   │   ├── PlotTile.tsx             # Individual plot component
│   │   └── TutorialDialog.tsx       # First-time user guide
│   ├── hooks/
│   │   ├── useFaucet.ts             # Request test USDC
│   │   ├── useFaucetEligibility.ts  # Check faucet cooldown
│   │   └── usePlotState.ts          # Contract state management
│   ├── lib/
│   │   ├── cdp.ts                   # CDP SDK utilities
│   │   ├── faucet.ts                # Faucet logic
│   │   └── usdc.ts                  # USDC contract config
│   ├── store/
│   │   └── gameStore.ts             # ⭐ Zustand game state
│   └── wagmi/
│       └── onConfig.ts              # ⭐ Sub Accounts configuration
├── public/
│   ├── field.png                    # Farm background
│   ├── seed.png                     # Growth stage 1
│   ├── sprout.png                   # Growth stage 2
│   ├── mid.png                      # Growth stage 3
│   ├── full.png                     # Growth stage 4 (ripe)
│   └── wilt.png                     # Rotten potato
└── package.json                     # ⭐ pnpm overrides for latest SDK
```

---

## How It Works: Technical Deep Dive

### 1. Wallet Connection & Sub Account Creation

```typescript
// User clicks "Connect Wallet"
const { connectors, connect } = useConnect();
connect({ connector: connectors[0] }); // baseAccount connector

// Behind the scenes:
// 1. Base Account SDK creates a sub account
// 2. Sub account is linked onchain via ERC-7895
// 3. Browser generates non-extractable signing key
// 4. Sub account address becomes default for all transactions
```

### 2. First Transaction (Planting)

```typescript
// User plants first potato
const handlePlantSingle = (plotId: number) => {
  startPlanting(plotId); // Show loading state
  
  // Queue transaction with 500ms debounce for batching
  plantQueueRef.current.push(plotId);
  
  setTimeout(() => {
    executePlantBatch(plantQueueRef.current);
  }, 500);
};

// Execute batch
const executePlantBatch = async (plotIds: number[]) => {
  // Base Account automatically:
  // 1. Detects USDC needed for transfer
  // 2. Requests Spend Permission from parent account
  // 3. User approves ONCE
  // 4. All future transactions skip this step
  
  const callsId = await provider.request({
    method: "wallet_sendCalls",
    params: [{ calls, capabilities: { atomicBatch: { supported: false } } }]
  });
};
```

### 3. Harvest Timing & Rewards

```typescript
// Frontend tracks grow time
const GROW_TIME_MS = 20 * 1000; // 20 seconds
const readyAt = plantTime + GROW_TIME_MS;

// User harvests potato
const handleHarvestSingle = async (plotId: number) => {
  // Send harvest request to server
  const response = await fetch("/api/harvest", {
    method: "POST",
    body: JSON.stringify({ userAddress, plotId, readyAt, plantTime })
  });
  
  // Server calculates timing
  const now = Date.now();
  const timeDiff = Math.abs(now - readyAt);
  
  // Tiered rewards
  if (timeDiff <= 2000) {
    tier = "Perfect";
    totalPayout = 0.02; // +100% bonus
  } else if (timeDiff <= 5000) {
    tier = "Good";
    totalPayout = 0.015; // +50% bonus
  } else {
    tier = "Late";
    totalPayout = 0; // No refund!
  }
  
  // CDP Server Wallet sends reward
  await cdpAccount.transfer({
    to: userAddress,
    amount: parseUnits(totalPayout.toString(), 6),
    token: "usdc",
    network: "base-sepolia"
  });
};
```

### 4. State Management

```typescript
// Zustand store with localStorage persistence
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      plots: Array.from({ length: 12 }, (_, i) => ({
        id: i,
        state: "empty",
      })),
      
      plant: (plotId: number, userAddress: string) => {
        const now = Date.now();
        set((state) => {
          const newPlots = [...state.plots];
          newPlots[plotId] = {
            ...newPlots[plotId],
            state: "sprout",
            owner: userAddress,
            plantTime: now,
            readyAt: now + GROW_TIME_MS,
          };
          return { plots: newPlots };
        });
      },
      
      harvest: (plotId: number) => {
        set((state) => {
          const newPlots = [...state.plots];
          newPlots[plotId] = {
            id: plotId,
            state: "empty",
            harvestedAt: Date.now(),
          };
          return { plots: newPlots };
        });
      },
    }),
    { name: "taptato-game-storage" }
  )
);

// Visual state calculation
export function calculateVisualState(plot: Plot, currentTime: number): PlotState {
  if (!plot.readyAt || !plot.plantTime) return plot.state;
  
  const rottenAt = plot.readyAt + HARVEST_WINDOW_MS;
  
  if (currentTime > rottenAt) return "rotten";
  if (currentTime >= plot.readyAt) return "ripe";
  
  const growProgress = (currentTime - plot.plantTime) / GROW_TIME_MS;
  return growProgress < 0.5 ? "sprout" : "mid";
}
```

---

## What I Learned Building This

### Sub Accounts Are Game-Changing

Before building TapTato, I understood Sub Accounts conceptually. **Now I understand them viscerally.** The difference between:
- "User needs to sign this transaction" → broken game flow
- "User already gave permission" → instant, delightful experience

...is the difference between a Web3 prototype and a real product.

### CDP SDK Is Underrated

I initially tried building a smart contract, but the complexity was overwhelming for a time-limited demo. **CDP SDK let me ship a working reward system in hours instead of weeks.**

The server wallet approach isn't perfect for all use cases, but for:
- Prototyping new game mechanics
- Time-sensitive competitions
- Demos that need to work reliably

...it's an incredibly powerful tool.

### UX Details Matter

Small touches make a huge difference:
- Floating text animations for feedback
- Pixel-perfect sprite positioning
- Tutorial for first-time users
- Persistent state so players don't lose progress

**Base gives you the primitives for great UX. You still need to build the UX.**

---

## Future Improvements

If I continue developing TapTato post-competition:

🔐 **Smart Contract Rewards**: Move to on-chain reward distribution for full decentralization  
🎮 **More Game Mechanics**: Fertilizer, weather events, special crops  
🏆 **Leaderboards**: Compete for highest profit margin  
👥 **Multiplayer**: Steal potatoes from other players' plots (with stakes)  
🎨 **NFT Avatars**: Customizable farmer characters  
⚡ **Mainnet Launch**: Move to Base mainnet with real rewards  

---

## Managing Your Sub Account

Users can view and manage their TapTato Sub Account at:

🔗 **[account.base.app](https://account.base.app)**

Here you can:
- View all your Sub Accounts across apps
- Revoke spend permissions for TapTato
- Delete your Sub Account
- Monitor transaction history

---

## Resources

### Base Documentation
- [Sub Accounts Guide](https://docs.base.org/base-account/improve-ux/sub-accounts)
- [Auto Spend Permissions](https://docs.base.org/base-account/improve-ux/spend-permissions)
- [Base Account SDK](https://docs.base.org/base-account)

### CDP Documentation
- [CDP SDK Docs](https://docs.cdp.coinbase.com/cdp-sdk/docs/welcome)
- [Server Wallets Guide](https://docs.cdp.coinbase.com/developer-platform/docs/wallets)
- [CDP Faucet](https://portal.cdp.coinbase.com/products/faucet)

### Tools & Libraries
- [wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)
- [Base Sepolia Explorer](https://sepolia.basescan.org)

---

## Troubleshooting

### "Insufficient allowance" error
The Sub Account needs spend permission. The SDK should request this automatically on first transaction. If not, try disconnecting and reconnecting your wallet.

### Transactions not batching
Make sure you're rapidly clicking multiple plots within 500ms. The batching debounce is configured in `page.tsx`.

### "Not eligible for faucet"
The faucet has a cooldown period and minimum balance requirement. Check `src/lib/faucet.ts` for eligibility logic.

### Potatoes not growing
Check your browser console for errors. Make sure your system time is correct (growth is calculated client-side).

---

## Competition Submission

**Base Builder Quest #11**: Build an onchain app with no wallet pop-ups

### What I Built
TapTato - A farming game that proves Sub Accounts can enable entirely new onchain experiences.

### Technologies Used
- ✅ Base Account Sub Accounts
- ✅ Auto Spend Permissions
- ✅ Batch transactions (wallet_sendCalls)
- ✅ CDP SDK for server wallets
- ✅ Base Sepolia testnet

### Why It Matters
This isn't just a demo of Sub Accounts — it's a proof that **friction-free Web3 UX unlocks new product categories**. Farming games, strategy games, social apps with frequent micro-transactions... all become possible when you remove wallet popups.

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

Built with inspiration from:
- [@stephancill](https://twitter.com/stephancill)'s tipping app demo
- [@0xyoussea](https://twitter.com/0xyoussea)'s Sub Accounts video guide
- The entire Base team for building amazing developer tools

**Special thanks to the Base Builder Quest program for pushing developers to explore the bleeding edge of Web3 UX.**

---

<div align="center">

**[🎮 Play TapTato Now](https://your-demo-url.vercel.app)**

Built with 🥔 for Base Builder Quest #11

</div>
