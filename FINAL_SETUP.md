# 🎉 TapTato - Final Setup Guide (Simple Version!)

## ✅ 완료된 것

**새로운 간단한 아키텍처로 완전히 재구현되었습니다!**

### 구조:
- ❌ 스마트 컨트랙트 제거!
- ❌ Spend Permissions 제거!
- ❌ DB 제거!
- ✅ USDC transfer만 사용
- ✅ Zustand로 상태 관리
- ✅ localStorage로 영구 저장
- ✅ 하나의 API만 (/api/harvest)

---

## 🚀 즉시 실행 가능!

### Step 1: CDP 정보를 `.env.local`에 추가

프로젝트 루트에 `.env.local` 파일을 만들거나 편집:

```bash
# CDP Server Wallet (Backend only - Keep secret!)
CDP_API_KEY_NAME="organizations/{your_org}/apiKeys/{your_key}"
CDP_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
your-private-key-here
-----END EC PRIVATE KEY-----"
SPENDER_WALLET_ID="your-wallet-uuid"

# Public (Frontend accessible)
NEXT_PUBLIC_SPENDER_ADDRESS="0xYourServerWalletAddress"
NEXT_PUBLIC_TOKEN_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"

# Game config
NEXT_PUBLIC_GROW_SECS=45
NEXT_PUBLIC_HARVEST_WINDOW_SECS=20
```

### Step 2: Server Wallet USDC 충전

Server Wallet에 USDC가 있어야 보상을 줄 수 있습니다:

**Option A: Faucet 사용** (가장 쉬움):
1. https://sepolia.basescan.org/address/YOUR_SERVER_WALLET 접속
2. Token holdings 확인
3. USDC faucet에서 받기

**Option B: 직접 전송**:
- 다른 지갑에서 Server Wallet로 Base Sepolia USDC 전송
- 최소 1-2 USDC 권장

### Step 3: 서버 재시작

```bash
# 현재 dev 서버 중지 (Ctrl+C)
pnpm dev
```

### Step 4: 테스트!

1. **http://localhost:3000** (또는 3001) 접속

2. **Connect Base Account**

3. **Plant (0.01) 버튼 클릭**
   - 🎊 **첫 번째**: Auto Spend Permission 팝업!
   - "Transfer 0.01 USDC to Server Wallet"
   - **승인!**

4. **두 번째 Plant 클릭**
   - ✨ **팝업 없음!**
   - 즉시 실행!

5. **45초 대기** 🕐

6. **Harvest 버튼 클릭**
   - ✨ **팝업 없음!**
   - API가 보너스 계산
   - Server Wallet에서 USDC 전송!
   - 🥔 **Perfect: +100% bonus!**

---

## 🎮 동작 방식

### Plant Flow:
```
1. User clicks "Plant (0.01)"
   ↓
2. Frontend: USDC.transfer(ServerWallet, 0.01)
   ↓
3. First time: Auto Spend Permission popup
   "Allow seamless USDC transfers?"
   ↓
4. User approves
   ↓
5. Transaction confirmed
   ↓
6. Zustand: plot.state = "seed", readyAt = now + 45s
   ↓
7. localStorage: saved
   ↓
8. UI updates: 🌱 appears!
```

### Harvest Flow:
```
1. User clicks "Harvest 🥔"
   ↓
2. Frontend: POST /api/harvest
   ↓
3. Backend:
   - Verify timing (readyAt vs now)
   - Calculate bonus (Perfect/Good/Late)
   - Server Wallet → User (USDC transfer)
   ↓
4. Response: { tier: "Perfect", totalPayout: 0.02 }
   ↓
5. Zustand: plot.state = "empty"
   ↓
6. Toast: "🥔 Perfect! +100% bonus paid"
   ↓
7. Balance updates!
```

---

## 📊 HUD Metrics

### Popups Count:
- First plant: +1
- All other actions: 0
- **Total: 1!** ✨

### Actions/20s:
- Tracks rapid clicking
- Shows seamless experience

### Success Rate:
- Should be 100% after first approval

---

## 🔍 Troubleshooting

### "Server Wallet not configured"
→ `.env.local`에 `NEXT_PUBLIC_SPENDER_ADDRESS` 설정

### "Harvest failed"  
→ Server Wallet에 USDC 있는지 확인

### "Transaction failed" on first plant
→ Universal Account에 USDC 있는지 확인

### State가 사라짐
→ localStorage 확인, 브라우저 시크릿 모드인지 확인

---

## ✨ 완성!

**이제 진짜 팝업 없는 감자 농사!**

- ✅ 컨트랙트 없어서 심플
- ✅ Auto Spend로 팝업 1회만
- ✅ Zustand로 빠른 상태 관리
- ✅ 즉시 테스트 가능
- ✅ 오픈소스 데모로 완벽!

---

## 📝 CDP 정보 확인

다음 정보만 있으면 바로 실행 가능합니다:

- [ ] CDP API Key Name
- [ ] CDP Private Key
- [ ] Server Wallet ID
- [ ] Server Wallet Address
- [ ] Server Wallet에 USDC 충전됨

**`.env.local`에 설정하고 서버 재시작하면 끝!** 🎊

