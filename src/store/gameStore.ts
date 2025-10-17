import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlotState = "empty" | "seed" | "sprout" | "mid" | "ripe" | "rotten";

export interface Plot {
  id: number;
  state: PlotState;
  owner?: string;
  plantTime?: number; // timestamp in ms
  readyAt?: number; // timestamp in ms
  harvestedAt?: number;
  isLoading?: boolean; // Planting in progress
}

interface GameState {
  plots: Plot[];

  // Actions
  startPlanting: (plotId: number) => void; // Show loading (seed)
  plant: (plotId: number, userAddress: string) => void; // Confirm planted (sprout)
  harvest: (plotId: number) => void;
  updatePlotState: (plotId: number, updates: Partial<Plot>) => void;

  // Utilities
  getPlot: (plotId: number) => Plot;
  reset: () => void;
}

const GROW_TIME_MS = parseInt(process.env.NEXT_PUBLIC_GROW_SECS || "20") * 1000; // Default 20 seconds
const HARVEST_WINDOW_MS =
  parseInt(process.env.NEXT_PUBLIC_HARVEST_WINDOW_SECS || "5") * 1000; // Default 5 seconds

const initialPlots: Plot[] = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  state: "empty",
}));

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      plots: initialPlots,

      startPlanting: (plotId: number) => {
        set((state) => {
          const newPlots = [...state.plots];
          newPlots[plotId] = {
            ...newPlots[plotId],
            isLoading: true,
            state: "seed", // Show seed as loading indicator
          };
          return { plots: newPlots };
        });
      },

      plant: (plotId: number, userAddress: string) => {
        const now = Date.now();
        set((state) => {
          const newPlots = [...state.plots];
          newPlots[plotId] = {
            ...newPlots[plotId],
            isLoading: false,
            state: "sprout", // Start with sprout after TX success
            owner: userAddress,
            plantTime: now,
            readyAt: now + GROW_TIME_MS,
          };
          return { plots: newPlots };
        });
      },

      harvest: (plotId: number) => {
        set((state) => {
          const newPlots = [...state.plots];
          newPlots[plotId] = {
            id: plotId,
            state: "empty",
            harvestedAt: Date.now(),
            plantTime: undefined,
            readyAt: undefined,
            owner: undefined,
            isLoading: false, // Ensure loading is cleared
          };
          return { plots: newPlots };
        });
      },

      updatePlotState: (plotId: number, updates: Partial<Plot>) => {
        set((state) => {
          const newPlots = [...state.plots];
          newPlots[plotId] = {
            ...newPlots[plotId],
            ...updates,
          };
          return { plots: newPlots };
        });
      },

      getPlot: (plotId: number) => {
        return get().plots[plotId];
      },

      reset: () => {
        set({ plots: initialPlots });
      },
    }),
    {
      name: "taptato-game-storage",
    }
  )
);

/**
 * Calculate visual plot state based on timing
 */
export function calculateVisualState(
  plot: Plot,
  currentTime: number
): PlotState {
  // Loading state (planting TX in progress) - show seed
  if (plot.isLoading) {
    return "seed";
  }

  if (plot.state === "empty" || !plot.readyAt || !plot.plantTime) {
    return plot.state;
  }

  const rottenAt = plot.readyAt + HARVEST_WINDOW_MS;

  // Rotten (missed harvest window)
  if (currentTime > rottenAt) {
    return "rotten";
  }

  // Ripe (ready to harvest)
  if (currentTime >= plot.readyAt) {
    return "ripe";
  }

  // Growing stages (skip seed - start with sprout after TX confirm)
  const growProgress = (currentTime - plot.plantTime) / GROW_TIME_MS;

  if (growProgress < 0.5) {
    return "sprout"; // First half
  } else {
    return "mid"; // Second half
  }
}

/**
 * Calculate time remaining until ripe
 */
export function getTimeUntilRipe(
  plot: Plot,
  currentTime: number
): number | undefined {
  if (!plot.readyAt || currentTime >= plot.readyAt) {
    return undefined;
  }
  return Math.max(0, plot.readyAt - currentTime);
}

/**
 * Calculate time remaining until rotten
 */
export function getTimeUntilRotten(
  plot: Plot,
  currentTime: number
): number | undefined {
  if (!plot.readyAt || plot.state !== "ripe") {
    return undefined;
  }
  const rottenAt = plot.readyAt + HARVEST_WINDOW_MS;
  return Math.max(0, rottenAt - currentTime);
}
