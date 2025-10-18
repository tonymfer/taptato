"use client";

import { FloatingText } from "@/components/FloatingText";
import Image from "next/image";
import { useEffect, useState } from "react";

export type PlotState = "empty" | "seed" | "sprout" | "mid" | "ripe" | "rotten";

interface PlotTileProps {
  plotId: number;
  state: PlotState;
  isSelected: boolean;
  onSelect: (plotId: number) => void;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  timeUntilRipe?: number; // seconds
  timeUntilRotten?: number; // seconds
  isPlanting?: boolean; // loading state
  harvestAmount?: number; // Amount received from harvest (triggers positive floating text)
  plantSuccess?: boolean; // Plant TX success (triggers negative floating text)
}

const stateImages: Record<PlotState, string | null> = {
  empty: null,
  seed: "/seed.png",
  sprout: "/sprout.png",
  mid: "/mid.png",
  ripe: "/full.png",
  rotten: "/wilt.png",
};

const stateLabels: Record<PlotState, string> = {
  empty: "Empty Plot",
  seed: "Seed",
  sprout: "Sprouting",
  mid: "Growing",
  ripe: "Ripe!",
  rotten: "Rotten",
};

export function PlotTile({
  plotId,
  state,
  isSelected,
  onSelect,
  onPlant,
  onHarvest,
  timeUntilRipe,
  timeUntilRotten,
  isPlanting,
  harvestAmount,
  plantSuccess,
}: PlotTileProps) {
  const imageSrc = stateImages[state];
  const canPlant = state === "empty" && !isPlanting;
  const canHarvest = state === "ripe";
  const canClear = state === "rotten"; // Rotten plants need to be cleared first

  // Floating text state
  const [showFloatingText, setShowFloatingText] = useState(false);
  const [floatingAmount, setFloatingAmount] = useState("");
  const [isPositiveAmount, setIsPositiveAmount] = useState(false);

  // Show floating text when plant succeeds
  useEffect(() => {
    if (plantSuccess) {
      setFloatingAmount("-$0.01");
      setIsPositiveAmount(false);
      setShowFloatingText(true);
    }
  }, [plantSuccess]);

  // Show floating text when harvest amount changes
  useEffect(() => {
    if (harvestAmount && harvestAmount > 0) {
      setFloatingAmount(`+$${harvestAmount.toFixed(2)}`);
      setIsPositiveAmount(true);
      setShowFloatingText(true);
    }
  }, [harvestAmount]);

  // Reset floating text after it shows
  useEffect(() => {
    if (showFloatingText) {
      const timer = setTimeout(() => {
        setShowFloatingText(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showFloatingText]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Now!";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handlePlantClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Plant clicked for plot", plotId, "canPlant:", canPlant);
    onPlant(plotId);
  };

  const handleHarvestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Harvest clicked for plot", plotId, "canHarvest:", canHarvest);
    onHarvest(plotId);
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Clear rotten plant", plotId);
    // Clear rotten plant (resets to empty)
    onHarvest(plotId); // harvest function resets to empty
  };

  return (
    <div
      className={`
        relative w-full h-full transition-all cursor-pointer overflow-visible
        ${isSelected ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-black rounded" : ""}
      `}
      onClick={() => onSelect(plotId)}
    >
      {/* Floating Text Effect */}
      <FloatingText
        text={floatingAmount}
        isPositive={isPositiveAmount}
        show={showFloatingText}
      />

      {/* Plot Image */}
      <div className="relative w-full h-full flex items-end justify-center pt-2">
        {imageSrc && (
          <div className="mt-2">
            <Image
              src={imageSrc}
              alt={stateLabels[state]}
              width={130}
              height={130}
              className={`pixelated ${state === "ripe" ? "animate-glint" : ""} ${isPlanting ? "animate-pulse" : ""} ${state === "seed" ? "origin-center" : "origin-bottom"}`}
              priority
            />
          </div>
        )}
      </div>

      {/* Hover overlay */}
      {canPlant && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={handlePlantClick}
        >
          <Image
            src="/seed.png"
            alt="Plant"
            width={100}
            height={100}
            className="pixelated animate-pulse"
          />
        </div>
      )}

      {canClear && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={handleClearClick}
        >
          <div className="font-pixel-body text-xl text-white bg-red-700 px-4 py-2">
            Clear
          </div>
        </div>
      )}

      {canHarvest && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={handleHarvestClick}
        >
          <div className="font-pixel-body text-2xl text-amber-400 bg-amber-900/80 px-6 py-3 rounded-lg border-4 border-amber-500 shadow-2xl">
            Harvest
          </div>
        </div>
      )}
    </div>
  );
}
