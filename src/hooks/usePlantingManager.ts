/**
 * TapTato - Planting Manager Hook
 * Manages planting logic including batching and smart refill
 */

import { USDC, erc20Abi } from "@/lib/usdc";
import { useGameStore } from "@/store/gameStore";
import type { AccountAddresses } from "@/types";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { encodeFunctionData, parseUnits } from "viem";
import { useAccount } from "wagmi";

const SERVER_WALLET_ADDRESS =
  "0xfa468744EDFAa7e08b601b19b4be467c9F0B3BCA" as `0x${string}`;

interface PlantingManagerProps {
  accounts: AccountAddresses;
  barnBalance: any;
  pouchBalance: any;
  barnEthBalance: any;
  pouchEthBalance: any;
  isLoadingBalances: boolean;
  loadFieldPouch: (amount: bigint) => Promise<boolean>;
  refetchBarnBalance: () => Promise<any>;
  refetchPouchBalance: () => Promise<any>;
  onPlantingCost?: (cost: number) => void;
}

export function usePlantingManager({
  accounts,
  barnBalance,
  pouchBalance,
  barnEthBalance,
  pouchEthBalance,
  isLoadingBalances,
  loadFieldPouch,
  refetchBarnBalance,
  refetchPouchBalance,
  onPlantingCost,
}: PlantingManagerProps) {
  const account = useAccount();
  const { plots, startPlanting, plant, harvest } = useGameStore();

  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [plantSuccesses, setPlantSuccesses] = useState<Record<number, boolean>>(
    {}
  );

  const plantQueueRef = useRef<number[]>([]);
  const plantTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingBatchRef = useRef(false);
  const plantingTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Clear planting timeout for a specific plot
  const clearPlantingTimeout = useCallback((plotId: number) => {
    const timeout = plantingTimeoutsRef.current.get(plotId);
    if (timeout) {
      clearTimeout(timeout);
      plantingTimeoutsRef.current.delete(plotId);
    }
  }, []);

  // Start 25-second timeout for a plot
  const startPlantingTimeout = useCallback(
    (plotId: number) => {
      // Clear any existing timeout for this plot
      clearPlantingTimeout(plotId);

      // Start new 25-second timeout
      const timeout = setTimeout(() => {
        console.error(
          `⏱️ Planting timeout for plot ${plotId} - reverting to empty`
        );
        harvest(plotId);
        plantingTimeoutsRef.current.delete(plotId);

        toast.error("⏱️ Planting Timeout!", {
          description: `Plot ${plotId + 1} failed to plant - try again`,
          duration: 5000,
        });
      }, 25000); // 25 seconds

      plantingTimeoutsRef.current.set(plotId, timeout);
    },
    [clearPlantingTimeout, harvest]
  );

  // Execute plant for queued plots using wallet_sendCalls
  const executePlantBatch = useCallback(
    async (plotIds: number[]) => {
      if (!account.address || plotIds.length === 0) return;

      if (isLoadingBalances) {
        console.warn("⚠️ Balances still loading, requeuing transaction...");
        plotIds.forEach((id) => {
          if (!plantQueueRef.current.includes(id)) {
            plantQueueRef.current.push(id);
          }
        });
        setTimeout(() => {
          const queueToProcess = [...plantQueueRef.current];
          plantQueueRef.current = [];
          executePlantBatch(queueToProcess);
        }, 1000);
        return;
      }

      if (isProcessingBatchRef.current) {
        console.log("⚠️ Batch already in progress, requeuing plots");
        plotIds.forEach((id) => {
          if (!plantQueueRef.current.includes(id)) {
            plantQueueRef.current.push(id);
          }
        });
        if (!plantTimeoutRef.current) {
          plantTimeoutRef.current = setTimeout(() => {
            const queueToProcess = [...plantQueueRef.current];
            plantQueueRef.current = [];
            executePlantBatch(queueToProcess);
          }, 1000);
        }
        return;
      }

      isProcessingBatchRef.current = true;
      setIsProcessingBatch(true);

      try {
        console.log(
          "🌱 Batching",
          plotIds.length,
          "plants with wallet_sendCalls"
        );

        // Check if sender has enough balance
        const totalCost = 0.01 * plotIds.length;
        const requiredAmount = parseUnits(totalCost.toString(), USDC.decimals);

        const senderBalance =
          account.address === accounts.potatoBarn
            ? barnBalance?.value
            : pouchBalance?.value;

        if (
          senderBalance === undefined ||
          Number(senderBalance) < Number(requiredAmount)
        ) {
          const currentBalance = Number(senderBalance || 0n);
          const needed = Number(requiredAmount) - currentBalance;

          console.warn("⚠️ Field Pouch has insufficient balance!");

          const barnUSDC = Number(barnBalance?.value || 0n);

          if (barnUSDC >= needed) {
            console.log(
              "🚜 [SMART REFILL] Loading Field Pouch from Potato Barn..."
            );

            toast.info("🚜 Loading Field Pouch...", {
              description: `Smart Refill: Moving ${parseFloat((needed / 1e6).toFixed(2))} USDC from Barn`,
              duration: 3000,
            });

            const transferSuccess = await loadFieldPouch(BigInt(needed));

            if (!transferSuccess) {
              throw new Error(
                "Could not load Field Pouch. Please use the 'Load Pouch' button."
              );
            }

            toast.success("✅ Pouch Loaded!", {
              description: "Proceeding with planting...",
              duration: 2000,
            });
          } else {
            throw new Error(
              `💔 Not enough in the Barn! Need ${parseFloat((needed / 1e6).toFixed(2))} USDC more. Click 'Stock Up' to fill your Barn.`
            );
          }
        }

        toast.info(
          `🌱 Planting ${plotIds.length} Plot${plotIds.length > 1 ? "s" : ""}!`,
          {
            description: "⚡ Batching transactions...",
          }
        );

        // Import Base Account SDK
        const { createBaseAccountSDK } = await import("@base-org/account");
        const { baseSepolia } = await import("viem/chains");

        const sdk = createBaseAccountSDK({
          appName: "TapTato",
          appChainIds: [baseSepolia.id],
        });

        const provider = sdk.getProvider();

        // Verify current chain
        const currentChainId = await provider.request({
          method: "eth_chainId",
        });
        if (currentChainId !== `0x${baseSepolia.id.toString(16)}`) {
          throw new Error("Wrong network! Please connect to Base Sepolia.");
        }

        // Prepare batch calls
        const amountInWei = parseUnits("0.01", USDC.decimals);
        const calls = plotIds.map((plotId) => {
          const callData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [SERVER_WALLET_ADDRESS, amountInWei],
          });
          return { to: USDC.address, value: "0x0", data: callData };
        });

        // Send batch using wallet_sendCalls
        const callsId = await provider.request({
          method: "wallet_sendCalls",
          params: [
            {
              version: "2.0",
              from: account.address,
              chainId: `0x${baseSepolia.id.toString(16)}`,
              calls,
              capabilities: { atomicBatch: { supported: false } },
            },
          ],
        });

        console.log("✅ Batch sent:", callsId);

        // Update all plots and clear their timeouts
        plotIds.forEach((plotId) => {
          clearPlantingTimeout(plotId); // Clear the 25s timeout on success
          plant(plotId, account.address!);
          setPlantSuccesses((prev) => ({ ...prev, [plotId]: true }));
          setTimeout(() => {
            setPlantSuccesses((prev) => {
              const newSuccesses = { ...prev };
              delete newSuccesses[plotId];
              return newSuccesses;
            });
          }, 1000);
        });

        // Track planting cost
        if (onPlantingCost) {
          onPlantingCost(plotIds.length);
        }

        toast.success(
          `✨ ${plotIds.length} Plot${plotIds.length > 1 ? "s" : ""} Planted!`,
          {
            description: `💰 Spent ${(plotIds.length * 0.01).toFixed(2)} USDC • Seeds growing...`,
          }
        );

        setTimeout(async () => {
          await refetchBarnBalance();
          await refetchPouchBalance();
        }, 2000);
      } catch (error: any) {
        console.error("❌ Batch plant failed!", error);

        plotIds.forEach((plotId) => {
          clearPlantingTimeout(plotId); // Clear the 25s timeout on failure
          harvest(plotId);
        });

        let errorMessage = "💔 Transaction failed. ";
        if (error.message?.includes("gas")) {
          errorMessage += "Check console for details.";
        } else if (error.message?.includes("insufficient")) {
          errorMessage += "Insufficient balance?";
        } else {
          errorMessage += error.message?.slice(0, 100) || "Unknown error";
        }

        toast.error("❌ Planting Failed!", {
          description: errorMessage,
          duration: 5000,
        });
      } finally {
        isProcessingBatchRef.current = false;
        setIsProcessingBatch(false);
      }
    },
    [
      account.address,
      accounts.potatoBarn,
      barnBalance,
      pouchBalance,
      barnEthBalance,
      pouchEthBalance,
      isLoadingBalances,
      loadFieldPouch,
      plant,
      harvest,
      refetchBarnBalance,
      refetchPouchBalance,
      clearPlantingTimeout,
    ]
  );

  // Plant single plot with batching
  const handlePlantSingle = useCallback(
    (plotId: number) => {
      if (!account.address) {
        toast.error("🔌 Wallet Not Connected", {
          description: "Please connect your wallet first!",
        });
        return;
      }

      if (isLoadingBalances) {
        toast.info("⏳ Loading Balance...", {
          description: "Please wait while we fetch your balance",
          duration: 2000,
        });
        return;
      }

      startPlanting(plotId);
      startPlantingTimeout(plotId); // Start 25-second timeout

      if (!plantQueueRef.current.includes(plotId)) {
        plantQueueRef.current.push(plotId);
      }

      // Limit to 3 plots per batch
      if (plantQueueRef.current.length >= 3) {
        toast.info("⚡ Batch Ready!", {
          description: "🌱 Max 3 plots per batch - planting now!",
        });
        const queueToProcess = [...plantQueueRef.current];
        plantQueueRef.current = [];

        if (plantTimeoutRef.current) {
          clearTimeout(plantTimeoutRef.current);
        }

        executePlantBatch(queueToProcess);
        return;
      }

      if (plantTimeoutRef.current) {
        clearTimeout(plantTimeoutRef.current);
      }

      plantTimeoutRef.current = setTimeout(() => {
        const queueToProcess = [...plantQueueRef.current];
        plantQueueRef.current = [];
        executePlantBatch(queueToProcess);
      }, 500);
    },
    [
      account.address,
      startPlanting,
      executePlantBatch,
      isLoadingBalances,
      startPlantingTimeout,
    ]
  );

  return {
    handlePlantSingle,
    plantSuccesses,
    isProcessingBatch,
  };
}
