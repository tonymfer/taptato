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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { encodeFunctionData, parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useConnect,
  useConnections,
  useDisconnect,
} from "wagmi";

// Server Wallet Address (CDP account that manages rewards)
const SERVER_WALLET_ADDRESS =
  "0xfa468744EDFAa7e08b601b19b4be467c9F0B3BCA" as `0x${string}`;

function App() {
  const account = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const connections = useConnections();

  // Get universal and sub accounts
  const [_subAccount, universalAccount] = useMemo(() => {
    return connections.flatMap((connection) => connection.accounts);
  }, [connections]);

  // Get universal account balance
  const { data: universalBalance, refetch: refetchBalance } = useBalance({
    address: universalAccount,
    token: USDC.address,
    query: {
      refetchInterval: 2000,
      enabled: !!universalAccount,
    },
  });

  // Check faucet eligibility
  const faucetEligibility = useFaucetEligibility(universalBalance?.value);
  const faucetMutation = useFaucet();

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

  // Show tutorial on first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("taptato-tutorial-seen");
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

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

  // Execute plant for queued plots using wallet_sendCalls (Base Account batching!)
  const executePlantBatch = useCallback(
    async (plotIds: number[]) => {
      if (!account.address || plotIds.length === 0) return;

      try {
        console.log(
          "🌱 Batching",
          plotIds.length,
          "plants with wallet_sendCalls"
        );

        toast.info(`Planting ${plotIds.length} plots!`, {
          description: "Batching transactions...",
        });

        // Import Base Account SDK
        const { createBaseAccountSDK } = await import("@base-org/account");
        const { baseSepolia } = await import("viem/chains");

        const sdk = createBaseAccountSDK({
          appName: "TapTato",
          appChainIds: [baseSepolia.id],
        });

        const provider = sdk.getProvider();

        // Prepare batch calls - one transfer per plot
        const calls = plotIds.map(() => ({
          to: USDC.address,
          value: "0x0",
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [SERVER_WALLET_ADDRESS, parseUnits("0.01", USDC.decimals)],
          }),
        }));

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

        toast.success(`Planted ${plotIds.length} plots!`, {
          description: `${(plotIds.length * 0.01).toFixed(2)} USDC sent`,
        });

        refetchBalance();
      } catch (error: any) {
        console.error("❌ Batch plant failed:", error);

        // Reset ALL failed plots to empty state
        plotIds.forEach((plotId) => {
          // Force reset to empty (clears loading, plantTime, readyAt)
          harvest(plotId);
        });

        toast.error("Batch plant failed", {
          description: `${plotIds.length} plots reset. Try fewer at once (max 3).`,
          duration: 5000,
        });
      } finally {
        setIsProcessingBatch(false);
      }
    },
    [account.address, plant, harvest, refetchBalance, isProcessingBatch]
  );

  // Plant single plot with debouncing and batching
  const handlePlantSingle = useCallback(
    (plotId: number) => {
      if (!account.address) {
        toast.error("Wallet not connected");
        return;
      }

      if (isProcessingBatch) {
        toast.info("Batch in progress, please wait...");
        return;
      }

      // Immediate visual feedback: Show seed (loading)
      startPlanting(plotId);

      // Add to queue (using ref to avoid closure issues)
      if (!plantQueueRef.current.includes(plotId)) {
        plantQueueRef.current.push(plotId);
      }

      // Limit to 3 plots per batch (to avoid "replacement underpriced" error)
      if (plantQueueRef.current.length >= 3) {
        toast.info("Max 3 plots per batch - executing now!");
        const queueToProcess = [...plantQueueRef.current];
        plantQueueRef.current = []; // Clear queue

        // Clear timeout
        if (plantTimeoutRef.current) {
          clearTimeout(plantTimeoutRef.current);
        }

        executePlantBatch(queueToProcess);
        return;
      }

      // Clear existing timeout
      if (plantTimeoutRef.current) {
        clearTimeout(plantTimeoutRef.current);
      }

      // Set new timeout to execute batch after 500ms (longer to allow multiple clicks)
      plantTimeoutRef.current = setTimeout(() => {
        const queueToProcess = [...plantQueueRef.current];
        plantQueueRef.current = []; // Clear queue
        executePlantBatch(queueToProcess);
      }, 500);
    },
    [account.address, startPlanting, executePlantBatch, isProcessingBatch]
  );

  // Harvest single plot
  const handleHarvestSingle = useCallback(
    async (plotId: number) => {
      if (!account.address) {
        toast.error("Wallet not connected");
        return;
      }

      const plot = plots[plotId];
      if (!plot.readyAt || !plot.plantTime) {
        toast.error("Plot not planted");
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

        // Show result toast
        const messages = {
          Perfect: "🥔 Perfect! +100% bonus",
          Good: "👍 Good! +50% bonus",
          Late: "😞 Too late... 0% bonus",
        };

        toast.success(
          messages[data.tier as keyof typeof messages] || "Harvested!",
          {
            description: `+${data.totalPayout.toFixed(2)} USDC`,
          }
        );

        refetchBalance();
      } catch (error: any) {
        console.error("❌ Harvest error:", error);
        toast.error("Harvest failed", {
          description: error.message,
        });
      }
    },
    [account.address, plots, harvest, refetchBalance]
  );

  // Batch plant
  const handlePlantBatch = useCallback(() => {
    const emptyPlots = selectedPlots.filter(
      (id) => plots[id].state === "empty"
    );
    if (emptyPlots.length === 0) return;

    toast.info(`Planting ${emptyPlots.length} plots...`);
    emptyPlots.forEach(handlePlantSingle);
    setSelectedPlots([]);
  }, [selectedPlots, plots, handlePlantSingle]);

  // Batch harvest
  const handleHarvestBatch = useCallback(() => {
    const visualStates = plots.map((p) => calculateVisualState(p, currentTime));
    const ripePlots = selectedPlots.filter((id) => visualStates[id] === "ripe");
    if (ripePlots.length === 0) return;

    toast.info(`Harvesting ${ripePlots.length} plots...`);
    ripePlots.forEach(handleHarvestSingle);
    setSelectedPlots([]);
  }, [selectedPlots, plots, currentTime, handleHarvestSingle]);

  // Fund account
  const handleFundAccount = useCallback(async () => {
    if (!universalAccount) {
      toast.error("No universal account found");
      return;
    }

    if (!faucetEligibility.isEligible) {
      toast.error("Not eligible for faucet", {
        description: faucetEligibility.reason,
      });
      return;
    }

    const fundingToastId = toast.loading("Requesting USDC from faucet...");

    faucetMutation.mutate(
      { address: universalAccount },
      {
        onSuccess: () => {
          toast.dismiss(fundingToastId);
          toast.success("Account funded!");
        },
        onError: (error) => {
          toast.dismiss(fundingToastId);
          toast.error("Failed to fund account", {
            description:
              error instanceof Error ? error.message : "Try again later",
          });
        },
      }
    );
  }, [universalAccount, faucetMutation, faucetEligibility]);

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
            <h1 className="font-pixel-title text-2xl text-amber-400 drop-shadow-lg">
              🥔 TapTato
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
                  {universalBalance?.formatted.slice(0, 6)} USDC
                </div>
                <Button
                  variant="outline"
                  onClick={handleFundAccount}
                  size="sm"
                  disabled={
                    faucetMutation.isPending || !faucetEligibility.isEligible
                  }
                  className="font-pixel-small bg-green-700 hover:bg-green-600 text-white border-green-600"
                >
                  {faucetMutation.isPending ? "Funding..." : "Fund"}
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
            <div className="flex items-center justify-center gap-8 p-4 bg-gray-900/80 backdrop-blur-sm rounded-xl border-2 border-green-600 shadow-lg">
              <div className="text-center">
                <div className="font-pixel-metrics text-3xl font-bold text-green-400">
                  ${universalBalance?.formatted.slice(0, 6) || "0"}
                </div>
                <div className="font-pixel-body text-sm mt-2 text-gray-400">
                  Balance{" "}
                  <span
                    className={`font-bold ${
                      totalPnL >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ({totalPnL >= 0 ? "+" : ""}
                    {totalPnL.toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="font-pixel-metrics text-3xl font-bold flex items-center justify-center gap-2 text-amber-400">
                  🥔 {harvestedCount}
                </div>
                <div className="font-pixel-body text-sm mt-2 text-gray-400">
                  Harvested
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
