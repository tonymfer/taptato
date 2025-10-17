"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";

/**
 * Hook to poll the current block timestamp for accurate onchain timing
 * Updates every 2 seconds to keep UI timers synchronized with blockchain
 */
export function useBlockTime() {
  const [blockTime, setBlockTime] = useState<number>(
    Math.floor(Date.now() / 1000)
  );
  const publicClient = usePublicClient();

  useEffect(() => {
    let isMounted = true;

    const fetchBlockTime = async () => {
      if (!publicClient) return;

      try {
        const block = await publicClient.getBlock();
        if (isMounted && block) {
          setBlockTime(Number(block.timestamp));
        }
      } catch (error) {
        console.error("Error fetching block time:", error);
      }
    };

    // Initial fetch
    fetchBlockTime();

    // Poll every 2 seconds
    const interval = setInterval(fetchBlockTime, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [publicClient]);

  return blockTime;
}
