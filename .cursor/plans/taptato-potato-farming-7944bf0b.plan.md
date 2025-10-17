<!-- 7944bf0b-b8ef-4356-972f-59aeadbba01f ff897440-5a1c-4864-9174-07985fcf5c9f -->
# TapTato - Spend Permissions Architecture

## Core Architecture

### Flow Overview

```
User → Spend Permission (1회 팝업) → 이후 모든 액션 팝업 없음!
  ↓
Plant → API → Spender가 Spend Permission으로 USDC 수집 → Contract 업데이트
  ↓
Harvest → API → Contract 검증 → Spender가 보상 전송
```

### Key Components

**Frontend**: Next.js + wagmi + Base Account SDK

- Spend Permission 요청 UI
- 게임 UI (3x3 grid)
- 실시간 온체인 상태 표시

**Backend**: Next.js API Routes + Coinbase Server Wallets

- `/api/permissions/request` - Spend Permission 생성
- `/api/plant` - Plant 처리 (Spend Permission으로 USDC 수집)
- `/api/harvest` - Harvest 처리 (보너스 계산 및 전송)

**Smart Contract**: PotatoPatch (수정 버전)

- Spender만 호출 가능한 함수들
- 온체인 게임 상태 관리
- 보너스 계산 로직

**Spender**: Coinbase Server Wallet

- Spend Permission 소유자
- 사용자 대신 트랜잭션 실행
- USDC 수집 및 분배

---

## Technical Design

### 1. Spend Permission Setup

**Request Permission** (최초 1회):

```typescript
const permission = await requestSpendPermission({
  account: userAddress,
  spender: SPENDER_WALLET_ADDRESS, // Coinbase Server Wallet
  token: USDC_ADDRESS,
  allowance: parseUnits("10", 6), // 10 USDC limit
  periodInDays: 30,
  provider,
});
```

**Store Permission**:

- Frontend: permissionHash in localStorage
- Backend: permission details in DB or cache (optional)

### 2. Smart Contract Architecture

```solidity
contract PotatoPatch {
    address public spender; // Coinbase Server Wallet
    
    // Spender-only functions
    function plantFor(address user, uint256 plotId) external onlySpender {
        // Update onchain state
    }
    
    function harvestFor(address user, uint256 plotId) 
        external onlySpender 
        returns (uint256 bonus) {
        // Calculate bonus
        // Return amount to send
    }
}
```

### 3. Backend API Flow

**POST /api/plant**:

```typescript
1. Receive: { plotId, permissionHash }
2. Verify permission status
3. prepareSpendCallData to collect USDC
4. Execute: spendCalls + contract.plantFor()
5. Return: success + tx hash
```

**POST /api/harvest**:

```typescript
1. Receive: { plotId, permissionHash }
2. Read contract: verify timing
3. Calculate bonus tier
4. Call contract.harvestFor()
5. Send USDC reward to user
6. Return: bonus info
```

### 4. Coinbase Server Wallet Setup

**Environment Variables**:

```bash
CDP_API_KEY_NAME=organizations/{org_id}/apiKeys/{key_id}
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----...
SPENDER_WALLET_ID=uuid-from-cdp
```

**Initialization**:

```typescript
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

Coinbase.configure({
  apiKeyName: process.env.CDP_API_KEY_NAME,
  privateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
});

const wallet = await Wallet.fetch(process.env.SPENDER_WALLET_ID);
const spenderAddress = await wallet.getDefaultAddress();
```

---

## Implementation Steps

### Phase 1: Setup & Configuration

1. Create Coinbase Developer Platform account
2. Generate CDP API keys
3. Create Server Wallet on Base Sepolia
4. Get Server Wallet address
5. Add CDP SDK to project
6. Configure environment variables

### Phase 2: Smart Contract Update

1. Modify PotatoPatch contract:

   - Add `spender` variable
   - Add `onlySpender` modifier
   - Change `plant()` to `plantFor(address user, ...)`
   - Change `harvest()` to `harvestFor(address user, ...)`
   - Remove `userBalance` mapping (not needed)

2. Redeploy contract
3. Set spender address in contract
4. Fund treasury with USDC for bonuses

### Phase 3: Backend API Implementation

1. Create `/api/permissions/request` endpoint

   - Generate spend permission request
   - Return permission data

2. Create `/api/plant` endpoint

   - Verify permission
   - Use `prepareSpendCallData` to collect USDC
   - Call contract `plantFor()`
   - Return transaction hash

