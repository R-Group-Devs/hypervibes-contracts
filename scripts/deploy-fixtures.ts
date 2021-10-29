import { utils } from "ethers";
import { ethers } from "hardhat";

const { parseUnits } = utils;

const BAG = parseUnits("1000000000");

async function main() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const MockERC721 = await ethers.getContractFactory("MockERC721");
  const ReferenceERC721 = await ethers.getContractFactory("ReferenceERC721");

  console.log("deploying tokens");
  const token = await MockERC20.deploy();
  const collection = await MockERC721.deploy();
  await Promise.all([token.deployed(), collection.deployed()]);

  console.log("minting bags");
  const trx1 = await token.mint(parseUnits("1000000000").mul(50));
  console.log("waiting for confirmations on mint");
  await trx1.wait(3);

  // deploy 721 and give it a ton of tokens
  console.log("deploying ref721");
  const ref721 = await ReferenceERC721.deploy(token.address);
  await ref721.deployed();
  console.log("bagging the ref721");
  await token.transfer(ref721.address, BAG);

  const bagRecipients = [
    "0x5b0124B9501DDAC436a41feF31Bcc173992E888a",
    "0xA34C3476ae0C4863fc39E32C0E666219503bED9F",
  ];

  console.log("bagging recipients");
  for (const addr of bagRecipients) {
    await token.transfer(addr, BAG);
    console.log(`sent ${addr} a bag`);
  }

  console.log(`MockERC20: ${token.address}`);
  console.log(`MockERC721: ${collection.address}`);
  console.log(`ReferenceERC721: ${ref721.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
