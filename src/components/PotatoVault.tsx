/**
 * TapTato - Potato Vault Component
 * Displays Barn, Pouch balances and stats with animated numbers
 */

import type { GameStats } from "@/types";
import Image from "next/image";
import AnimatedSlotNumber from "./AnimatedSlotNumber";

interface PotatoVaultProps {
  barnBalance: string;
  pouchBalance: string;
  stats: GameStats;
  isLoading: boolean;
  isFaucetEligible: boolean;
  hasBarnBalance: boolean;
  isStocking: boolean;
  isTransferring: boolean;
  onStockUp: () => void;
  onLoadPouch: () => void;
}

export function PotatoVault({
  barnBalance,
  pouchBalance,
  stats,
  isLoading,
  isFaucetEligible,
  hasBarnBalance,
  isStocking,
  isTransferring,
  onStockUp,
  onLoadPouch,
}: PotatoVaultProps) {
  return (
    <div className="mb-6 max-w-5xl mx-auto">
      <div
        className="relative p-20 rounded-none shadow-2xl"
        style={{
          backgroundImage: "url(/board.png)",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-0">
          {/* Barn Card */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-full h-[80px] flex items-center justify-center">
              <Image
                src="/barn.png"
                alt="Barn"
                width={140}
                height={140}
                className=" absolute top-0 left-1/2 -translate-x-1/2 pixelated h-[120px] w-[120px]"
              />
            </div>
            <div className="text-center space-y-2">
              <div className="font-pixel-body text-xl text-amber-200 uppercase tracking-wide">
                Potato Barn
              </div>
              <div className="text-sm -mt-2 text-gray-400">
                Universal Account
              </div>
              <div className="font-pixel-metrics text-amber-200 font-bold">
                {isLoading ? (
                  <span className="text-5xl">...</span>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-6xl">$</span>
                    <AnimatedSlotNumber
                      value={parseFloat(barnBalance)}
                      className="text-6xl"
                      textColor="#fef3c7"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onStockUp}
              disabled={!isFaucetEligible || isStocking || isLoading}
              className="w-1/2 font-pixel-body text-sm py-1 px-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white border-2 border-green-900 transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              💰
              {isStocking ? "LOADING..." : "STOCK UP FROM FAUCET"}
            </button>
          </div>

          {/* Pouch Card */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-[80px] flex items-center justify-center">
              <Image
                src="/pouch.png"
                alt="Pouch"
                width={60}
                height={100}
                className="w-18 h-18 translate-y-1/4 pixelated"
              />
            </div>
            <div className="text-center space-y-2">
              <div className="font-pixel-body text-xl text-green-200 uppercase tracking-wide">
                Field Pouch
              </div>
              <div className="text-sm -mt-2 text-gray-400">Sub Account</div>
              <div className="font-pixel-metrics text-green-200 font-bold">
                {isLoading ? (
                  <span className="text-5xl">...</span>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-6xl">$</span>
                    <AnimatedSlotNumber
                      value={parseFloat(pouchBalance)}
                      className="text-6xl"
                      textColor="#bbf7d0"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onLoadPouch}
              disabled={!hasBarnBalance || isTransferring || isLoading}
              className="w-1/2 font-pixel-body text-sm py-1 px-2 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 text-white border-2 border-amber-900 transition-colors rounded-sm"
            >
              {isTransferring ? "LOADING..." : "🚜 LOAD FROM BARN"}
            </button>
          </div>

          {/* Stats Card */}
          <div className="flex flex-col items-center gap-5 justify-center h-full">
            <div className="text-center space-y-2">
              <div className="font-pixel-body text-xl text-amber-200 uppercase tracking-wide">
                Profit/Loss
              </div>
              <div
                className={`font-pixel-metrics font-bold flex items-center justify-center ${
                  stats.totalPnL >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                <span className="mr-2 text-5xl">
                  {stats.totalPnL >= 0 ? "+" : "-"}
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-6xl">$</span>
                  <AnimatedSlotNumber
                    value={Math.abs(stats.totalPnL)}
                    className="text-6xl"
                    textColor={stats.totalPnL >= 0 ? "#4ade80" : "#f87171"}
                  />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="font-pixel-body text-xl text-amber-200 uppercase tracking-wide">
                Harvested
              </div>
              <div className="flex items-center justify-center gap-3">
                <AnimatedSlotNumber
                  value={stats.harvestedCount}
                  className="text-6xl"
                  textColor="#fef3c7"
                  fractionDigits={0}
                />
                <span className="text-6xl">🥔</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
