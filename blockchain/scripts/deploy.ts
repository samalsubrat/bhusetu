import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const LandRegistry = await ethers.getContractFactory("LandRegistry");
  const contract = await LandRegistry.deploy();
  await contract.waitForDeployment();

  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});