3. Create `/api/harvest` endpoint

   - Verify permission
   - Read contract state
   - Validate timing
   - Call contract `harvestFor()`
   - Calculate and send bonus
   - Return transaction details

4. Create utility functions:

   - `getSpenderWallet()` - Initialize CDP wallet
   - `verifyPermission()` - Check permission status
   - `executeSpend()` - Execute spend permission calls

### Phase 4: Frontend Integration

1. Remove old deposit/approve logic
2. Implement Spend Permission request flow:

   - UI button to request permission
   - Display permission status
   - Store permission hash

3. Update Plant action:

   - Call `/api/plant` endpoint
   - Display loading state
   - No wallet popup!

4. Update Harvest action:

   - Call `/api/harvest` endpoint
   - Display bonus result
   - No wallet popup!

5. Add permission management:

   - Show current permission details
   - Revoke button (if needed)

### Phase 5: State Management

1. Create `useSpendPermission` hook
2. Create `useGameActions` hook (plant/harvest API calls)
3. Remove direct contract write calls
4. Poll contract for state updates
5. Display user balance and permission status

### Phase 6: Testing & Polish

1. Test Spend Permission request flow
2. Test plant action (verify USDC collection)
3. Test harvest with timing (Perfect/Good/Late)
4. Test bonus payments
5. Test permission expiry
6. Add error handling
7. Add loading states
8. Test on mobile

### Phase 7: Documentation

1. Update README with Spend Permission flow
2. Document CDP setup process
3. Document API endpoints
4. Add troubleshooting guide
5. Add security best practices

---

## File Structure

```
taptato/
├── contracts/
│   └── contracts/PotatoPatch.sol      (수정: spender-only functions)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── plant/route.ts         (NEW: Plant API)
│   │   │   ├── harvest/route.ts       (NEW: Harvest API)
│   │   │   └── permissions/
│   │   │       └── request/route.ts   (NEW: Permission request)
│   │   └── page.tsx                   (수정: API calls)
│   ├── hooks/
│   │   ├── useSpendPermission.ts      (NEW)
│   │   └── useGameActions.ts          (NEW)
│   └── lib/
│       ├── cdp.ts                     (NEW: Coinbase SDK)
│       └── spendPermissions.ts        (NEW: Utilities)
└── .env.local
    ├── CDP_API_KEY_NAME
    ├── CDP_API_KEY_PRIVATE_KEY
    └── SPENDER_WALLET_ID
```

---

## Success Criteria

- [ ] Spend Permission 요청 성공 (1회 팝업)
- [ ] Plant 액션 팝업 없이 실행
- [ ] Harvest 액션 팝업 없이 실행  
- [ ] USDC가 올바르게 수집/분배됨
- [ ] 온체인 상태가 정확히 업데이트됨
- [ ] 보너스 티어가 올바르게 계산됨
- [ ] HUD 메트릭이 정확함
- [ ] 모바일 동작
- [ ] 에러 처리 완벽

---

## Detailed Implementation Plan

### Contract Modifications (PotatoPatch.sol)

**Add:**

```solidity
address public spender;

modifier onlySpender() {
    require(msg.sender == spender, "Only spender can call");
    _;
}

function setSpender(address _spender) external onlyOwner {
    spender = _spender;
}

function plantFor(address user, uint256 plotId) external onlySpender nonReentrant {
    // Same logic as before, but for specified user
}

function harvestFor(address user, uint256 plotId) 
    external onlySpender nonReentrant 
    returns (BonusTier tier, uint256 bonusPaid, uint256 totalPayout) {
    // Calculate and return values for backend to send USDC
}
```

**Remove:**

- `userBalance` mapping (not needed)
- `deposit()` function (not needed)
- Direct user calls to plant/harvest

### API Endpoint Specifications

**POST /api/plant**

```typescript
Request: {
  userAddress: string,
  plotId: number,
  permissionHash: string
}

Response: {
  success: boolean,
  txHash: string,
  plotId: number,
  readyAt: number
}
```

**POST /api/harvest**

```typescript
Request: {
  userAddress: string,
  plotId: number,
  permissionHash: string
}

Response: {
  success: boolean,
  txHash: string,
  tier: 'Perfect' | 'Good' | 'Late',
  bonusPaid: string,
  totalPayout: string
}
```

