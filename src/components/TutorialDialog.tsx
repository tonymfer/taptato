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
          <DialogTitle className="font-pixel-title text-2xl text-amber-400">
            🥔 Welcome to TapTato!
          </DialogTitle>
          <DialogDescription className="font-pixel-body text-lg text-gray-300">
            Base Account Demo - Zero-Popup Farming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 font-pixel-body text-base text-gray-200 overflow-y-auto pr-4 flex-1">
          {/* What is this */}
          <div className="bg-blue-900/30 p-4 rounded-lg border-2 border-blue-600">
            <h3 className="font-pixel-subtitle text-lg text-blue-400 mb-3">
              🚀 What is this?
            </h3>
            <p className="leading-relaxed">
              This is a demo showcasing{" "}
              <strong>Base Account's powerful features</strong>:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
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
            <p className="mt-3 text-amber-400 text-sm">
              ✅ Running on <strong>Base Sepolia testnet</strong> - Play freely!
            </p>
          </div>

          {/* Potato Vault System */}
          <div className="bg-amber-900/30 p-4 rounded-lg border-2 border-amber-600">
            <h3 className="font-pixel-subtitle text-lg text-amber-400 mb-3">
              💰 Your Potato Vault
            </h3>
            <div className="space-y-3 text-sm">
              <div className="bg-amber-950/40 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🏪</span>
                  <strong className="text-amber-300">Potato Barn (Storage)</strong>
                </div>
                <p className="text-gray-300 ml-6">
                  Your main vault for USDC. Keeps your funds safe!
                </p>
              </div>
              <div className="text-center text-amber-500 text-xl">↓</div>
              <div className="bg-green-950/40 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">👝</span>
                  <strong className="text-green-300">Field Pouch (Active)</strong>
                </div>
                <p className="text-gray-300 ml-6">
                  Your working wallet for planting potatoes.
                </p>
              </div>
              <div className="bg-blue-950/40 p-3 rounded mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🚜</span>
                  <strong className="text-blue-300">Smart Refill (Auto-Magic!)</strong>
                </div>
                <p className="text-gray-300 ml-6">
                  When your Field Pouch runs low during planting, we automatically move USDC from your Barn. No manual transfers needed!
                </p>
              </div>
              <div className="mt-3 p-2 bg-green-900/20 rounded border border-green-600/30">
                <p className="text-green-300 text-xs">
                  💡 <strong>How it works:</strong> Faucet → Barn → Pouch → Plant! The Barn stores funds safely, and the Pouch handles all transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Growth Stages */}
          <div>
            <h3 className="font-pixel-subtitle text-lg text-green-400 mb-3">
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
                <p className="text-sm mt-1">Seed</p>
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
                <p className="text-sm mt-1">Sprout</p>
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
                <p className="text-sm mt-1">Mid</p>
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
                <p className="text-sm mt-1 text-green-400">Ripe!</p>
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
                <p className="text-sm mt-1 text-red-400">Rotten</p>
              </div>
            </div>
          </div>

          {/* How to Play */}
          <div>
            <h3 className="font-pixel-subtitle text-lg text-amber-400 mb-3">
              🎮 How to Play
            </h3>
            <div className="space-y-4 text-base bg-gray-800/50 p-4 rounded-lg">
              <div>
                <strong className="text-green-400 text-lg">
                  1. Plant ($0.01 USDC)
                </strong>
                <p className="text-gray-400 ml-4 mt-1">
                  Hover empty plot → See seed → Click to plant
                </p>
              </div>
              <div>
                <strong className="text-blue-400 text-lg">
                  2. Wait (20 seconds)
                </strong>
                <p className="text-gray-400 ml-4 mt-1">
                  Watch your potato grow: seed → sprout → mid → ripe
                </p>
              </div>
              <div>
                <strong className="text-amber-400 text-lg">
                  3. Harvest (Timing matters!)
                </strong>
                <div className="ml-4 mt-2 space-y-2 text-gray-400">
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
                <strong className="text-red-400 text-lg">
                  4. Rotten? Clear it!
                </strong>
                <p className="text-gray-400 ml-4 mt-1">
                  Hover rotten plot → "Clear" → Remove it
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-purple-900/30 p-4 rounded-lg border-2 border-purple-600">
            <h3 className="font-pixel-subtitle text-lg text-purple-400 mb-3">
              💡 Pro Tips
            </h3>
            <ul className="text-base space-y-2 text-gray-300">
              <li>✨ Click "Stock Up" to fill your Potato Barn with USDC</li>
              <li>🚜 Smart Refill auto-loads your Field Pouch when needed</li>
              <li>🚀 After first plant: No popups! Plant as many as you want</li>
              <li>📦 Click 3 plots quickly = Batch transaction!</li>
              <li>⏱️ Perfect timing = 2x profit!</li>
            </ul>
          </div>
        </div>

        {/* Close Button - sticky at bottom */}
        <div className="flex-shrink-0 pt-4 border-t-2 border-gray-700">
          <button
            onClick={onClose}
            className="w-full font-pixel-body text-lg py-4 bg-green-700 hover:bg-green-600 text-white rounded-lg border-4 border-green-500 shadow-xl transition-colors"
          >
            Got it! Let's Farm 🥔
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
