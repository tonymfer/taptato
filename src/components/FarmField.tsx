/**
 * TapTato - Farm Field Component
 * Displays the potato field with plots and batch actions
 */

import type { PlotData } from "@/types";
import { PlotTile } from "./PlotTile";
import { Button } from "./ui/button";

interface FarmFieldProps {
  plotData: PlotData[];
  selectedPlots: number[];
  onSelectPlot: (plotId: number) => void;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onPlantBatch: () => void;
  onHarvestBatch: () => void;
}

export function FarmField({
  plotData,
  selectedPlots,
  onSelectPlot,
  onPlant,
  onHarvest,
  onPlantBatch,
  onHarvestBatch,
}: FarmFieldProps) {
  const emptySelectedCount = selectedPlots.filter(
    (id) => plotData[id].state === "empty"
  ).length;
  const ripeSelectedCount = selectedPlots.filter(
    (id) => plotData[id].state === "ripe"
  ).length;

  return (
    <>
      {/* Farm Container with field.png background */}
      <div
        className="relative mx-auto pixelated max-w-full"
        style={{
          maxWidth: "920px",
          maxHeight: "651px",
          width: "min(920px, 100vw - 2rem)",
          height: "min(651px, calc((100vw - 2rem) * 651 / 920))",
          backgroundImage: "url(/field.png)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {/* Plot Grid - 4 cols x 3 rows = 12 plots */}
        <div
          className="grid grid-cols-4 grid-rows-3 p-7 px-10 gap-5"
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          {plotData.slice(0, 12).map((plot) => (
            <div key={plot.id} className="w-full h-full">
              <PlotTile
                plotId={plot.id}
                {...plot}
                onSelect={onSelectPlot}
                onPlant={onPlant}
                onHarvest={onHarvest}
                isSelected={selectedPlots.includes(plot.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Batch Actions */}
      {selectedPlots.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 justify-center px-4 mt-4">
          {emptySelectedCount > 0 && (
            <Button
              onClick={onPlantBatch}
              className="font-pixel-body bg-green-600 w-full sm:w-auto"
            >
              🌱 Plant Selected ({emptySelectedCount})
            </Button>
          )}
          {ripeSelectedCount > 0 && (
            <Button
              onClick={onHarvestBatch}
              className="font-pixel-body bg-amber-600 w-full sm:w-auto"
            >
              🥔 Harvest Selected ({ripeSelectedCount})
            </Button>
          )}
        </div>
      )}
    </>
  );
}
