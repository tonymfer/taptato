# 🥔 TapTato - Next Steps

## What's Been Completed ✅

The **entire TapTato application has been implemented**! Here's what's ready:

### Smart Contract
- ✅ Full `PotatoPatch.sol` implementation with:
  - 9-plot potato farming system
  - Tiered bonus rewards (Perfect +100%, Good +50%)
  - Treasury system for bonus payouts
  - Safety caps and anti-exploit mechanisms
  - Complete event logging
- ✅ Hardhat deployment scripts
- ✅ Deployment documentation

### Frontend Application
- ✅ Complete farming UI with 3×3 plot grid
- ✅ Mode toggle (Sub OFF ↔ Sub ON)
- ✅ Real-time plot state management
- ✅ Transaction batching system
- ✅ HUD with 5 metrics
- ✅ Pixel art styling with proper fonts
- ✅ Mobile-responsive design
- ✅ All components and hooks
- ✅ TypeScript compilation successful

### Documentation
- ✅ Updated README
- ✅ Comprehensive DEPLOYMENT.md guide
- ✅ PROJECT_STATUS.md tracker

---

## What You Need to Do Now 🚀

### Step 1: Deploy the Smart Contract

The contract is written but needs to be deployed to Base Sepolia.

```bash
# 1. Install contract dependencies
cd contracts
npm install

# 2. Get a Base Sepolia USDC test token address
# Check Circle's docs or deploy a test ERC-20

# 3. Create and configure .env file
cp .env.example .env
# Edit .env with:
# - RPC_URL (Base Sepolia)
# - PRIVATE_KEY (your deployer wallet)
# - PP_TOKEN_ADDRESS (USDC test token address)
# - Other parameters (defaults are already good)

# 4. Deploy!
npm run deploy

# 5. Copy the deployed contract address from output
```

### Step 2: Configure Frontend

```bash
# From project root
cd ..

# Create .env.local
# Note: .env.local.example might be gitignored, so here's the template:
cat > .env.local << 'EOF'
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_PATCH_ADDRESS=<paste-deployed-contract-address>
NEXT_PUBLIC_TOKEN_ADDRESS=<paste-usdc-token-address>
NEXT_PUBLIC_GROW_SECS=45
NEXT_PUBLIC_HARVEST_WINDOW_SECS=20
NEXT_PUBLIC_BONUS_BPS_PERFECT=10000
NEXT_PUBLIC_BONUS_BPS_GOOD=5000
NEXT_PUBLIC_TIER_PERFECT_SECS=2
NEXT_PUBLIC_TIER_GOOD_SECS=5
NEXT_PUBLIC_PAYMASTER_SERVICE_URL=
EOF

# Edit the file to add your addresses
```

### Step 3: Fund the Treasury

The contract needs USDC to pay out bonuses. Two options:

**Option A: Using Hardhat Console**
```bash
cd contracts
npx hardhat console --network baseSepolia

# In the console:
const USDC = await ethers.getContractAt("IERC20", "<USDC_ADDRESS>");
const Patch = await ethers.getContractAt("PotatoPatch", "<CONTRACT_ADDRESS>");

await USDC.approve(Patch.target, ethers.parseUnits("100", 6));
await Patch.depositTreasury(ethers.parseUnits("50", 6));

console.log("Treasury funded with 50 USDC");
```

**Option B: Using BaseScan**
1. Go to contract on BaseScan
2. Approve USDC spending
3. Call `depositTreasury` function

### Step 4: Run and Test

```bash
# Start dev server
pnpm dev

# Open http://localhost:3000
```

**Test Checklist**:
1. Connect Base Account wallet
2. Fund account with test USDC
3. Toggle to **Sub OFF** mode
4. Plant a potato → expect wallet popup
5. Toggle to **Sub ON** mode
6. Plant another potato → one-time permission, then no popups
7. Wait 45 seconds for growth
8. Harvest within 20-second window
9. Check if bonus was paid
10. Try batch operations (select multiple plots)
11. Check HUD metrics update

---

## Getting Base Sepolia USDC

You need a test USDC token on Base Sepolia. Options:

### Option 1: Deploy Test ERC-20
```solidity
// Simple test token for Base Sepolia
contract TestUSDC is ERC20 {
    constructor() ERC20("Test USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

### Option 2: Check Circle Docs
Circle may have official test USDC on Base Sepolia:
- [Circle Docs](https://developers.circle.com/)
- [Base Docs](https://docs.base.org/)

### Option 3: Use Existing Test Token
Search BaseScan for existing ERC-20 tokens with 6 decimals.

---

## Troubleshooting

### "Module not found" errors
```bash
pnpm install
```

### Contract deployment fails
- Check PRIVATE_KEY is set
- Ensure wallet has Base Sepolia ETH
- Verify RPC_URL is correct

### Frontend can't connect
- Verify NEXT_PUBLIC_PATCH_ADDRESS is correct
- Check you're on Base Sepolia network (Chain ID: 84532)
- Verify contract is deployed and verified on BaseScan

### No bonus paid
- Check treasury balance: `contract.getTreasuryBalance()`
- Verify treasury was funded
- Check timing (must harvest within Perfect/Good windows)

### TypeScript errors
All TypeScript errors have been fixed. If you see any:
```bash
pnpm build
```

---

## Quick Reference

**Contract Features**:
- Plant cost: 0.01 USDC (configurable)
- Grow time: 45 seconds (configurable)
- Harvest window: 20 seconds (configurable)
- Perfect bonus: +100% (±2s from ready)
- Good bonus: +50% (±5s from ready)
- Late: 0% bonus (no refund)

**Frontend Features**:
- Mode toggle (Sub OFF/ON comparison)
- 3×3 plot grid
- Real-time growth stages
- Batch operations
- Live metrics (popups, time, actions, success, treasury)
- Mobile responsive
- Pixel art theme

**Key Files**:
- Contract: `contracts/contracts/PotatoPatch.sol`
- Main UI: `src/app/page.tsx`
- Configs: `src/wagmi/offConfig.ts`, `src/wagmi/onConfig.ts`
- Hooks: `src/hooks/usePlotState.ts`, `src/hooks/useCallBatcher.ts`

---

## Questions?

Refer to:
- [README.md](./README.md) - Overview and usage
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Implementation status

The code is complete and ready to deploy! 🎉

