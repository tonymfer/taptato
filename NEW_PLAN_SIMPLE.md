# 🥔 TapTato - Simple Architecture (No Contract!)

## 🎯 핵심 아이디어

**스마트 컨트랙트 없이, USDC transfer만으로 완벽한 팝업 없는 경험!**

---

## 🏗️ Architecture

### Simple Flow:
```
1. Plant:
   User → USDC.transfer(ServerWallet, 0.01)
   → 첫 번째: Auto Spend Permission 팝업! (1회만)
   → 이후: 팝업 없음! ✨
   Zustand: plot state 업데이트
   localStorage: 영구 저장

2. Wait:
   Timer countdown (프론트엔드만)
   
3. Harvest:
   Frontend → API (/api/harvest)
   Backend:
     - Zustand state에서 readyAt 읽기
     - 타이밍 검증
     - 보너스 계산
     - ServerWallet → User (USDC 전송)
   Frontend: 보너스 받음! 팝업 없음! 🥔
```

---

## 📦 Tech Stack

**Frontend:**
- Next.js 14
- Zustand (게임 상태)
- wagmi (USDC transfer)
- localStorage (영구 저장)

**Backend:**
- Next.js API Routes
- Coinbase Server Wallets
- No database needed!

**No Smart Contract!** ✨

---

## 📁 File Structure

```
taptato/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── harvest/route.ts      (유일한 API!)
│   │   └── page.tsx
│   ├── hooks/
│   │   └── useGameActions.ts         (USDC transfer)
│   ├── lib/
│   │   ├── cdp.ts                    (Server Wallet)
│   │   └── utils.ts
│   └── store/
│       └── gameStore.ts              (Zustand)
└── contracts/                         (삭제 가능!)
```

---

## 🔧 Implementation Steps

### Phase 1: Zustand Store 생성
- Create game state store
- Plot states (empty, seed, sprout, mid, ripe, rotten)
- readyAt timestamps
- localStorage persistence

### Phase 2: Plant Flow (Frontend Only!)
1. Plant 버튼 클릭
2. USDC.transfer(ServerWallet, 0.01)
   - 첫 번째: Auto Spend 팝업
   - 이후: 팝업 없음!
3. Transaction 성공 시:
   - Zustand: plot 업데이트
   - readyAt = now + 45초
   - localStorage 저장

### Phase 3: Harvest API (Backend)
1. POST /api/harvest
2. Request: { userAddress, plotId, plantTime, readyAt }
3. Backend 검증:
   - 시간 검증 (block.timestamp 사용)
   - 보너스 계산
4. Server Wallet → User (USDC 전송)
5. Response: { tier, bonusPaid }

### Phase 4: Timer & UI
- Real-time countdown
- Growth stages (seed → sprout → mid → ripe)
- Visual feedback
- No contract polling!

---

## 💰 Server Wallet 관리

**초기 설정:**
- Server Wallet에 USDC 충전 (예: 100 USDC)
- 사용자들 plant → Wallet 받음
- 사용자들 harvest → Wallet 지급
- 순환 구조!

**모니터링:**
- Wallet balance 확인
- 부족하면 충전

---

## ✅ 장점

1. **매우 심플!**
   - 컨트랙트 없음
   - Spend Permission 없음
   - DB 없음
   - 그냥 USDC transfer + zustand

2. **Sub Account 완벽 시연!**
   - Auto Spend Permission (1회 팝업)
   - 이후 완전 무팝업!

3. **즉시 구현 가능!**
   - Server Wallet만 있으면 됨
   - 30분이면 완성

4. **오픈소스 최적!**
   - 코드 매우 간단
   - 이해하기 쉬움
   - 데모로 완벽

---

## ⚠️ 단점 (데모라서 OK!)

1. **치팅 가능**
   - localStorage 조작 가능
   - 하지만 backend에서 일부 검증

2. **온체인 기록 없음**
   - 블록체인에 상태 없음
   - USDC transfer만 온체인

3. **중앙화**
   - Server Wallet이 핵심
   - 하지만 데모이므로 OK

---

## 🚀 Implementation Tasks

### 1. Zustand Store
```typescript
interface PlotState {
  id: number;
  state: 'empty' | 'seed' | 'sprout' | 'mid' | 'ripe' | 'rotten';
  plantTime?: number;
  readyAt?: number;
  owner?: string;
}

interface GameStore {
  plots: PlotState[];
  plant: (plotId: number) => void;
  harvest: (plotId: number) => void;
}
```

### 2. Plant Action
```typescript
// Frontend
const plant = async (plotId: number) => {
  // USDC transfer to Server Wallet
  const hash = await sendTransaction({
    to: USDC_ADDRESS,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [SERVER_WALLET, parseUnits('0.01', 6)],
    }),
  });
  
  // Update Zustand
  updatePlot(plotId, {
    state: 'seed',
    plantTime: Date.now(),
    readyAt: Date.now() + 45000,
  });
};
```

### 3. Harvest API
```typescript
// Backend API
export async function POST(req) {
  const { userAddress, plotId, plantTime, readyAt } = await req.json();
  
  // Verify timing
  const now = Date.now();
  const timeDiff = Math.abs(now - readyAt) / 1000;
  
  let tier, bonus;
  if (timeDiff <= 2) {
    tier = 'Perfect';
    bonus = 0.02; // +100%
  } else if (timeDiff <= 5) {
    tier = 'Good';
    bonus = 0.015; // +50%
  } else {
    tier = 'Late';
    bonus = 0;
  }
  
  // Send USDC from Server Wallet
  if (bonus > 0) {
    await serverWallet.transfer({
      to: userAddress,
      amount: bonus,
      token: USDC_ADDRESS,
    });
  }
  
  return { tier, bonus };
}
```

### 4. localStorage Persistence
```typescript
// Auto-save to localStorage
useEffect(() => {
  localStorage.setItem('taptato_plots', JSON.stringify(plots));
}, [plots]);

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem('taptato_plots');
  if (saved) setPlots(JSON.parse(saved));
}, []);
```

---

## 📋 TODO List

### Immediate:
- [ ] Install zustand
- [ ] Create gameStore
- [ ] Update Plant to USDC transfer
- [ ] Create Harvest API
- [ ] Test flow end-to-end

### Required Info:
- [ ] CDP Server Wallet Address
- [ ] CDP API credentials in .env.local

---

## 🎯 Success Criteria

- [ ] First plant: 1 popup (Auto Spend)
- [ ] Second+ plant: No popups!
- [ ] Harvest: No popups!
- [ ] Bonus calculation correct
- [ ] State persists on refresh
- [ ] Mobile works
- [ ] Beautiful UI

---

**이 방법이 최고입니다!** 

간단하고, 빠르고, Sub Account의 장점을 완벽히 보여줍니다! 🚀

