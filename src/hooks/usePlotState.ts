"use client";

import { PlotState } from "@/components/PlotTile";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useBlockTime } from "./useBlockTime";

interface Plot {
  owner: string;
  plantTime: bigint;
  readyAt: bigint;
  state: number; // 0=Empty, 1=Planted, 2=Harvested
}

interface PlotData {
  id: number;
  state: PlotState;
  timeUntilRipe?: number;
  timeUntilRotten?: number;
}

const GROW_SECS = parseInt(process.env.NEXT_PUBLIC_GROW_SECS || "20");
const HARVEST_WINDOW_SECS = parseInt(
  process.env.NEXT_PUBLIC_HARVEST_WINDOW_SECS || "5"
);

/**
 * Hook to manage plot state from the contract
 * Calculates visual states based on timing and blockchain data
 */
export function usePlotState(contractAddress?: string, abi?: readonly any[]) {
  const { address } = useAccount();
  const blockTime = useBlockTime();
  const [plots, setPlots] = useState<PlotData[]>(
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      state: "empty" as PlotState,
    }))
  );

  // Read all user plots from contract
  const { data: contractPlots, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: abi,
    functionName: "getUserPlots",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress && !!abi,
      refetchInterval: 3000, // Refetch every 3 seconds
    },
  });

  // Calculate plot visual states based on timing
  const calculatePlotState = useCallback(
    (plot: Plot, plotId: number): PlotData => {
      // Empty or harvested
      if (plot.state === 0 || plot.state === 2) {
        return { id: plotId, state: "empty" };
      }

      // Planted
      if (plot.state === 1) {
        const readyAt = Number(plot.readyAt);
        const plantTime = Number(plot.plantTime);
        const rottenAt = readyAt + HARVEST_WINDOW_SECS;

        // Calculate time differences
        const timeUntilRipe = readyAt - blockTime;
        const timeUntilRotten = rottenAt - blockTime;

        // Rotten (past harvest window)
        if (blockTime > rottenAt) {
          return {
            id: plotId,
            state: "rotten",
          };
        }

        // Ripe (ready to harvest)
        if (blockTime >= readyAt) {
          return {
            id: plotId,
            state: "ripe",
            timeUntilRotten: Math.max(0, timeUntilRotten),
          };
        }

        // Growing stages based on progress
        const growProgress = (blockTime - plantTime) / GROW_SECS;

        if (growProgress < 0.33) {
          return {
            id: plotId,
            state: "seed",
            timeUntilRipe: Math.max(0, timeUntilRipe),
          };
        } else if (growProgress < 0.66) {
          return {
            id: plotId,
            state: "sprout",
            timeUntilRipe: Math.max(0, timeUntilRipe),
          };
        } else {
          return {
            id: plotId,
            state: "mid",
            timeUntilRipe: Math.max(0, timeUntilRipe),
          };
        }
      }

      return { id: plotId, state: "empty" };
    },
    [blockTime]
  );

  // Update plots when contract data or block time changes
  useEffect(() => {
    if (!contractPlots || !Array.isArray(contractPlots)) return;

    const updatedPlots = (contractPlots as Plot[]).map((plot, index) =>
      calculatePlotState(plot, index)
    );

    setPlots(updatedPlots);
  }, [contractPlots, calculatePlotState, blockTime]);

  return { plots, refetch };
}
