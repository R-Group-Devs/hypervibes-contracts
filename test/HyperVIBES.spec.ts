import { expect } from "chai";
import { ethers } from "hardhat";

describe("HyperVIBES", function () {
  it("should snap on the dot sol", async function () {
    const HyperVIBES = await ethers.getContractFactory("HyperVIBES");
    const hv = await HyperVIBES.deploy();
    await hv.deployed();
    expect(await hv.name()).equals("HyperVIBES");
  });
  describe("tenant administration", () => {
    it("should create a tenant", async () => {});
    it("should autoincrement tenant id", async () => {});
    it("should emit an event during creation", async () => {});
    it("should add initial admins to tenant", async () => {});
    it("should add initial infusers to tenant", async () => {});
    it("should add initial collections to tenant", async () => {});
  });
});
