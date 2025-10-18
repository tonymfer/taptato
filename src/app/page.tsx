"use client";

/**
 * TapTato - Main Game Page
 * A gamified potato farming demo showcasing Base Account features
 */

import { FarmField } from "@/components/FarmField";
import { Header } from "@/components/Header";
import { PotatoVault } from "@/components/PotatoVault";
import { TutorialDialog } from "@/components/TutorialDialog";
import { useHarvestManager } from "@/hooks/useHarvestManager";
import { usePlantingManager } from "@/hooks/usePlantingManager";
import { useWalletManager } from "@/hooks/useWalletManager";
import {
  calculateVisualState,
  getTimeUntilRipe,
  getTimeUntilRotten,
  useGameStore,
} from "@/store/gameStore";
import type { PlotData } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function App() {
  const account = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { plots } = useGameStore();

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedPlots, setSelectedPlots] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second for visual updates
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Wallet Management
  const walletManager = useWalletManager();

  // Harvest Management
  const harvestManager = useHarvestManager({
    refetchBarnBalance: walletManager.refetchBarnBalance,
    refetchPouchBalance: walletManager.refetchPouchBalance,
  });

  // Planting Management
  const plantingManager = usePlantingManager({
    accounts: walletManager.accounts,
    barnBalance: walletManager.barnBalance,
    pouchBalance: walletManager.pouchBalance,
    barnEthBalance: walletManager.barnEthBalance,
    pouchEthBalance: walletManager.pouchEthBalance,
    isLoadingBalances: walletManager.isLoadingBalances,
    loadFieldPouch: walletManager.loadFieldPouch,
    refetchBarnBalance: walletManager.refetchBarnBalance,
    refetchPouchBalance: walletManager.refetchPouchBalance,
    onPlantingCost: harvestManager.trackPlantingCost,
  });

  // Plot selection
  const handleSelectPlot = useCallback((plotId: number) => {
    setSelectedPlots((prev) =>
      prev.includes(plotId)
        ? prev.filter((id) => id !== plotId)
        : [...prev, plotId]
    );
  }, []);

  // Batch plant
  const handlePlantBatch = useCallback(() => {
    const emptyPlots = selectedPlots.filter(
      (id) => plots[id].state === "empty"
    );
    if (emptyPlots.length === 0) return;

    emptyPlots.forEach(plantingManager.handlePlantSingle);
    setSelectedPlots([]);
  }, [selectedPlots, plots, plantingManager.handlePlantSingle]);

  // Batch harvest
  const handleHarvestBatch = useCallback(() => {
    const visualStates = plots.map((p) => calculateVisualState(p, currentTime));
    const ripePlots = selectedPlots.filter((id) => visualStates[id] === "ripe");
    if (ripePlots.length === 0) return;

    ripePlots.forEach(harvestManager.handleHarvestSingle);
    setSelectedPlots([]);
  }, [selectedPlots, plots, currentTime, harvestManager.handleHarvestSingle]);

  // Prepare plot data with visual states
  const plotData: PlotData[] = plots.map((plot) => ({
    id: plot.id,
    state: calculateVisualState(plot, currentTime),
    timeUntilRipe: getTimeUntilRipe(plot, currentTime),
    timeUntilRotten: getTimeUntilRotten(plot, currentTime),
    isPlanting: plot.isLoading,
    harvestAmount: harvestManager.harvestAmounts[plot.id],
    plantSuccess: plantingManager.plantSuccesses[plot.id],
  }));

  return (
    <main className="min-h-screen bg-black text-white">
      <TutorialDialog open={showTutorial} onClose={closeTutorial} />

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <Header
          isConnected={account.status === "connected"}
          onShowTutorial={() => setShowTutorial(true)}
          onConnect={() => connect({ connector: connectors[0] })}
          onDisconnect={() => disconnect()}
        />

        {account.status === "connected" && (
          <>
            <PotatoVault
              barnBalance={walletManager.barnBalance?.formatted || "0"}
              pouchBalance={walletManager.pouchBalance?.formatted || "0"}
              stats={harvestManager.stats}
              isLoading={walletManager.isLoadingBalances}
              isFaucetEligible={walletManager.faucetEligibility.isEligible}
              hasBarnBalance={
                Number(walletManager.barnBalance?.value || 0n) > 0
              }
              isStocking={walletManager.faucetMutation.isPending}
              isTransferring={walletManager.isTransferring}
              onStockUp={walletManager.handleStockUp}
              onLoadPouch={walletManager.handleManualLoadPouch}
            />

            <FarmField
              plotData={plotData}
              selectedPlots={selectedPlots}
              onSelectPlot={handleSelectPlot}
              onPlant={plantingManager.handlePlantSingle}
              onHarvest={harvestManager.handleHarvestSingle}
              onPlantBatch={handlePlantBatch}
              onHarvestBatch={handleHarvestBatch}
            />
          </>
        )}
      </div>
    </main>
  );
}

export default App;
