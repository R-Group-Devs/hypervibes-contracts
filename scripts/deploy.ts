import { ethers } from "hardhat";

async function main() {
  const HyperVIBES = await ethers.getContractFactory("HyperVIBES");
  const hv = await HyperVIBES.deploy();
  await hv.deployed();
  console.log(`🚀 HyperVIBES has been deployed to: ${hv.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
