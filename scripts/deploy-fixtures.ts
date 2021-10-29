import { utils } from "ethers";
import { ethers } from "hardhat";

const { parseUnits } = utils;

async function main() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const MockERC721 = await ethers.getContractFactory("MockERC721");
  const ReferenceERC721 = await ethers.getContractFactory("ReferenceERC721");

  const [token, collection] = await Promise.all([
    MockERC20.deploy(),
    MockERC721.deploy(),
  ]);

  // deploy 721 and give it a ton of tokens
  const ref721 = await ReferenceERC721.deploy(token.address);
  await token.mint(parseUnits("1000000000"));

  const bagRecipients = [
    "0x5b0124B9501DDAC436a41feF31Bcc173992E888a",
    "0xA34C3476ae0C4863fc39E32C0E666219503bED9F",
  ];

  await Promise.all(
    bagRecipients.map(async (addr) => {
      const bag = parseUnits("1000000000");
      await token.mint(bag);
      await token.transfer(addr, bag);
      console.log(`sent ${addr} a bag`);
    })
  );

  console.log(`MockERC20: ${token.address}`);
  console.log(`MockERC721: ${collection.address}`);
  console.log(`ReferenceERC721: ${ref721.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