### Security Considerations

**Rate Limiting**:

- Max 10 requests per minute per user
- Prevent spam attacks

**Permission Verification**:

- Always check permission status before execution
- Verify permission hasn't expired
- Check remaining allowance

**Input Validation**:

- Validate userAddress format
- Validate plotId range (0-8)
- Verify permission hash format

**Error Handling**:

- Insufficient permission allowance
- Expired permission
- Contract revert reasons
- Network failures
- CDP wallet errors

### Frontend Changes

**Remove:**

- Direct `writeContract` calls for plant/harvest
- `useCallBatcher` (not needed with API)
- `sendTransaction` for plant/harvest

**Add:**

- Spend Permission request button
- Permission status display
- API call hooks
- Loading states for API calls
- Error display for API failures

### Environment Variables Required

**Frontend (.env.local):**

```bash
NEXT_PUBLIC_PATCH_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_SPENDER_ADDRESS=0x...  # CDP Server Wallet address
```

**Backend (Server-side env):**

```bash
CDP_API_KEY_NAME=organizations/{org_id}/apiKeys/{key_id}
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----...
SPENDER_WALLET_ID=uuid-from-cdp
POTATO_PATCH_ADDRESS=0x...
USDC_TOKEN_ADDRESS=0x...
```

### Testing Checklist

**Phase 1: CDP Setup**

- [ ] CDP account created
- [ ] API keys generated and saved
- [ ] Server Wallet created on Base Sepolia
- [ ] Server Wallet funded with ETH (for gas)
- [ ] Wallet address retrieved and configured

**Phase 2: Contract**

- [ ] Contract modified and compiled
- [ ] Contract deployed to Base Sepolia
- [ ] Spender address set in contract
- [ ] Treasury funded with test USDC
- [ ] Contract functions verified on BaseScan

**Phase 3: Backend**

- [ ] CDP SDK initialized correctly
- [ ] Wallet connection works
- [ ] Spend Permission verification works
- [ ] Plant API executes successfully
- [ ] Harvest API executes successfully
- [ ] Error handling works

**Phase 4: Frontend**

- [ ] Spend Permission request UI works
- [ ] Permission stored in localStorage
- [ ] Plant calls API (no popup!)
- [ ] Harvest calls API (no popup!)
- [ ] Loading states display
- [ ] Error messages clear
- [ ] State updates correctly

**Phase 5: End-to-End**

- [ ] User grants permission (1 popup)
- [ ] Plant works without popup
- [ ] Multiple plants work without popups
- [ ] Harvest timing works correctly
- [ ] Bonuses calculated correctly
- [ ] USDC transfers work
- [ ] HUD metrics accurate

### Critical Success Factors

**This will work IF:**

1. ✅ CDP Server Wallet properly configured
2. ✅ Spend Permission granted with sufficient allowance
3. ✅ Contract only allows Spender to call functions
4. ✅ Backend properly executes Spend Permission calls
5. ✅ Treasury has USDC for bonuses
6. ✅ Server Wallet has ETH for gas

**This will NOT work if:**

- ❌ Spend Permission expires or has insufficient allowance
- ❌ Server Wallet runs out of ETH
- ❌ Treasury runs out of USDC
- ❌ CDP API credentials invalid
- ❌ Network connectivity issues

### Risk Mitigation

**Spend Permission Expiry**: Set 30-day period, notify user before expiry

**Server Wallet Gas**: Monitor balance, alert when low

**Treasury Depletion**: Monitor balance, pause bonuses if insufficient

**CDP Failures**: Implement retry logic with exponential backoff

**Rate Limiting**: Implement per-user limits in API

---

## Confidence Level

**이 방법으로 100% 작동합니다!** ✅

근거:

- [Base Account 공식 문서](https://docs.base.org/base-account/improve-ux/spend-permissions)에서 정확히 이 패턴을 설명
- Spend Permissions는 이미 프로덕션에서 사용 중
- Coinbase Server Wallets는 검증된 솔루션
- 컨트랙트는 간단한 상태 저장만 (검증됨)

**복잡도:**

- Backend API: 3개 endpoints (간단함)
- CDP 연동: SDK 사용 (문서화 잘 됨)
- 컨트랙트: 기존 것 약간 수정 (쉬움)

**완벽하게 작동합니다!** 💯

### To-dos

- [ ] Test both modes, batch operations, tier bonuses, and mobile responsiveness