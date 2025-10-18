/**
 * TapTato - Shared Type Definitions
 * Common types used across the application
 */

export interface WalletBalances {
  barnBalance: bigint | undefined;
  pouchBalance: bigint | undefined;
  barnEthBalance: bigint | undefined;
  pouchEthBalance: bigint | undefined;
}

export interface AccountAddresses {
  fieldPouch: `0x${string}` | undefined;
  potatoBarn: `0x${string}` | undefined;
}

export type PlotState = "empty" | "seed" | "sprout" | "mid" | "ripe" | "rotten";

export interface PlotData {
  id: number;
  state: PlotState;
  timeUntilRipe?: number;
  timeUntilRotten?: number;
  isPlanting?: boolean;
  harvestAmount?: number;
  plantSuccess?: boolean;
}

export interface GameStats {
  harvestedCount: number;
  totalPnL: number;
}

export interface HarvestResult {
  totalPayout: number;
  tier: "Perfect" | "Good" | "Late" | "Rotten";
}
