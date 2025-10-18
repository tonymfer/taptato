/**
 * TapTato - Harvest Manager Hook
 * Manages harvesting logic and stats tracking
 */

import { useGameStore } from "@/store/gameStore";
import type { GameStats } from "@/types";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

interface HarvestManagerProps {
  refetchBarnBalance: () => Promise<any>;
  refetchPouchBalance: () => Promise<any>;
}

export function useHarvestManager({
  refetchBarnBalance,
  refetchPouchBalance,
}: HarvestManagerProps) {
  const account = useAccount();
  const { plots, harvest } = useGameStore();

  const [harvestedCount, setHarvestedCount] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [harvestAmounts, setHarvestAmounts] = useState<Record<number, number>>(
    {}
  );

  // Harvest single plot
  const handleHarvestSingle = useCallback(
    async (plotId: number) => {
      if (!account.address) {
        toast.error("🔌 Wallet Not Connected", {
          description: "Please connect your wallet first!",
        });
        return;
      }

      const plot = plots[plotId];
      if (!plot.readyAt || !plot.plantTime) {
        toast.error("❌ Empty Plot!", {
          description: "This plot hasn't been planted yet",
        });
        return;
      }

      try {
        console.log("🥔 Harvesting plot", plotId);

        const response = await fetch("/api/harvest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: account.address,
            plotId,
            readyAt: plot.readyAt,
            plantTime: plot.plantTime,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const error = new Error(data.error || "Harvest failed");
          Object.assign(error, data);
          throw error;
        }

        console.log("✅ Harvest successful:", data);

        // Update state
        harvest(plotId);
        setHarvestedCount((prev) => prev + 1);
        setTotalPnL((prev) => prev + data.totalPayout);

        // Trigger floating text
        setHarvestAmounts((prev) => ({ ...prev, [plotId]: data.totalPayout }));
        setTimeout(() => {
          setHarvestAmounts((prev) => {
            const newAmounts = { ...prev };
            delete newAmounts[plotId];
            return newAmounts;
          });
        }, 2000);

        // Show result toast
        const messages = {
          Perfect: {
            title: "🏆 PERFECT HARVEST!",
            description: `💎 +${data.totalPayout.toFixed(2)} USDC • +100% BONUS!`,
          },
          Good: {
            title: "✨ Good Harvest!",
            description: `💰 +${data.totalPayout.toFixed(2)} USDC • +50% bonus`,
          },
          Late: {
            title: "😅 Late Harvest",
            description: `💸 +${data.totalPayout.toFixed(2)} USDC • No bonus`,
          },
        };

        const message =
          messages[data.tier as keyof typeof messages] || messages.Good;
        toast.success(message.title, {
          description: message.description,
          duration: data.tier === "Perfect" ? 5000 : 3000,
        });

        setTimeout(async () => {
          await refetchBarnBalance();
          await refetchPouchBalance();
        }, 2000);
      } catch (error: any) {
        console.error("❌ Harvest error:", error);

        const errorMessage =
          error.details || error.message || "Something went wrong";
        const actionHint = error.actionRequired
          ? `\n${error.actionRequired}`
          : "";

        toast.error("❌ Harvest Failed!", {
          description: `💔 ${errorMessage}${actionHint ? "\n💡 " + actionHint : ""}`,
          duration: 6000,
        });
      }
    },
    [account.address, plots, harvest, refetchBarnBalance, refetchPouchBalance]
  );

  // Update PnL when planting
  const trackPlantingCost = useCallback((plotCount: number) => {
    setTotalPnL((prev) => prev - 0.01 * plotCount);
  }, []);

  const stats: GameStats = {
    harvestedCount,
    totalPnL,
  };

  return {
    handleHarvestSingle,
    trackPlantingCost,
    harvestAmounts,
    stats,
  };
}
