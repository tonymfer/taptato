import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config();

async function main() {
  console.log("🥔 Deploying PotatoPatch contract to Base Sepolia...\n");

  // Load configuration from environment
  const config = {
    tokenAddress:
      process.env.PP_TOKEN_ADDRESS ||
      "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    spenderAddress: process.env.PP_SPENDER_ADDRESS || "",
    plantCost: process.env.PP_PLANT_COST || "10000",
    growSeconds: process.env.PP_GROW_SECS || "45",
    harvestWindowSeconds: process.env.PP_HARVEST_WINDOW_SECS || "20",
    bonusBpsPerfect: process.env.BONUS_BPS_PERFECT || "10000",
    bonusBpsGood: process.env.BONUS_BPS_GOOD || "5000",
    tierPerfectSeconds: process.env.TIER_PERFECT_SECS || "2",
    tierGoodSeconds: process.env.TIER_GOOD_SECS || "5",
    maxBonusPerTx: process.env.MAX_BONUS_PER_TX || "100000",
    maxBonusPerAddressDaily: process.env.MAX_BONUS_PER_ADDRESS_DAY || "1000000",
    maxBonusGlobal: process.env.MAX_BONUS_GLOBAL || "30000000",
  };

  if (!config.spenderAddress) {
    throw new Error(
      "PP_SPENDER_ADDRESS not set in .env (CDP Server Wallet address required)"
    );
  }

  if (!config.tokenAddress) {
    throw new Error("PP_TOKEN_ADDRESS not set in .env");
  }

  console.log("📋 Configuration:");
  console.log("Token Address:", config.tokenAddress);
  console.log("Spender Address:", config.spenderAddress);
  console.log("Plant Cost:", config.plantCost);
  console.log("Grow Time:", config.growSeconds, "seconds");
  console.log("Harvest Window:", config.harvestWindowSeconds, "seconds");
  console.log(
    "Perfect Bonus:",
    config.bonusBpsPerfect,
    "bps (+",
    parseInt(config.bonusBpsPerfect) / 100,
    "%)"
  );
  console.log(
    "Good Bonus:",
    config.bonusBpsGood,
    "bps (+",
    parseInt(config.bonusBpsGood) / 100,
    "%)"
  );
  console.log("Perfect Tier Window:", config.tierPerfectSeconds, "seconds");
  console.log("Good Tier Window:", config.tierGoodSeconds, "seconds");
  console.log("\n⏳ Deploying...\n");

  const PotatoPatch = await ethers.getContractFactory("PotatoPatch");
  const potatoPatch = await PotatoPatch.deploy(
    config.tokenAddress,
    config.plantCost,
    config.growSeconds,
    config.harvestWindowSeconds,
    config.bonusBpsPerfect,
    config.bonusBpsGood,
    config.tierPerfectSeconds,
    config.tierGoodSeconds,
    config.maxBonusPerTx,
    config.maxBonusPerAddressDaily,
    config.maxBonusGlobal,
    config.spenderAddress // CDP Server Wallet address
  );

  await potatoPatch.waitForDeployment();

  const address = await potatoPatch.getAddress();

  console.log("✅ PotatoPatch deployed to:", address);
  console.log("\n📝 Add this to your frontend .env.local:");
  console.log(`NEXT_PUBLIC_PATCH_ADDRESS=${address}`);
  console.log("\n🔍 Verify on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${address}`);
  console.log("\n💡 Next steps:");
  console.log("1. Update .env.local with the contract address");
  console.log("2. Fund the Spender wallet with Base Sepolia ETH (for gas)");
  console.log("3. Deposit treasury funds: contract.depositTreasury(amount)");
  console.log("4. Spender wallet:", config.spenderAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
