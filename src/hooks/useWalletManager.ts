/**
 * TapTato - Wallet Manager Hook
 * Manages Potato Barn and Field Pouch balances and transfers
 */

import { USDC, erc20Abi } from "@/lib/usdc";
import type { AccountAddresses } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useBalance,
  useConnections,
  useWriteContract,
} from "wagmi";
import { useFaucet } from "./useFaucet";
import { useFaucetEligibility } from "./useFaucetEligibility";

export function useWalletManager() {
  const account = useAccount();
  const connections = useConnections();
  const { writeContractAsync } = useWriteContract();
  const [isTransferring, setIsTransferring] = useState(false);

  // Get Potato Barn (universal) and Field Pouch (sub) accounts
  const accounts: AccountAddresses = useMemo(() => {
    const [fieldPouch, potatoBarn] = connections.flatMap(
      (connection) => connection.accounts
    );
    return { fieldPouch, potatoBarn };
  }, [connections]);

  // Get Potato Barn balance (main storage)
  const {
    data: barnBalance,
    refetch: refetchBarnBalance,
    isLoading: isLoadingBarnBalance,
  } = useBalance({
    address: accounts.potatoBarn,
    token: USDC.address,
    query: {
      refetchInterval: false,
      enabled: !!accounts.potatoBarn,
    },
  });

  // Get Field Pouch balance (active planting funds)
  const {
    data: pouchBalance,
    refetch: refetchPouchBalance,
    isLoading: isLoadingPouchBalance,
  } = useBalance({
    address: accounts.fieldPouch,
    token: USDC.address,
    query: {
      refetchInterval: false,
      enabled: !!accounts.fieldPouch,
    },
  });

  // Get Field Pouch ETH balance (for gas)
  const { data: pouchEthBalance, isLoading: isLoadingPouchEth } = useBalance({
    address: accounts.fieldPouch,
    query: {
      refetchInterval: false,
      enabled: !!accounts.fieldPouch,
    },
  });

  // Get Potato Barn ETH balance
  const { data: barnEthBalance, isLoading: isLoadingBarnEth } = useBalance({
    address: accounts.potatoBarn,
    query: {
      refetchInterval: false,
      enabled: !!accounts.potatoBarn,
    },
  });

  const isLoadingBalances =
    isLoadingBarnBalance ||
    isLoadingPouchBalance ||
    isLoadingPouchEth ||
    isLoadingBarnEth;

  // Check faucet eligibility
  const faucetEligibility = useFaucetEligibility(barnBalance?.value);
  const faucetMutation = useFaucet();

  // Refetch balances when accounts change
  useEffect(() => {
    if (accounts.potatoBarn || accounts.fieldPouch) {
      console.log("🔄 Potato Vault detected, fetching initial balances...");
      refetchBarnBalance();
      refetchPouchBalance();
    }
  }, [
    accounts.potatoBarn,
    accounts.fieldPouch,
    refetchBarnBalance,
    refetchPouchBalance,
  ]);

  // Load Field Pouch - Transfer USDC from Potato Barn to Field Pouch
  const loadFieldPouch = useCallback(
    async (amount: bigint) => {
      if (!accounts.fieldPouch || !accounts.potatoBarn) {
        toast.error("❌ Vault Error", {
          description: "Potato Vault not found",
        });
        return false;
      }

      try {
        setIsTransferring(true);
        console.log(
          `🚜 Loading Field Pouch with ${amount} USDC from Potato Barn...`
        );

        const hash = await writeContractAsync({
          address: USDC.address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [accounts.fieldPouch, amount],
          account: accounts.potatoBarn,
        });

        console.log("✅ Field Pouch loaded successfully:", hash);

        await new Promise((resolve) => setTimeout(resolve, 3000));
        await refetchBarnBalance();
        await refetchPouchBalance();
        console.log("💰 Potato Vault balances updated after transfer");

        return true;
      } catch (error) {
        console.error("❌ Failed to load Field Pouch:", error);
        toast.error("❌ Transfer Failed", {
          description: "Could not load Field Pouch from Barn",
        });
        return false;
      } finally {
        setIsTransferring(false);
      }
    },
    [
      accounts.fieldPouch,
      accounts.potatoBarn,
      writeContractAsync,
      refetchBarnBalance,
      refetchPouchBalance,
    ]
  );

  // Stock Up - Get USDC from faucet to Potato Barn
  const handleStockUp = useCallback(async () => {
    if (!accounts.potatoBarn) {
      toast.error("❌ Vault Error", { description: "Potato Barn not found" });
      return;
    }

    if (!faucetEligibility.isEligible) {
      toast.error("⛔ Faucet Not Available", {
        description: faucetEligibility.reason,
        duration: 4000,
      });
      return;
    }

    const fundingToastId = toast.loading("🏪 Stocking up the Barn...", {
      description: "⏳ Getting USDC from faucet...",
    });

    faucetMutation.mutate(
      { address: accounts.potatoBarn },
      {
        onSuccess: async () => {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          await refetchBarnBalance();

          const balanceResult = await refetchBarnBalance();
          const barnUSDC = balanceResult.data?.value || 0n;

          toast.dismiss(fundingToastId);
          if (barnUSDC > 0n) {
            toast.success("✅ Barn Stocked!", {
              description: `💰 ${parseFloat((Number(barnUSDC) / 1e6).toFixed(2))} USDC in your Barn! Smart Refill will auto-load your Pouch when planting.`,
              duration: 5000,
            });
          } else {
            toast.success("✅ USDC Received!", {
              description: "💰 Waiting for confirmation...",
              duration: 4000,
            });
            setTimeout(async () => {
              await refetchBarnBalance();
              await refetchPouchBalance();
            }, 3000);
          }
        },
        onError: (error) => {
          toast.dismiss(fundingToastId);
          toast.error("❌ Stocking Failed", {
            description: `💔 ${error instanceof Error ? error.message : "Try again later"}`,
            duration: 5000,
          });
        },
      }
    );
  }, [
    accounts.potatoBarn,
    faucetMutation,
    faucetEligibility,
    refetchBarnBalance,
    refetchPouchBalance,
  ]);

  // Manually load Field Pouch from Potato Barn
  const handleManualLoadPouch = useCallback(async () => {
    if (!accounts.potatoBarn || !accounts.fieldPouch) {
      toast.error("❌ Vault Error", { description: "Potato Vault not found" });
      return;
    }

    const barnUSDC = Number(barnBalance?.value || 0n);

    if (barnUSDC === 0) {
      toast.error("❌ Barn is Empty", {
        description: "Stock up your Barn first!",
      });
      return;
    }

    const transferToastId = toast.loading("🚜 Loading Field Pouch...", {
      description: "Moving USDC from Barn to Field...",
    });

    const success = await loadFieldPouch(barnBalance!.value);

    toast.dismiss(transferToastId);
    if (success) {
      toast.success("✅ Pouch Loaded!", {
        description: `💰 ${parseFloat((barnUSDC / 1e6).toFixed(2))} USDC ready for planting!`,
        duration: 4000,
      });
    }
  }, [accounts.potatoBarn, accounts.fieldPouch, barnBalance, loadFieldPouch]);

  return {
    accounts,
    barnBalance,
    pouchBalance,
    barnEthBalance,
    pouchEthBalance,
    isLoadingBalances,
    isTransferring,
    faucetEligibility,
    faucetMutation,
    loadFieldPouch,
    handleStockUp,
    handleManualLoadPouch,
    refetchBarnBalance,
    refetchPouchBalance,
  };
}
