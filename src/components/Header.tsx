/**
 * TapTato - Header Component
 * Main header with logo, help button, and connect/disconnect
 */

import { Button } from "@/components/ui/button";
import Image from "next/image";

interface HeaderProps {
  isConnected: boolean;
  onShowTutorial: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Header({
  isConnected,
  onShowTutorial,
  onConnect,
  onDisconnect,
}: HeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-3">
      {/* Left: Title + Help */}
      <div className="flex items-center gap-2 sm:gap-4">
        <h1 className="font-pixel-title text-xl sm:text-2xl text-amber-400 drop-shadow-lg flex items-center gap-2">
          <Image
            src="/potato.png"
            alt="Potato"
            width={28}
            height={28}
            className="pixelated sm:w-8 sm:h-8"
          />
          TapTato
        </h1>
        {/* Help Button */}
        <button
          onClick={onShowTutorial}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Show tutorial"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
            className="pixelated sm:w-8 sm:h-8"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>

      {/* Right: Simple Disconnect */}
      <nav className="flex items-center gap-2">
        {isConnected ? (
          <Button
            variant="outline"
            onClick={onDisconnect}
            size="sm"
            className="font-pixel-small bg-red-700 hover:bg-red-600 text-white border-red-600"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            onClick={onConnect}
            size="sm"
            className="font-pixel-body bg-green-600 hover:bg-green-500 text-white px-6 py-3"
          >
            Connect Wallet
          </Button>
        )}
      </nav>
    </div>
  );
}
