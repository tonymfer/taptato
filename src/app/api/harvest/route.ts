import { CdpClient } from "@coinbase/cdp-sdk";
import { NextRequest, NextResponse } from "next/server";
import { parseUnits } from "viem";

const PLANT_COST = 0.01; // USDC
const TIER_PERFECT_MS =
  parseInt(process.env.NEXT_PUBLIC_TIER_PERFECT_SECS || "2") * 1000;
const TIER_GOOD_MS =
  parseInt(process.env.NEXT_PUBLIC_TIER_GOOD_SECS || "5") * 1000;
const HARVEST_WINDOW_MS =
  parseInt(process.env.NEXT_PUBLIC_HARVEST_WINDOW_SECS || "5") * 1000;
const BONUS_PERFECT = 1.0; // +100%
const BONUS_GOOD = 0.5; // +50%

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, plotId, readyAt, plantTime } = body;

    console.log("🥔 Harvest request:", { userAddress, plotId, readyAt });

    // Validate inputs
    if (!userAddress || plotId === undefined || !readyAt || !plantTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify timing
    const now = Date.now();
    const timeDiff = Math.abs(now - readyAt);
    const rottenAt = readyAt + HARVEST_WINDOW_MS;

    let tier: string;
    let bonusMultiplier: number;
    let totalPayout: number;

    // Too late - rotten (NO REFUND!)
    if (now > rottenAt) {
      tier = "Late";
      bonusMultiplier = 0;
      totalPayout = 0; // Rotten = 0 USDC (no refund!)
    }
    // Perfect timing
    else if (timeDiff <= TIER_PERFECT_MS) {
      tier = "Perfect";
      bonusMultiplier = BONUS_PERFECT;
      totalPayout = PLANT_COST * (1 + bonusMultiplier);
    }
    // Good timing
    else if (timeDiff <= TIER_GOOD_MS) {
      tier = "Good";
      bonusMultiplier = BONUS_GOOD;
      totalPayout = PLANT_COST * (1 + bonusMultiplier);
    }
    // Within harvest window but not perfect/good
    else {
      tier = "Late";
      bonusMultiplier = 0;
      totalPayout = PLANT_COST; // Just refund, no bonus
    }

    console.log("📊 Harvest calculation:", {
      tier,
      bonusMultiplier,
      totalPayout,
      timeDiff,
    });

    // Send USDC from Server Wallet if there's a payout
    let txHash = null;
    if (totalPayout > 0) {
      try {
        // Validate CDP credentials
        const apiKeyId = process.env.CDP_API_KEY_ID;
        const apiKeySecret = process.env.CDP_API_KEY_SECRET;

        console.log("🔑 CDP credentials check:");
        console.log(`  - CDP_API_KEY_ID: ${apiKeyId ? "set" : "missing"}`);
        console.log(
          `  - CDP_API_KEY_SECRET: ${apiKeySecret ? "set" : "missing"}`
        );

        if (!apiKeyId || !apiKeySecret) {
          throw new Error("CDP credentials not configured");
        }

        // Initialize CDP (automatically reads CDP_API_KEY_ID and CDP_API_KEY_SECRET from env)
        console.log("Initializing CDP client for harvest...");
        const cdp = new CdpClient();
        console.log("✅ CDP client initialized");

        // Get or create the server account on Base Sepolia
        const accountName = "taptato-spender";
        console.log(`Getting or creating account: ${accountName}`);

        const account = await cdp.evm.getOrCreateAccount({
          name: accountName,
        });

        console.log("✅ Using server account:", account.address);
        console.log(
          `⚠️ Note: Make sure this account has enough USDC (needs ${totalPayout} USDC)`
        );
        console.log(
          `💡 To fund: https://portal.cdp.coinbase.com/products/faucet`
        );

        // Transfer USDC to user using CDP account.transfer()
        const usdcAmount = parseUnits(totalPayout.toString(), 6); // USDC has 6 decimals

        console.log("💸 Preparing transfer:");
        console.log(`  - To: ${userAddress}`);
        console.log(`  - Amount: ${totalPayout} USDC (${usdcAmount} wei)`);
        console.log(`  - Token: usdc`);
        console.log(`  - Network: base-sepolia`);

        const { transactionHash } = await account.transfer({
          to: userAddress,
          amount: usdcAmount,
          token: "usdc",
          network: "base-sepolia",
        });

        txHash = transactionHash;

        console.log("✅ USDC sent to user:", txHash);
      } catch (error) {
        console.error("❌ Failed to send USDC (full error):", error);
        console.error("❌ Error type:", typeof error);
        console.error("❌ Error constructor:", error?.constructor?.name);

        if (error && typeof error === "object") {
          console.error("❌ Error keys:", Object.keys(error));
          console.error("❌ Error message:", (error as any).message);
          console.error("❌ Error response:", (error as any).response);
          console.error("❌ Error data:", (error as any).data);
          console.error("❌ Error stack:", (error as any).stack);
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Provide helpful error messages
        let userFriendlyMessage = errorMessage;
        let actionRequired = "";

        if (
          errorMessage.includes("insufficient") ||
          errorMessage.includes("balance")
        ) {
          userFriendlyMessage = "Server account has insufficient USDC balance.";
          actionRequired = `Please fund the CDP account 'taptato-spender' with USDC on Base Sepolia using: https://portal.cdp.coinbase.com/products/faucet`;
        } else if (
          errorMessage.includes("not found") ||
          errorMessage.includes("account")
        ) {
          userFriendlyMessage = "CDP server account not configured properly.";
          actionRequired =
            "Please check CDP_API_KEY_ID and CDP_API_KEY_SECRET environment variables.";
        }

        console.error("💡 Action required:", actionRequired);

        return NextResponse.json(
          {
            error: "Failed to send reward",
            details: userFriendlyMessage,
            actionRequired,
            originalError: errorMessage,
            debugInfo: {
              payout: totalPayout,
              userAddress,
            },
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      tier,
      bonusPaid: PLANT_COST * bonusMultiplier,
      totalPayout,
      txHash,
      timeDiff: timeDiff / 1000, // in seconds
    });
  } catch (error: any) {
    console.error("❌ Harvest API error:", error);
    return NextResponse.json(
      { error: error.message || "Harvest failed" },
      { status: 500 }
    );
  }
}
