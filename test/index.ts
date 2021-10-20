import { expect } from "chai";
import { ethers } from "hardhat";

describe("HyperVIBES", function () {
  it("should snap on the dot sol", async function () {
    const HyperVIBES = await ethers.getContractFactory("HyperVIBES");
    const hv = await HyperVIBES.deploy();
    await hv.deployed();
    expect(await hv.name()).equals("HyperVIBES");
  });
});
