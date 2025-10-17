import { ethers } from "hardhat";

async function main() {
  console.log("🪙 Deploying TestUSDC to Base Sepolia...\n");

  const TestUSDC = await ethers.getContractFactory("TestUSDC");
  const usdc = await TestUSDC.deploy();

  await usdc.waitForDeployment();

  const address = await usdc.getAddress();

  console.log("✅ TestUSDC deployed to:", address);
  console.log("\n📝 Update your .env.local:");
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${address}`);
  console.log("\n💡 To get test tokens:");
  console.log(
    `1. Go to: https://sepolia.basescan.org/address/${address}#writeContract`
  );
  console.log(`2. Connect wallet`);
  console.log(`3. Call 'faucet' function to get 100 USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
