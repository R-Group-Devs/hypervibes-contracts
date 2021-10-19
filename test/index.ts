// import { expect } from "chai";
import { ethers } from "hardhat";

describe("HyperVIBES", function () {
  it("deploy without issue", async function () {
    const HyperVIBES = await ethers.getContractFactory("HyperVIBES");
    const hv = await HyperVIBES.deploy();
    await hv.deployed();
  });
});
