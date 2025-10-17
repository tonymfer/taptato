"use client";

import { PlotTile } from "@/components/PlotTile";
import { TutorialDialog } from "@/components/TutorialDialog";
import { Button } from "@/components/ui/button";
import { useFaucet } from "@/hooks/useFaucet";
import { useFaucetEligibility } from "@/hooks/useFaucetEligibility";
import { USDC, erc20Abi } from "@/lib/usdc";
import {
  calculateVisualState,
  getTimeUntilRipe,
  getTimeUntilRotten,
  useGameStore,
} from "@/store/gameStore";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { encodeFunctionData, parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useConnect,
  useConnections,
  useDisconnect,
  useWriteContract,
} from "wagmi";

// Server Wallet Address (CDP account that manages rewards)
const SERVER_WALLET_ADDRESS =
  "0xfa468744EDFAa7e08b601b19b4be467c9F0B3BCA" as `0x${string}`;

function App() {
  const account = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const connections = useConnections();
  const { writeContractAsync } = useWriteContract();

  // Get universal and sub accounts
  const [subAccount, universalAccount] = useMemo(() => {
    return connections.flatMap((connection) => connection.accounts);
  }, [connections]);

  // Get universal account balance
  const {
    data: universalBalance,
    refetch: refetchBalance,
    isLoading: isLoadingUniversalBalance,
  } = useBalance({
    address: universalAccount,
    token: USDC.address,
    query: {
      refetchInterval: false, // Don't auto-refetch, only on demand
      enabled: !!universalAccount,
    },
  });

  // Get sub account balance (for debugging)
  const {
    data: subAccountBalance,
    refetch: refetchSubBalance,
    isLoading: isLoadingSubBalance,
  } = useBalance({
    address: subAccount,
    token: USDC.address,
    query: {
      refetchInterval: false, // Don't auto-refetch, only on demand
      enabled: !!subAccount,
    },
  });

  // Get sub account ETH balance (for gas)
  const { data: subAccountEthBalance, isLoading: isLoadingSubEth } = useBalance(
    {
      address: subAccount,
      query: {
        refetchInterval: false,
        enabled: !!subAccount,
      },
    }
  );

  // Get universal account ETH balance
  const { data: universalEthBalance, isLoading: isLoadingUniversalEth } =
    useBalance({
      address: universalAccount,
      query: {
        refetchInterval: false,
        enabled: !!universalAccount,
      },
    });

  // Check if balances are still loading (only initial load, not refetching)
  const isLoadingBalances =
    isLoadingUniversalBalance ||
    isLoadingSubBalance ||
    isLoadingSubEth ||
    isLoadingUniversalEth;

  // Check faucet eligibility
  const faucetEligibility = useFaucetEligibility(universalBalance?.value);
  const faucetMutation = useFaucet();

  // Transfer state
  const [isTransferring, setIsTransferring] = useState(false);

  // Zustand game state
  const { plots, startPlanting, plant, harvest } = useGameStore();

  // Current time for visual states
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second for visual updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Plot selection
  const [selectedPlots, setSelectedPlots] = useState<number[]>([]);

  // Simple stats
  const [harvestedCount, setHarvestedCount] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0); // Track profit/loss
  const [isProcessingBatch, setIsProcessingBatch] = useState(false); // Prevent concurrent batches
  const [harvestAmounts, setHarvestAmounts] = useState<Record<number, number>>(
    {}
  );
  const [plantSuccesses, setPlantSuccesses] = useState<Record<number, boolean>>(
    {}
  );

  // Tutorial dialog
  const [showTutorial, setShowTutorial] = useState(false);

  // Use refs for batch queue to avoid closure issues
  const plantQueueRef = useRef<number[]>([]);
  const plantTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingBatchRef = useRef(false); // Use ref for real-time flag

  // Show tutorial on first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("taptato-tutorial-seen");
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  // Refetch balances when accounts change (e.g., after connecting wallet)
  useEffect(() => {
    if (universalAccount || subAccount) {
      console.log("🔄 Accounts detected, fetching initial balances...");
      refetchBalance();
      refetchSubBalance();
    }
  }, [universalAccount, subAccount, refetchBalance, refetchSubBalance]);

  const closeTutorial = useCallback(() => {
    localStorage.setItem("taptato-tutorial-seen", "true");
    setShowTutorial(false);
  }, []);

  // Handle plot selection
  const handleSelectPlot = useCallback((plotId: number) => {
    setSelectedPlots((prev) =>
      prev.includes(plotId)
        ? prev.filter((id) => id !== plotId)
        : [...prev, plotId]
    );
  }, []);

  // Transfer USDC from Universal to Sub account
  const transferToSubAccount = useCallback(
    async (amount: bigint) => {
      if (!subAccount || !universalAccount) {
        toast.error("❌ Account Error", {
          description: "Accounts not found",
        });
        return false;
      }

      try {
        setIsTransferring(true);
        console.log(
          `💸 Transferring ${amount} USDC from Universal to Sub account...`
        );

        // Use writeContractAsync to transfer USDC
        const hash = await writeContractAsync({
          address: USDC.address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [subAccount, amount],
          account: universalAccount, // Transfer from universal account
        });

        console.log("✅ Transfer successful:", hash);

        // Wait for blockchain confirmation before refetching balance
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Refetch balances
        await refetchBalance();
        await refetchSubBalance();
        console.log("💰 Balances updated after transfer");

        return true;
      } catch (error) {
        console.error("❌ Transfer failed:", error);
        toast.error("❌ Transfer Failed", {
          description: "Could not transfer USDC to sub account",
        });
        return false;
      } finally {
        setIsTransferring(false);
      }
    },
    [
      subAccount,
      universalAccount,
      writeContractAsync,
      refetchBalance,
      refetchSubBalance,
    ]
  );

  // Execute plant for queued plots using wallet_sendCalls (Base Account batching!)
  const executePlantBatch = useCallback(
    async (plotIds: number[]) => {
      if (!account.address || plotIds.length === 0) return;

      // 🔍 CRITICAL: Wait for balances to load before attempting transaction
      if (isLoadingBalances) {
        console.warn(
          "⚠️ [WARNING] Balances still loading, requeuing transaction..."
        );

        // Re-add to queue and retry after delay
        plotIds.forEach((id) => {
          if (!plantQueueRef.current.includes(id)) {
            plantQueueRef.current.push(id);
          }
        });

        // Retry after balance loads
        setTimeout(() => {
          const queueToProcess = [...plantQueueRef.current];
          plantQueueRef.current = [];
          executePlantBatch(queueToProcess);
        }, 1000);
        return;
      }

      // 🔍 DEBUG: Check if batch is already processing using ref
      console.log(
        "🔍 [DEBUG] isProcessingBatchRef.current:",
        isProcessingBatchRef.current
      );
      if (isProcessingBatchRef.current) {
        console.log(
          "⚠️ [DEBUG] Batch already in progress, requeuing plots for next batch"
        );

        // Re-add these plots back to the queue for the next batch
        plotIds.forEach((id) => {
          if (!plantQueueRef.current.includes(id)) {
            plantQueueRef.current.push(id);
          }
        });
        console.log(
          "🔍 [DEBUG] Plots requeued:",
          plotIds,
          "New queue:",
          plantQueueRef.current
        );

        // Set a timer to process the queue again after current batch completes
        if (!plantTimeoutRef.current) {
          plantTimeoutRef.current = setTimeout(() => {
            const queueToProcess = [...plantQueueRef.current];
            plantQueueRef.current = []; // Clear queue before processing
            console.log(
              "🔍 [DEBUG] Retry timer: processing queue:",
              queueToProcess
            );
            executePlantBatch(queueToProcess);
          }, 1000); // Wait 1 second before retrying
        }
        return;
      }

      // 🔒 Set processing flag using ref (real-time, no closure issues)
      isProcessingBatchRef.current = true;
      setIsProcessingBatch(true); // Also update state for UI
      console.log("🔒 [DEBUG] Batch locked, isProcessingBatchRef set to true");

      try {
        console.log(
          "🌱 Batching",
          plotIds.length,
          "plants with wallet_sendCalls"
        );

        // 🔍 DEBUG: Log current plot states
        plotIds.forEach((id) => {
          const plot = plots[id];
          console.log(`🔍 [DEBUG] Plot ${id} state:`, {
            state: plot.state,
            isLoading: plot.isLoading,
            plantTime: plot.plantTime,
            readyAt: plot.readyAt,
          });
        });

        // 🔍 CRITICAL DEBUG: Environment and account verification
        console.log("=".repeat(50));
        console.log("🔍 [CRITICAL] Environment Check:");
        console.log(`  - Account Address (from TX): ${account.address}`);
        console.log(`  - Sub Account: ${subAccount}`);
        console.log(`  - Universal Account: ${universalAccount}`);
        console.log(`  - USDC Contract: ${USDC.address}`);
        console.log(`  - Server Wallet: ${SERVER_WALLET_ADDRESS}`);
        console.log(`  - USDC Decimals: ${USDC.decimals}`);
        console.log(`  - Balances Loading: ${isLoadingBalances}`);
        console.log("=".repeat(50));

        // 🔍 CRITICAL: Check BOTH account balances
        const totalCost = 0.01 * plotIds.length;
        console.log("🔍 [CRITICAL] Balance Check:");
        console.log(
          `  - Universal Account Balance: ${universalBalance?.formatted || "N/A"} USDC (raw: ${universalBalance?.value?.toString() || "N/A"})`
        );
        console.log(
          `  - Universal Account ETH: ${universalEthBalance?.formatted || "N/A"} ETH`
        );
        console.log(
          `  - Sub Account Balance: ${subAccountBalance?.formatted || "N/A"} USDC (raw: ${subAccountBalance?.value?.toString() || "N/A"})`
        );
        console.log(
          `  - Sub Account ETH: ${subAccountEthBalance?.formatted || "N/A"} ETH (for gas)`
        );
        console.log(`  - Transaction cost: ${totalCost} USDC`);
        console.log(
          `  - Paymaster URL configured: ${!!process.env.NEXT_PUBLIC_PAYMASTER_SERVICE_URL}`
        );
        console.log(
          `  - Universal has enough: ${
            parseFloat(universalBalance?.formatted || "0") >= totalCost
          }`
        );
        console.log(
          `  - Sub Account has enough: ${
            parseFloat(subAccountBalance?.formatted || "0") >= totalCost
          }`
        );

        // 🔍 CRITICAL: Verify the FROM account (account.address) has balance
        // account.address should match either subAccount or universalAccount
        console.log("=".repeat(50));
        console.log("🔍 [CRITICAL] Account Address Analysis:");
        console.log(`  - TX will be from: ${account.address}`);
        console.log(`  - Is Sub Account? ${account.address === subAccount}`);
        console.log(
          `  - Is Universal Account? ${account.address === universalAccount}`
        );

        // The account that will send the TX needs to have the balance
        const senderBalance =
          account.address === universalAccount
            ? universalBalance?.value
            : subAccountBalance?.value;

        console.log(
          `  - Sender's USDC balance: ${senderBalance?.toString() || "0"}`
        );

        const senderEthBalance =
          account.address === universalAccount
            ? universalEthBalance?.value
            : subAccountEthBalance?.value;
        console.log(
          `  - Sender's ETH balance: ${senderEthBalance?.toString() || "0"} (${parseFloat((Number(senderEthBalance || 0n) / 1e18).toFixed(6))} ETH)`
        );
        console.log("=".repeat(50));

        // 🔍 CRITICAL: Check if Paymaster is configured
        if (!process.env.NEXT_PUBLIC_PAYMASTER_SERVICE_URL) {
          console.warn(
            "⚠️ [WARNING] No Paymaster configured! Gas must be paid by sender account."
          );
          console.warn(
            `  - Sender needs ETH for gas. Current: ${parseFloat((Number(senderEthBalance || 0n) / 1e18).toFixed(6))} ETH`
          );

          if (!senderEthBalance || senderEthBalance === 0n) {
            console.error("❌ [CRITICAL] No Paymaster AND no ETH for gas!");
            throw new Error(
              `No gas sponsorship configured and sender account has 0 ETH. Either:\n` +
                `1. Set NEXT_PUBLIC_PAYMASTER_SERVICE_URL in Vercel environment variables, OR\n` +
                `2. Send ETH to ${account.address} for gas fees`
            );
          }
        }

        // 🔍 CRITICAL: Check if sender (sub account) has enough balance
        const requiredAmount = parseUnits(totalCost.toString(), USDC.decimals);

        if (
          senderBalance === undefined ||
          Number(senderBalance) < Number(requiredAmount)
        ) {
          const currentBalance = Number(senderBalance || 0n);
          const needed = Number(requiredAmount) - currentBalance;

          console.warn("⚠️ [WARNING] Sub account has insufficient balance!");
          console.warn(
            `  - Current: ${currentBalance} (${parseFloat((currentBalance / 1e6).toFixed(6))} USDC)`
          );
          console.warn(
            `  - Needed: ${needed} (${parseFloat((needed / 1e6).toFixed(6))} USDC)`
          );

          // 🔍 Check if Universal account has enough
          const universalUSDC = Number(universalBalance?.value || 0n);
          console.log(
            `  - Universal Account has: ${universalUSDC} (${parseFloat((universalUSDC / 1e6).toFixed(6))} USDC)`
          );

          if (universalUSDC >= needed) {
            console.log(
              "💸 [AUTO-TRANSFER] Transferring USDC from Universal to Sub account..."
            );

            toast.info("💸 Transferring USDC...", {
              description: `Moving ${parseFloat((needed / 1e6).toFixed(2))} USDC to sub account`,
              duration: 3000,
            });

            // Transfer from Universal to Sub
            const transferSuccess = await transferToSubAccount(BigInt(needed));

            if (!transferSuccess) {
              console.error("❌ [CRITICAL] Auto-transfer failed!");
              throw new Error(
                `Could not transfer USDC to sub account. Please use the Fund button.`
              );
            }

            console.log(
              "✅ [AUTO-TRANSFER] Transfer successful! Proceeding with plant..."
            );
            toast.success("✅ Transfer Complete!", {
              description: "Proceeding with planting...",
              duration: 2000,
            });

            // Balance was already updated in transferToSubAccount
            // Just verify it's reflected
            console.log(
              `💰 Sub account balance after auto-transfer: ${subAccountBalance?.formatted}`
            );
          } else {
            console.error(
              "❌ [CRITICAL] Not enough USDC in Universal account!"
            );
            console.error(
              `  - Universal has: ${universalUSDC} (${parseFloat((universalUSDC / 1e6).toFixed(6))} USDC)`
            );
            console.error(
              `  - Needed: ${needed} (${parseFloat((needed / 1e6).toFixed(6))} USDC)`
            );

            throw new Error(
              `Insufficient USDC. Need ${parseFloat((needed / 1e6).toFixed(2))} USDC more. Please use the Fund button to get USDC.`
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

        console.log("🔍 [DEBUG] Base Sepolia Chain ID:", baseSepolia.id);
        console.log(
          "🔍 [DEBUG] Base Sepolia Chain ID (hex):",
          `0x${baseSepolia.id.toString(16)}`
        );

        const sdk = createBaseAccountSDK({
          appName: "TapTato",
          appChainIds: [baseSepolia.id],
        });

        const provider = sdk.getProvider();
        console.log("🔍 [DEBUG] Provider obtained from SDK");

        // 🔍 CRITICAL: Verify current chain
        try {
          const currentChainId = await provider.request({
            method: "eth_chainId",
          });
          console.log(
            "🔍 [CRITICAL] Current connected chain ID:",
            currentChainId
          );
          console.log(
            "🔍 [CRITICAL] Expected chain ID:",
            `0x${baseSepolia.id.toString(16)}`
          );

          if (currentChainId !== `0x${baseSepolia.id.toString(16)}`) {
            console.error("❌ [CRITICAL] Chain ID mismatch!");
            console.error(`  - Connected to: ${currentChainId}`);
            console.error(
              `  - Expected: 0x${baseSepolia.id.toString(16)} (Base Sepolia)`
            );
            throw new Error(
              `Wrong network! Please connect to Base Sepolia. Currently on chain: ${currentChainId}`
            );
          }
        } catch (chainError) {
          console.error("❌ [CRITICAL] Chain verification failed:", chainError);
          throw chainError;
        }

        // Prepare batch calls - one transfer per plot
        const amountInWei = parseUnits("0.01", USDC.decimals);
        console.log(
          "🔍 [DEBUG] Transfer amount (wei):",
          amountInWei.toString()
        );

        const calls = plotIds.map((plotId) => {
          const callData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [SERVER_WALLET_ADDRESS, amountInWei],
          });
          console.log(`🔍 [DEBUG] Preparing call for plot ${plotId}:`, {
            to: USDC.address,
            value: "0x0",
            dataPreview: callData.slice(0, 20) + "...",
            fullDataLength: callData.length,
          });
          return {
            to: USDC.address,
            value: "0x0",
            data: callData,
          };
        });

        console.log("=".repeat(50));
        console.log("🔍 [CRITICAL] wallet_sendCalls params:");
        console.log(
          JSON.stringify(
            {
              version: "2.0",
              from: account.address,
              chainId: `0x${baseSepolia.id.toString(16)}`,
              callsCount: calls.length,
              firstCallTo: calls[0]?.to,
              capabilities: {
                atomicBatch: {
                  supported: false,
                },
              },
            },
            null,
            2
          )
        );
        console.log("=".repeat(50));

        // Send batch using wallet_sendCalls (EIP-5792)
        const callsId = await provider.request({
          method: "wallet_sendCalls",
          params: [
            {
              version: "2.0",
              from: account.address,
              chainId: `0x${baseSepolia.id.toString(16)}`, // Base Sepolia chain ID in hex
              calls,
              capabilities: {
                atomicBatch: {
                  supported: false, // Allow partial success
                },
              },
            },
          ],
        });

        console.log(
          "🔍 [DEBUG] wallet_sendCalls successful, callsId:",
          callsId
        );

        console.log("✅ Batch sent:", callsId);

        // Update all plots in Zustand
        plotIds.forEach((plotId) => {
          plant(plotId, account.address!);

          // Trigger floating text for each plot
          setPlantSuccesses((prev) => ({
            ...prev,
            [plotId]: true,
          }));

          // Clear after animation
          setTimeout(() => {
            setPlantSuccesses((prev) => {
              const newSuccesses = { ...prev };
              delete newSuccesses[plotId];
              return newSuccesses;
            });
          }, 1000);
        });

        // Track PnL
        setTotalPnL((prev) => prev - 0.01 * plotIds.length);

        toast.success(
          `✨ ${plotIds.length} Plot${plotIds.length > 1 ? "s" : ""} Planted!`,
          {
            description: `💰 Spent ${(plotIds.length * 0.01).toFixed(2)} USDC • Seeds growing...`,
          }
        );

        // Wait for blockchain confirmation before refetching balance
        setTimeout(async () => {
          await refetchBalance();
          await refetchSubBalance();
          console.log("💰 Balance updated after plant");
        }, 2000);
      } catch (error: any) {
        console.error("=".repeat(50));
        console.error("❌ [CRITICAL] Batch plant failed!");
        console.error("Error object:", error);
        console.error("Error details:", {
          name: error.name,
          code: error.code,
          message: error.message,
          data: error.data,
          stack: error.stack?.split("\n").slice(0, 5),
        });
        console.error("🔍 [DEBUG] Failed plot IDs:", plotIds);
        console.error("🔍 [DEBUG] Account state:", {
          address: account.address,
          subAccount: subAccount,
          universalAccount: universalAccount,
          universalUSDC: universalBalance?.formatted,
          universalUSDCRaw: universalBalance?.value?.toString(),
          universalETH: universalEthBalance?.formatted,
          subAccountUSDC: subAccountBalance?.formatted,
          subAccountUSDCRaw: subAccountBalance?.value?.toString(),
          subAccountETH: subAccountEthBalance?.formatted,
          paymasterConfigured: !!process.env.NEXT_PUBLIC_PAYMASTER_SERVICE_URL,
        });
        console.error("🔍 [DEBUG] Transaction params:", {
          usdcContract: USDC.address,
          serverWallet: SERVER_WALLET_ADDRESS,
          plotCount: plotIds.length,
          totalCost: `${0.01 * plotIds.length} USDC`,
        });
        console.error("=".repeat(50));

        // Reset ALL failed plots to empty state
        plotIds.forEach((plotId) => {
          // Force reset to empty (clears loading, plantTime, readyAt)
          console.log(`🔍 [DEBUG] Resetting plot ${plotId} to empty`);
          harvest(plotId);
        });

        // Show more specific error message
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
        console.log("🔍 [DEBUG] Finally block: Releasing batch lock");
        isProcessingBatchRef.current = false; // Release ref flag
        setIsProcessingBatch(false);
        console.log("🔍 [DEBUG] isProcessingBatchRef and state set to false");
      }
    },
    [
      account.address,
      plant,
      harvest,
      refetchBalance,
      refetchSubBalance,
      plots,
      universalBalance,
      subAccountBalance,
      universalAccount,
      subAccount,
      universalEthBalance,
      subAccountEthBalance,
      isLoadingBalances,
      transferToSubAccount,
    ]
  );

  // Plant single plot with debouncing and batching
  const handlePlantSingle = useCallback(
    (plotId: number) => {
      console.log(`🔍 [DEBUG] handlePlantSingle called for plot ${plotId}`);

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

      // ✅ Allow continuous clicking - don't block based on processing state
      // The executePlantBatch will handle concurrent execution prevention

      // Immediate visual feedback: Show seed (loading)
      startPlanting(plotId);

      // Add to queue (using ref to avoid closure issues)
      if (!plantQueueRef.current.includes(plotId)) {
        plantQueueRef.current.push(plotId);
        console.log(
          `🔍 [DEBUG] Added plot ${plotId} to queue. Queue:`,
          plantQueueRef.current
        );
      } else {
        console.log(`⚠️ [DEBUG] Plot ${plotId} already in queue`);
      }

      // Limit to 3 plots per batch (to avoid "replacement underpriced" error)
      if (plantQueueRef.current.length >= 3) {
        console.log("🔍 [DEBUG] Queue full (3 plots), executing immediately");
        toast.info("⚡ Batch Ready!", {
          description: "🌱 Max 3 plots per batch - planting now!",
        });
        const queueToProcess = [...plantQueueRef.current];
        plantQueueRef.current = []; // Clear queue

        // Clear timeout
        if (plantTimeoutRef.current) {
          clearTimeout(plantTimeoutRef.current);
          console.log("🔍 [DEBUG] Cleared existing timeout");
        }

        executePlantBatch(queueToProcess);
        return;
      }

      // Clear existing timeout
      if (plantTimeoutRef.current) {
        clearTimeout(plantTimeoutRef.current);
        console.log(
          "🔍 [DEBUG] Cleared existing timeout, setting new 500ms timer"
        );
      }

      // Set new timeout to execute batch after 500ms (longer to allow multiple clicks)
      plantTimeoutRef.current = setTimeout(() => {
        const queueToProcess = [...plantQueueRef.current];
        console.log(
          `🔍 [DEBUG] Timer expired, executing batch with ${queueToProcess.length} plots:`,
          queueToProcess
        );
        plantQueueRef.current = []; // Clear queue
        executePlantBatch(queueToProcess);
      }, 500);
    },
    [account.address, startPlanting, executePlantBatch, isLoadingBalances]
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

      const startTime = Date.now();

      try {
        console.log("🥔 Harvesting plot", plotId);

        // Call harvest API
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
          throw new Error(data.error || "Harvest failed");
        }

        console.log("✅ Harvest successful:", data);

        // Update Zustand
        harvest(plotId);

        // Track stats
        setHarvestedCount((prev) => prev + 1);
        setTotalPnL((prev) => prev + data.totalPayout);

        // Trigger floating text on plot
        setHarvestAmounts((prev) => ({
          ...prev,
          [plotId]: data.totalPayout,
        }));

        // Clear harvest amount after animation
        setTimeout(() => {
          setHarvestAmounts((prev) => {
            const newAmounts = { ...prev };
            delete newAmounts[plotId];
            return newAmounts;
          });
        }, 2000);

        // Show result toast with tier-specific styling
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

        // Wait for blockchain confirmation before refetching balance
        setTimeout(async () => {
          await refetchBalance();
          await refetchSubBalance();
          console.log("💰 Balance updated after harvest");
        }, 2000);
      } catch (error: any) {
        console.error("❌ Harvest error:", error);
        console.error("❌ Harvest error details:", {
          message: error.message,
          details: error.details,
          actionRequired: error.actionRequired,
          originalError: error.originalError,
          debugInfo: error.debugInfo,
        });

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
    [account.address, plots, harvest, refetchBalance, refetchSubBalance]
  );

  // Batch plant
  const handlePlantBatch = useCallback(() => {
    const emptyPlots = selectedPlots.filter(
      (id) => plots[id].state === "empty"
    );
    if (emptyPlots.length === 0) return;

    toast.info(`🌱 Batch Planting ${emptyPlots.length} Plots...`, {
      description: "⏳ Preparing seeds...",
    });
    emptyPlots.forEach(handlePlantSingle);
    setSelectedPlots([]);
  }, [selectedPlots, plots, handlePlantSingle]);

  // Batch harvest
  const handleHarvestBatch = useCallback(() => {
    const visualStates = plots.map((p) => calculateVisualState(p, currentTime));
    const ripePlots = selectedPlots.filter((id) => visualStates[id] === "ripe");
    if (ripePlots.length === 0) return;

    toast.info(`🥔 Batch Harvesting ${ripePlots.length} Plots...`, {
      description: "⏳ Collecting potatoes...",
    });
    ripePlots.forEach(handleHarvestSingle);
    setSelectedPlots([]);
  }, [selectedPlots, plots, currentTime, handleHarvestSingle]);

  // Fund account - Get USDC from faucet and transfer to Sub
  const handleFundAccount = useCallback(async () => {
    if (!universalAccount || !subAccount) {
      toast.error("❌ Account Error", {
        description: "Accounts not found",
      });
      return;
    }

    // Check if Universal account already has USDC to transfer
    const universalUSDC = Number(universalBalance?.value || 0n);

    if (universalUSDC > 0) {
      // Just transfer from Universal to Sub
      const transferToastId = toast.loading("💸 Transferring USDC...", {
        description: "Moving USDC from universal to sub account...",
      });

      const success = await transferToSubAccount(universalBalance!.value);

      toast.dismiss(transferToastId);
      if (success) {
        toast.success("✨ Transfer Complete!", {
          description: `💰 ${parseFloat((universalUSDC / 1e6).toFixed(2))} USDC transferred to sub account!`,
          duration: 4000,
        });
      }
      return;
    }

    // Need to get USDC from faucet first
    if (!faucetEligibility.isEligible) {
      toast.error("⛔ Faucet Not Available", {
        description: faucetEligibility.reason,
        duration: 4000,
      });
      return;
    }

    const fundingToastId = toast.loading("💰 Requesting USDC...", {
      description: "⏳ Step 1/2: Getting USDC from faucet...",
    });

    faucetMutation.mutate(
      { address: universalAccount },
      {
        onSuccess: async () => {
          toast.loading("💸 Transferring to Sub Account...", {
            id: fundingToastId,
            description: "⏳ Step 2/2: Moving USDC to your sub account...",
          });

          // Wait for faucet transaction to settle
          await new Promise((resolve) => setTimeout(resolve, 4000));
          await refetchBalance();

          // Refetch again to get updated balance
          const balanceResult = await refetchBalance();
          const universalUSDC = balanceResult.data?.value || 0n;

          console.log(`💰 Universal balance after faucet: ${universalUSDC}`);

          // Transfer all USDC from Universal to Sub
          if (universalUSDC > 0n) {
            const success = await transferToSubAccount(universalUSDC);

            toast.dismiss(fundingToastId);
            if (success) {
              toast.success("✨ Account Funded!", {
                description: `💰 ${parseFloat((Number(universalUSDC) / 1e6).toFixed(2))} USDC transferred to sub account! Start planting!`,
                duration: 4000,
              });
            }
          } else {
            toast.dismiss(fundingToastId);
            toast.success("✨ USDC Received!", {
              description: "💰 Waiting for confirmation...",
              duration: 4000,
            });

            // Try refetching one more time after a delay
            setTimeout(async () => {
              await refetchBalance();
              await refetchSubBalance();
            }, 3000);
          }
        },
        onError: (error) => {
          toast.dismiss(fundingToastId);
          toast.error("❌ Funding Failed", {
            description: `💔 ${error instanceof Error ? error.message : "Try again later"}`,
            duration: 5000,
          });
        },
      }
    );
  }, [
    universalAccount,
    subAccount,
    faucetMutation,
    faucetEligibility,
    refetchBalance,
    refetchSubBalance,
    universalBalance,
    transferToSubAccount,
  ]);

  // Prepare plot data with visual states
  const plotData = plots.map((plot) => ({
    id: plot.id,
    state: calculateVisualState(plot, currentTime),
    timeUntilRipe: getTimeUntilRipe(plot, currentTime),
    timeUntilRotten: getTimeUntilRotten(plot, currentTime),
    isPlanting: plot.isLoading,
    harvestAmount: harvestAmounts[plot.id],
    plantSuccess: plantSuccesses[plot.id],
  }));

  // Debug: Log plot count
  console.log(
    "Total plots:",
    plots.length,
    "PlotData length:",
    plotData.length
  );

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Tutorial Dialog */}
      <TutorialDialog open={showTutorial} onClose={closeTutorial} />

      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          {/* Left: Title + Help */}
          <div className="flex items-center gap-4">
            <h1 className="font-pixel-title text-2xl text-amber-400 drop-shadow-lg flex items-center gap-2">
              <Image
                src="/potato.png"
                alt="Potato"
                width={32}
                height={32}
                className="pixelated"
              />
              TapTato
            </h1>
            {/* Help Button */}
            <button
              onClick={() => setShowTutorial(true)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Show tutorial"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
                className="pixelated"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          </div>

          {/* Right: Wallet */}
          <nav className="flex items-center gap-2">
            {account.status === "connected" ? (
              <>
                <div className="font-pixel-body text-sm text-green-400">
                  {isLoadingBalances ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    `${subAccountBalance?.formatted.slice(0, 6) || "0"} USDC`
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleFundAccount}
                  size="sm"
                  disabled={
                    faucetMutation.isPending ||
                    isLoadingBalances ||
                    isTransferring ||
                    // Disable only if: no USDC in universal AND faucet not eligible
                    (!(Number(universalBalance?.value || 0n) > 0) &&
                      !faucetEligibility.isEligible)
                  }
                  className="font-pixel-small bg-green-700 hover:bg-green-600 text-white border-green-600"
                  title={
                    Number(universalBalance?.value || 0n) > 0
                      ? "Transfer USDC from Universal to Sub account"
                      : faucetEligibility.isEligible
                        ? "Get USDC from faucet"
                        : faucetEligibility.reason
                  }
                >
                  {faucetMutation.isPending || isTransferring
                    ? "Funding..."
                    : Number(universalBalance?.value || 0n) > 0
                      ? "Transfer"
                      : "Fund"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => disconnect()}
                  size="sm"
                  className="font-pixel-small bg-red-700 hover:bg-red-600 text-white border-red-600"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={() => connect({ connector: connectors[0] })}
                size="sm"
                className="font-pixel-body bg-green-600 hover:bg-green-500 text-white"
              >
                Connect Wallet
              </Button>
            )}
          </nav>
        </div>

        {account.status === "connected" && (
          <>
            {/* Farm Container with field.png background */}
            <div
              className="relative mx-auto pixelated"
              style={{
                width: "651px",
                height: "870px",
                backgroundImage: "url(/field.png)",
                backgroundSize: "651px 870px",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              {/* Plot Grid positioned inside field - 3 cols x 4 rows = 12 plots */}
              <div
                className="absolute grid grid-cols-3 grid-rows-4"
                style={{
                  top: "65px",
                  left: "58px",
                  gap: "30px",
                  width: "535px",
                  height: "720px",
                }}
              >
                {plotData.slice(0, 12).map((plot) => (
                  <div
                    key={plot.id}
                    className="w-full h-full"
                    style={{
                      width: "170px",
                      height: "170px",
                    }}
                  >
                    <PlotTile
                      plotId={plot.id}
                      {...plot}
                      onSelect={handleSelectPlot}
                      onPlant={handlePlantSingle}
                      onHarvest={handleHarvestSingle}
                      isSelected={selectedPlots.includes(plot.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Batch Actions (if any selected) */}
            {selectedPlots.length > 0 && (
              <div className="flex gap-2 justify-center">
                {selectedPlots.filter((id) => plotData[id].state === "empty")
                  .length > 0 && (
                  <Button
                    onClick={handlePlantBatch}
                    className="font-pixel-body bg-green-600"
                  >
                    🌱 Plant Selected (
                    {
                      selectedPlots.filter(
                        (id) => plotData[id].state === "empty"
                      ).length
                    }
                    )
                  </Button>
                )}
                {selectedPlots.filter((id) => plotData[id].state === "ripe")
                  .length > 0 && (
                  <Button
                    onClick={handleHarvestBatch}
                    className="font-pixel-body bg-amber-600"
                  >
                    🥔 Harvest Selected (
                    {
                      selectedPlots.filter(
                        (id) => plotData[id].state === "ripe"
                      ).length
                    }
                    )
                  </Button>
                )}
              </div>
            )}

            {/* Simple Stats Bar */}
            <div className="flex items-center justify-center gap-12 p-6 bg-gradient-to-b from-stone-900/90 to-stone-950/95 backdrop-blur-sm rounded-2xl shadow-2xl">
              {/* Balance Card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl blur-xl group-hover:blur-2xl transition-all"></div>
                <div className="relative text-center p-4 bg-stone-800/50 rounded-xl min-w-[200px]">
                  <div className="font-pixel-body text-xs mb-2 text-green-300/70 uppercase tracking-wider">
                    💰 Balance
                  </div>
                  <div className="font-pixel-metrics text-4xl font-bold text-green-400 mb-2">
                    {isLoadingBalances ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `$${subAccountBalance?.formatted.slice(0, 6) || "0"}`
                    )}
                  </div>
                  <div className="font-pixel-body text-sm">
                    <span
                      className={`font-bold px-2 py-1 rounded ${
                        totalPnL >= 0
                          ? "text-green-400 bg-green-500/10"
                          : "text-red-400 bg-red-500/10"
                      }`}
                    >
                      {totalPnL >= 0 ? "+" : ""}
                      {totalPnL.toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-24 w-px bg-gradient-to-b from-transparent via-amber-600/30 to-transparent"></div>

              {/* Harvested Card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-xl blur-xl group-hover:blur-2xl transition-all"></div>
                <div className="relative text-center p-4 bg-stone-800/50 rounded-xl min-w-[200px]">
                  <div className="font-pixel-body text-xs mb-2 text-amber-300/70 uppercase tracking-wider">
                    🌾 Harvested
                  </div>
                  <div className="font-pixel-metrics text-4xl font-bold flex items-center justify-center gap-3 text-amber-400">
                    <Image
                      src="/potato.png"
                      alt="Potato"
                      width={40}
                      height={40}
                      className="pixelated drop-shadow-lg"
                    />
                    {harvestedCount}
                  </div>
                  <div className="font-pixel-body text-xs mt-2 text-amber-300/50">
                    Total Potatoes
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default App;
