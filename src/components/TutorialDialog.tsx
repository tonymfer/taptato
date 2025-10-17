"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

interface TutorialDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialDialog({ open, onClose }: TutorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] bg-gray-900 text-white border-4 border-green-600 overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-pixel-title text-xl text-amber-400">
            🥔 Welcome to TapTato!
          </DialogTitle>
          <DialogDescription className="font-pixel-body text-base text-gray-300">
            Base Account Demo - Zero-Popup Farming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 font-pixel-body text-sm text-gray-200 overflow-y-auto pr-4 flex-1">
          {/* What is this */}
          <div className="bg-blue-900/30 p-4 rounded-lg border-2 border-blue-600">
            <h3 className="font-pixel-subtitle text-sm text-blue-400 mb-2">
              🚀 What is this?
            </h3>
            <p className="leading-relaxed">
              This is a demo showcasing{" "}
              <strong>Base Account's powerful features</strong>:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
              <li>
                <strong>Sub Accounts</strong> - Seamless transactions
              </li>
              <li>
                <strong>Batch Transactions</strong> - Multiple plants in one
                click
              </li>
              <li>
                <strong>Server Wallets</strong> - CDP-powered rewards
              </li>
            </ul>
            <p className="mt-3 text-amber-400 text-xs">
              ✅ Running on <strong>Base Sepolia testnet</strong> - Play freely!
            </p>
          </div>

          {/* Growth Stages */}
          <div>
            <h3 className="font-pixel-subtitle text-sm text-green-400 mb-3">
              🌱 Growth Stages
            </h3>
            <div className="flex items-center justify-center gap-3 bg-gray-800/50 p-4 rounded-lg">
              <div className="text-center">
                <Image
                  src="/seed.png"
                  alt="Seed"
                  width={48}
                  height={48}
                  className="pixelated mx-auto"
                />
                <p className="text-xs mt-1">Seed</p>
              </div>
              <span className="text-2xl">→</span>
              <div className="text-center">
                <Image
                  src="/sprout.png"
                  alt="Sprout"
                  width={48}
                  height={48}
                  className="pixelated mx-auto"
                />
                <p className="text-xs mt-1">Sprout</p>
              </div>
              <span className="text-2xl">→</span>
              <div className="text-center">
                <Image
                  src="/mid.png"
                  alt="Mid"
                  width={48}
                  height={48}
                  className="pixelated mx-auto"
                />
                <p className="text-xs mt-1">Mid</p>
              </div>
              <span className="text-2xl">→</span>
              <div className="text-center">
                <Image
                  src="/full.png"
                  alt="Ripe"
                  width={48}
                  height={48}
                  className="pixelated mx-auto"
                />
                <p className="text-xs mt-1 text-green-400">Ripe!</p>
              </div>
              <span className="text-2xl">→</span>
              <div className="text-center">
                <Image
                  src="/wilt.png"
                  alt="Rotten"
                  width={48}
                  height={48}
                  className="pixelated mx-auto"
                />
                <p className="text-xs mt-1 text-red-400">Rotten</p>
              </div>
            </div>
          </div>

          {/* How to Play */}
          <div>
            <h3 className="font-pixel-subtitle text-sm text-amber-400 mb-3">
              🎮 How to Play
            </h3>
            <div className="space-y-3 text-xs bg-gray-800/50 p-4 rounded-lg">
              <div>
                <strong className="text-green-400">
                  1. Plant ($0.01 USDC)
                </strong>
                <p className="text-gray-400 ml-4">
                  Hover empty plot → See seed → Click to plant
                </p>
              </div>
              <div>
                <strong className="text-blue-400">2. Wait (20 seconds)</strong>
                <p className="text-gray-400 ml-4">
                  Watch your potato grow: seed → sprout → mid → ripe
                </p>
              </div>
              <div>
                <strong className="text-amber-400">
                  3. Harvest (Timing matters!)
                </strong>
                <div className="ml-4 mt-1 space-y-1 text-gray-400">
                  <p>
                    🏆 <strong className="text-green-400">Perfect (±2s)</strong>
                    : Get $0.02 (+100% bonus!)
                  </p>
                  <p>
                    👍 <strong className="text-blue-400">Good (±5s)</strong>:
                    Get $0.015 (+50% bonus)
                  </p>
                  <p>
                    ⏰{" "}
                    <strong className="text-orange-400">Late (&gt;5s)</strong>:
                    Get $0.01 (no bonus)
                  </p>
                  <p>
                    💀{" "}
                    <strong className="text-red-400">Rotten (&gt;25s)</strong>:
                    Get $0 (spoiled!)
                  </p>
                </div>
              </div>
              <div>
                <strong className="text-red-400">4. Rotten? Clear it!</strong>
                <p className="text-gray-400 ml-4">
                  Hover rotten plot → "Clear" → Remove it
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-purple-900/30 p-4 rounded-lg border-2 border-purple-600">
            <h3 className="font-pixel-subtitle text-sm text-purple-400 mb-2">
              💡 Pro Tips
            </h3>
            <ul className="text-xs space-y-1 text-gray-300">
              <li>✨ First plant: 1 popup for Auto Spend Permission</li>
              <li>🚀 After that: No popups! Plant as many as you want</li>
              <li>📦 Click 3 plots quickly = Batch transaction!</li>
              <li>⏱️ Perfect timing = 2x profit!</li>
            </ul>
          </div>
        </div>

        {/* Close Button - sticky at bottom */}
        <div className="flex-shrink-0 pt-4 border-t-2 border-gray-700">
          <button
            onClick={onClose}
            className="w-full font-pixel-body text-base py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg border-4 border-green-500 shadow-xl transition-colors"
          >
            Got it! Let's Farm 🥔
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
