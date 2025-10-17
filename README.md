# TapTato 🥔🍟

**Zero-Popup Farming on Base**

A Next.js demo application showcasing [Base Account Sub Accounts](https://docs.base.org/base-account/improve-ux/sub-accounts) through a fun pixel-art potato farming game with tiered USDC rewards.

> ⚠️ **Testnet Demo / NFA** - This is a demonstration project deployed on Base Sepolia testnet for educational purposes only.

## What is TapTato?

TapTato is a potato farming game that demonstrates the dramatic UX difference between traditional wallet interactions (Sub Account OFF) and Base Sub Accounts (Sub Account ON):

- **Sub OFF Mode**: Every plant/harvest action requires a wallet signature popup
- **Sub ON Mode**: One-time permission, then seamless batched transactions with no popups

### Game Mechanics

1. **Plant** potatoes (costs 0.01 USDC per plot)
2. Wait **45 seconds** for them to grow through 5 stages
3. **Harvest** within a **20-second window** for bonus rewards
4. Miss the window = rotten potato, no refund!

### Tiered Bonus System

- **Perfect** (±2s from ready): +100% bonus (2× payout)
- **Good** (±5s from ready): +50% bonus (1.5× payout)  
- **Late** (beyond harvest window): 0% bonus, no refund

All bonuses are paid from a smart contract treasury that can be funded by anyone.

## Key Features

### Sub Accounts Integration

- **Mode Toggle**: Switch between Sub OFF and Sub ON to compare
- **Batch Operations**: Multi-select plots for simultaneous planting/harvesting
- **Auto Spend Permissions**: Sub accounts automatically request spend permissions when needed
- **Real-time Metrics**: Track popups, transaction times, and success rates

### Smart Contract

- Solidity 0.8.20+ with OpenZeppelin
- Tiered bonus calculation (Perfect/Good/Late)
- Treasury system for bonus payouts
- Safety caps (per-tx, per-address-daily, global)
- Same-block plant+harvest prevention

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A Base Account wallet ([account.base.app](https://account.base.app))
- Base Sepolia testnet USDC

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd taptato

# Install frontend dependencies
pnpm install

# Install contract dependencies
cd contracts
npm install
cd ..
```

### Environment Setup

#### Frontend `.env.local`

```bash
# Copy example
cp .env.local.example .env.local

# Required values:
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_PATCH_ADDRESS=<deployed-contract-address>
NEXT_PUBLIC_TOKEN_ADDRESS=<base-sepolia-usdc-address>

# Optional: Paymaster for gas sponsorship
NEXT_PUBLIC_PAYMASTER_SERVICE_URL=<your-paymaster-url>
```

#### Contracts `.env`

```bash
cd contracts
cp .env.example .env

# Configure deployment parameters
RPC_URL=https://sepolia.base.org
PRIVATE_KEY=<your-private-key>
PP_TOKEN_ADDRESS=<base-sepolia-usdc-address>
# ... (see contracts/.env.example for all parameters)
```

### Deploy Smart Contract

```bash
cd contracts

# Compile
npm run compile

# Deploy to Base Sepolia
npm run deploy

# Copy the deployed address to frontend .env.local
```

### Fund Treasury (Optional)

The contract needs USDC in its treasury to pay out bonuses. You can deposit using the `depositTreasury` function:

```javascript
// Using ethers.js
await contract.depositTreasury(parseUnits("10", 6)); // 10 USDC
```

Or call it directly via a block explorer.

### Run the Demo

```bash
# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to play!

## Project Structure

```
taptato/
├── contracts/                  # Smart contracts
│   ├── contracts/
│   │   └── PotatoPatch.sol    # Main game contract
│   ├── scripts/deploy.ts      # Deployment script
│   └── hardhat.config.ts      # Hardhat configuration
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main farming UI
│   │   ├── providers.tsx      # Mode context & wagmi
│   │   └── globals.css        # Pixel fonts & styles
│   ├── components/
│   │   ├── ModeToggle.tsx     # Sub OFF/ON switcher
│   │   ├── PlotGrid.tsx       # 3×3 plot grid
│   │   ├── PlotTile.tsx       # Single plot component
│   │   └── Hud.tsx            # Metrics display
│   ├── hooks/
│   │   ├── useBlockTime.ts    # Onchain time polling
│   │   ├── usePlotState.ts    # Contract state management
│   │   └── useCallBatcher.ts  # Transaction batching
│   ├── lib/
│   │   ├── abi/potatoAbi.ts   # Contract ABI
│   │   └── contracts.ts       # Contract addresses
│   └── wagmi/
│       ├── offConfig.ts       # Sub OFF config
│       └── onConfig.ts        # Sub ON config
└── public/
    ├── seed.png               # Potato growth stages
    ├── sprout.png
    ├── mid.png
    ├── full.png               # Ripe potato
    └── wilt.png               # Rotten potato
```

## Technical Details

### How Sub Accounts Work

Base Account Sub Accounts enable frictionless transactions by:

1. Creating a hierarchical relationship between the universal Base Account and app-specific Sub Accounts
2. Using browser CryptoKey APIs to generate non-extractable signing keys
3. Linking Sub Accounts onchain through [ERC-7895](https://eip.tools/eip/7895)
4. Combining with [Spend Permissions](https://docs.base.org/base-account/improve-ux/spend-permissions) for seamless funding

### Wagmi Configuration

This demo uses wagmi's `baseAccount` connector with two configurations:

**Sub OFF** (`offConfig.ts`):
```typescript
subAccounts: {
  creation: "never",  // No sub accounts
}
```

**Sub ON** (`onConfig.ts`):
```typescript
subAccounts: {
  creation: "on-connect",    // Auto-create sub account
  defaultAccount: "sub",      // Use sub account by default
}
```

### Transaction Batching

In Sub ON mode, the `useCallBatcher` hook queues transactions for 300ms, then sends them all at once using `wallet_sendCalls` (EIP-5792) for a seamless experience.

## Safety Features

The smart contract includes multiple safety mechanisms:

- **Anti-exploit**: Same-block plant+harvest rejection
- **Bonus caps**: Per-transaction, per-address-daily, and global limits
- **Treasury check**: Bonuses only paid if treasury has sufficient balance
- **Reentrancy guard**: Prevents reentrancy attacks
- **Ownership**: Admin functions for config updates and emergency withdrawal

## Pixel Art & Fonts

TapTato uses a retro pixel aesthetic:

- **Titles**: Press Start 2P (24px/16px)
- **Body**: VT323 (16px)
- **Metrics**: Pixelify Sans (12-14px, bold)
- **Images**: Rendered pixelated (nearest-neighbor) at 2× scale

## Managing Permissions

Users can manage all their sub account permissions at:

🔗 [account.base.app](https://account.base.app)

Here you can:
- View all sub accounts
- Revoke spend permissions
- Delete sub accounts
- Manage app access

## Resources

- **Base Account Docs**: [docs.base.org/base-account](https://docs.base.org/base-account)
- **Sub Accounts Guide**: [Base Account Sub Accounts](https://docs.base.org/base-account/improve-ux/sub-accounts)
- **Spend Permissions**: [docs.base.org/base-account/improve-ux/spend-permissions](https://docs.base.org/base-account/improve-ux/spend-permissions)
- **wagmi Docs**: [wagmi.sh](https://wagmi.sh)
- **Base Sepolia Explorer**: [sepolia.basescan.org](https://sepolia.basescan.org)

## Troubleshooting

### "Insufficient allowance" error

Approve the contract to spend USDC:
```javascript
await usdcContract.approve(POTATO_PATCH_ADDRESS, parseUnits("100", 6));
```

### "Treasury insufficient" warning

The contract treasury needs funding. Call `depositTreasury(amount)` or contact the contract owner.

### Transactions not batching

Make sure you're in Sub ON mode and selecting multiple plots. Batching only works with 2+ transactions.

### Wrong network

Verify you're connected to Base Sepolia (Chain ID: 84532).

## License

MIT

---

Built with ❤️ using Base Account Sub Accounts
