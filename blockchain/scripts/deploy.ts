import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const LandRegistry = await ethers.getContractFactory("LandRegistry");
  const contract = await LandRegistry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ LandRegistry deployed to:", address);
  console.log("");
  console.log("Add this to your .env:");
  console.log(`BLOCKCHAIN_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});