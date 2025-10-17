import { CdpClient } from "@coinbase/cdp-sdk";

/**
 * Get Coinbase CDP client
 * SDK automatically reads credentials from environment variables:
 * - CDP_API_KEY_ID
 * - CDP_API_KEY_SECRET
 * - CDP_WALLET_SECRET (optional)
 */
export function getCDPClient(): CdpClient {
  // Check for required environment variables
  if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
    throw new Error(
      "CDP API credentials not configured. Set CDP_API_KEY_ID and CDP_API_KEY_SECRET in .env.local"
    );
  }

  // CdpClient automatically loads credentials from environment variables!
  const cdp = new CdpClient();

  console.log("✅ CDP Client initialized");

  return cdp;
}

/**
 * Check if CDP is properly configured
 */
export function isCDPConfigured(): boolean {
  return !!(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET);
}
