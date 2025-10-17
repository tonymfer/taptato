import { isEligibleForFaucet } from "@/lib/faucet";
import { CdpClient } from "@coinbase/cdp-sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Check if address is eligible for faucet funds
    const eligibility = await isEligibleForFaucet(address);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: "Not eligible for faucet",
          details: eligibility.reason,
          balance: eligibility.balance,
        },
        { status: 403 }
      );
    }

    // Validate that required environment variables are set
    const apiKeyId = process.env.CDP_API_KEY_ID;
    const apiKeySecret = process.env.CDP_API_KEY_SECRET;

    if (!apiKeyId || !apiKeySecret) {
      console.error("Missing CDP credentials in environment variables");
      console.error(`CDP_API_KEY_ID: ${apiKeyId ? "set" : "missing"}`);
      console.error(`CDP_API_KEY_SECRET: ${apiKeySecret ? "set" : "missing"}`);
      return NextResponse.json(
        { error: "Server configuration error: CDP credentials not configured" },
        { status: 500 }
      );
    }

    // Initialize CDP client
    console.log("Initializing CDP client...");
    const cdp = new CdpClient();
    console.log("CDP client initialized successfully");

    // Request USDC from faucet for the provided address
    console.log(`Requesting faucet for address: ${address}`);
    console.log("Faucet params:", {
      address,
      network: "base-sepolia",
      token: "usdc",
    });

    const faucetResponse = await cdp.evm.requestFaucet({
      address: address,
      network: "base-sepolia",
      token: "usdc",
    });

    console.log("✅ Faucet response:", faucetResponse);

    return NextResponse.json({
      success: true,
      transactionHash: faucetResponse.transactionHash,
      explorerUrl: `https://sepolia.basescan.org/tx/${faucetResponse.transactionHash}`,
      message: "USDC sent successfully to your wallet",
    });
  } catch (error) {
    console.error("❌ Faucet error (full):", error);
    console.error("❌ Error type:", typeof error);
    console.error("❌ Error constructor:", error?.constructor?.name);

    // Log all error properties
    if (error && typeof error === "object") {
      console.error("❌ Error keys:", Object.keys(error));
      console.error("❌ Error message:", (error as any).message);
      console.error("❌ Error response:", (error as any).response);
      console.error("❌ Error data:", (error as any).data);
      console.error("❌ Error status:", (error as any).status);
    }

    // Handle rate limiting or other API errors
    if (error && typeof error === "object" && "response" in error) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 429) {
        return NextResponse.json(
          { error: "Rate limit reached. Please try again in 24 hours." },
          { status: 429 }
        );
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Provide more helpful error message
    let userFriendlyMessage = errorMessage;

    if (errorMessage.includes("reach out")) {
      userFriendlyMessage =
        "CDP faucet unavailable. Please try again later or contact support.";
    } else if (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many")
    ) {
      userFriendlyMessage = "Rate limit reached. Please try again in 24 hours.";
    } else if (errorMessage.includes("balance")) {
      userFriendlyMessage = "Account balance too high for faucet.";
    }

    return NextResponse.json(
      {
        error: "Failed to fund account",
        details: userFriendlyMessage,
        originalError: errorMessage,
      },
      { status: 500 }
    );
  }
}
