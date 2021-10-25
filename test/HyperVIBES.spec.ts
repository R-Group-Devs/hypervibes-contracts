import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { HyperVIBES, MockERC20, MockERC721 } from "../typechain";

const { AddressZero } = ethers.constants;

describe("HyperVIBES", function () {
  it("should snap on the dot sol", async function () {
    const HyperVIBES = await ethers.getContractFactory("HyperVIBES");
    const hv = await HyperVIBES.deploy();
    await hv.deployed();
    expect(await hv.name()).equals("HyperVIBES");
  });
  describe("tenant administration", () => {
    let hv: HyperVIBES;
    let token: MockERC20;
    let collection: MockERC721;
    let accounts: SignerWithAddress[];
    let a0: string, a1: string, a2: string, a3: string;

    beforeEach(async () => {
      const HyperVIBES = await ethers.getContractFactory("HyperVIBES");
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const MockERC721 = await ethers.getContractFactory("MockERC721");
      [hv, token, collection, accounts] = await Promise.all([
        HyperVIBES.deploy(),
        MockERC20.deploy(),
        MockERC721.deploy(),
        ethers.getSigners(),
      ]);
      [a0, a1, a2, a3] = accounts.map((a) => a.address);
    });

    const tenantConstraints = () => {
      return {
        minDailyRate: 0,
        imaxDailyRate: 0,
        minInfusionAmount: 0,
        imaxInfusionAmount: 0,
        imaxTokenBalance: 0,
        requireOwnedNft: false,
        disableMultiInfuse: false,
        requireInfusionWhitelist: false,
        requireCollectionWhitelist: false,
      };
    };

    const createTenant = () => {
      return {
        name: "test tenant",
        description: "description",
        admins: [],
        collections: [],
        infusers: [],
        config: {
          token: token.address,
          constraints: tenantConstraints(),
        },
      };
    };

    const modifyTenant = () => {
      return {
        tenantId: "1",
        adminsToAdd: [],
        adminsToRemove: [],
        infusersToAdd: [],
        infusersToRemove: [],
        collectionsToAdd: [],
        collectionsToRemove: [],
      };
    };

    it("should create a tenant", async () => {
      await hv.createTenant(createTenant());
      expect((await hv.tenantConfig("1")).token).equals(token.address);
    });
    it("should set constraints when creating a tenant", async () => {
      const constraints = {
        // creating non-zero values for all to exercise a worst-case storage
        // usage for gas stats
        disableMultiInfuse: true,
        imaxDailyRate: 500,
        imaxInfusionAmount: 500,
        imaxTokenBalance: 1000,
        minDailyRate: 50,
        minInfusionAmount: 500,
        requireCollectionWhitelist: true,
        requireInfusionWhitelist: true,
        requireOwnedNft: true,
      };
      await hv.createTenant({
        ...createTenant(),
        config: { token: token.address, constraints },
      });
      const view = await hv.tenantConfig("1");
      expect(view.constraints.imaxDailyRate).to.equal(500);
    });
    it("should revert if attempting to modify a tenant as a non-admin", async () => {
      await hv.createTenant(createTenant());
      await expect(hv.modifyTenant(modifyTenant())).to.be.revertedWith(
        "not tenant admin"
      );
    });
    it("should revert if providing zero address for tenant erc20", async () => {
      await expect(
        hv.createTenant({
          ...createTenant(),
          config: { ...createTenant().config, token: AddressZero },
        })
      ).to.be.revertedWith("invalid token");
    });
    it("should autoincrement tenant id", async () => {
      await hv.createTenant(createTenant());
      await hv.createTenant(createTenant());
      expect((await hv.tenantConfig("1")).token).equals(token.address);
      expect((await hv.tenantConfig("2")).token).equals(token.address);
    });
    it("should emit a TenantCreated event on tenant create", async () => {
      await expect(hv.createTenant(createTenant()))
        .to.emit(hv, "TenantCreated")
        .withArgs("1", "test tenant", "description");
    });
    it("should add initial admins to tenant", async () => {
      await hv.createTenant({
        ...createTenant(),
        admins: [a1, a2],
      });

      expect(await hv.isAdmin("1", a1)).to.equal(true);
      expect(await hv.isAdmin("1", a2)).to.equal(true);
      expect(await hv.isAdmin("1", a3)).to.equal(false);
    });
    it("should add initial infusers to tenant", async () => {
      await hv.createTenant({
        ...createTenant(),
        infusers: [a1, a2],
      });

      expect(await hv.isInfuser("1", a1)).to.equal(true);
      expect(await hv.isInfuser("1", a2)).to.equal(true);
      expect(await hv.isInfuser("1", a3)).to.equal(false);
    });
    it("should add initial collections to tenant", async () => {
      await hv.createTenant({
        ...createTenant(),
        collections: [collection.address],
      });
      expect(await hv.isCollection("1", collection.address)).to.equal(true);
    });
    it("should add admins via modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await hv.modifyTenant({
        ...modifyTenant(),
        adminsToAdd: [a1],
      });
      expect(await hv.isAdmin("1", a1)).to.equal(true);
    });
    it("should remove admins via modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await hv.modifyTenant({
        ...modifyTenant(),
        adminsToRemove: [a0],
      });
      expect(await hv.isAdmin("1", a0)).to.equal(false);
    });
    it("should add infusers via modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await hv.modifyTenant({
        ...modifyTenant(),
        infusersToAdd: [a1],
      });
      expect(await hv.isInfuser("1", a1)).to.equal(true);
    });
    it("should remove infusers via modifyTenant", async () => {
      await hv.createTenant({
        ...createTenant(),
        admins: [a0],
        infusers: [a1],
      });
      expect(await hv.isInfuser("1", a1)).to.equal(true);
      await hv.modifyTenant({
        ...modifyTenant(),
        infusersToRemove: [a1],
      });
      expect(await hv.isInfuser("1", a0)).to.equal(false);
    });
    it("should add collections via modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await hv.modifyTenant({
        ...modifyTenant(),
        collectionsToAdd: [collection.address],
      });
      expect(await hv.isCollection("1", collection.address)).to.equal(true);
    });
    it("should remove collections via modifyTenant", async () => {
      await hv.createTenant({
        ...createTenant(),
        admins: [a0],
        collections: [collection.address],
      });
      expect(await hv.isCollection("1", collection.address)).to.equal(true);
      await hv.modifyTenant({
        ...modifyTenant(),
        collectionsToRemove: [collection.address],
      });
      expect(await hv.isCollection("1", collection.address)).to.equal(false);
    });
    it("should emit an AdminAdded event on modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await expect(hv.modifyTenant({ ...modifyTenant(), adminsToAdd: [a1] }))
        .to.emit(hv, "AdminAdded")
        .withArgs("1", a1);
    });
    it("should emit an AdminRemoved event on modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await expect(hv.modifyTenant({ ...modifyTenant(), adminsToRemove: [a0] }))
        .to.emit(hv, "AdminRemoved")
        .withArgs("1", a0);
    });
    it("should emit an InfuserAdded event on modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await expect(hv.modifyTenant({ ...modifyTenant(), infusersToAdd: [a1] }))
        .to.emit(hv, "InfuserAdded")
        .withArgs("1", a1);
    });
    it("should emit an InfuserRemoved event on modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await expect(
        hv.modifyTenant({ ...modifyTenant(), infusersToRemove: [a0] })
      )
        .to.emit(hv, "InfuserRemoved")
        .withArgs("1", a0);
    });
    it("should emit a CollectionAdded event on modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await expect(
        hv.modifyTenant({
          ...modifyTenant(),
          collectionsToAdd: [collection.address],
        })
      )
        .to.emit(hv, "CollectionAdded")
        .withArgs("1", collection.address);
    });
    it("should emit an CollectionRemoved event on modifyTenant", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await expect(
        hv.modifyTenant({
          ...modifyTenant(),
          collectionsToRemove: [collection.address],
        })
      )
        .to.emit(hv, "CollectionRemoved")
        .withArgs("1", collection.address);
    });
    it("should revert when adding or removing entities with zero address", async () => {
      await hv.createTenant({ ...createTenant(), admins: [a0] });
      await expect(
        hv.modifyTenant({ ...modifyTenant(), adminsToAdd: [AddressZero] })
      ).to.be.revertedWith("invalid admin");
      await expect(
        hv.modifyTenant({ ...modifyTenant(), adminsToRemove: [AddressZero] })
      ).to.be.revertedWith("invalid admin");
      await expect(
        hv.modifyTenant({ ...modifyTenant(), infusersToAdd: [AddressZero] })
      ).to.be.revertedWith("invalid infuser");
      await expect(
        hv.modifyTenant({ ...modifyTenant(), infusersToRemove: [AddressZero] })
      ).to.be.revertedWith("invalid infuser");
      await expect(
        hv.modifyTenant({ ...modifyTenant(), collectionsToAdd: [AddressZero] })
      ).to.be.revertedWith("invalid collection");
      await expect(
        hv.modifyTenant({
          ...modifyTenant(),
          collectionsToRemove: [AddressZero],
        })
      ).to.be.revertedWith("invalid collection");
    });
  });
});
