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
  describe("realm administration", () => {
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

    const realmConstraints = () => {
      return {
        minDailyRate: 0,
        maxDailyRate: 0,
        minInfusionAmount: 0,
        maxInfusionAmount: 0,
        maxTokenBalance: 0,
        requireNftIsOwned: false,
        allowMultiInfuse: false,
        allowPublicInfusion: false,
        allowAllCollections: false,
      };
    };

    const createRealm = () => {
      return {
        name: "test realm",
        description: "description",
        admins: [],
        collections: [],
        infusers: [],
        config: {
          token: token.address,
          constraints: realmConstraints(),
        },
      };
    };

    const modifyRealm = () => {
      return {
        realmId: "1",
        adminsToAdd: [],
        adminsToRemove: [],
        infusersToAdd: [],
        infusersToRemove: [],
        collectionsToAdd: [],
        collectionsToRemove: [],
      };
    };

    it("should create a realm", async () => {
      await hv.createRealm(createRealm());
      expect((await hv.realmConfig("1")).token).equals(token.address);
    });
    it("should set constraints when creating a realm", async () => {
      const constraints = {
        // creating non-zero values for all to exercise a worst-case storage
        // usage for gas stats
        allowMultiInfuse: true,
        maxDailyRate: 500,
        maxInfusionAmount: 500,
        maxTokenBalance: 1000,
        minDailyRate: 50,
        minInfusionAmount: 500,
        allowAllCollections: true,
        allowPublicInfusion: true,
        requireNftIsOwned: true,
      };
      await hv.createRealm({
        ...createRealm(),
        config: { token: token.address, constraints },
      });
      const view = await hv.realmConfig("1");
      expect(view.constraints.maxDailyRate).to.equal(500);
    });
    it("should revert if attempting to modify a realm as a non-admin", async () => {
      await hv.createRealm(createRealm());
      await expect(hv.modifyRealm(modifyRealm())).to.be.revertedWith(
        "not realm admin"
      );
    });
    it("should revert if providing zero address for realm erc20", async () => {
      await expect(
        hv.createRealm({
          ...createRealm(),
          config: { ...createRealm().config, token: AddressZero },
        })
      ).to.be.revertedWith("invalid token");
    });
    it("should autoincrement realm id", async () => {
      await hv.createRealm(createRealm());
      await hv.createRealm(createRealm());
      expect((await hv.realmConfig("1")).token).equals(token.address);
      expect((await hv.realmConfig("2")).token).equals(token.address);
    });
    it("should emit a RealmCreated event on realm create", async () => {
      await expect(hv.createRealm(createRealm()))
        .to.emit(hv, "RealmCreated")
        .withArgs("1", "test realm", "description");
    });
    it("should add initial admins to realm", async () => {
      await hv.createRealm({
        ...createRealm(),
        admins: [a1, a2],
      });

      expect(await hv.isAdmin("1", a1)).to.equal(true);
      expect(await hv.isAdmin("1", a2)).to.equal(true);
      expect(await hv.isAdmin("1", a3)).to.equal(false);
    });
    it("should add initial infusers to realm", async () => {
      await hv.createRealm({
        ...createRealm(),
        infusers: [a1, a2],
      });

      expect(await hv.isInfuser("1", a1)).to.equal(true);
      expect(await hv.isInfuser("1", a2)).to.equal(true);
      expect(await hv.isInfuser("1", a3)).to.equal(false);
    });
    it("should add initial collections to realm", async () => {
      await hv.createRealm({
        ...createRealm(),
        collections: [collection.address],
      });
      expect(await hv.isCollection("1", collection.address)).to.equal(true);
    });
    it("should add admins via modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await hv.modifyRealm({
        ...modifyRealm(),
        adminsToAdd: [a1],
      });
      expect(await hv.isAdmin("1", a1)).to.equal(true);
    });
    it("should remove admins via modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await hv.modifyRealm({
        ...modifyRealm(),
        adminsToRemove: [a0],
      });
      expect(await hv.isAdmin("1", a0)).to.equal(false);
    });
    it("should add infusers via modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await hv.modifyRealm({
        ...modifyRealm(),
        infusersToAdd: [a1],
      });
      expect(await hv.isInfuser("1", a1)).to.equal(true);
    });
    it("should remove infusers via modifyRealm", async () => {
      await hv.createRealm({
        ...createRealm(),
        admins: [a0],
        infusers: [a1],
      });
      expect(await hv.isInfuser("1", a1)).to.equal(true);
      await hv.modifyRealm({
        ...modifyRealm(),
        infusersToRemove: [a1],
      });
      expect(await hv.isInfuser("1", a0)).to.equal(false);
    });
    it("should add collections via modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await hv.modifyRealm({
        ...modifyRealm(),
        collectionsToAdd: [collection.address],
      });
      expect(await hv.isCollection("1", collection.address)).to.equal(true);
    });
    it("should remove collections via modifyRealm", async () => {
      await hv.createRealm({
        ...createRealm(),
        admins: [a0],
        collections: [collection.address],
      });
      expect(await hv.isCollection("1", collection.address)).to.equal(true);
      await hv.modifyRealm({
        ...modifyRealm(),
        collectionsToRemove: [collection.address],
      });
      expect(await hv.isCollection("1", collection.address)).to.equal(false);
    });
    it("should emit an AdminAdded event on modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await expect(hv.modifyRealm({ ...modifyRealm(), adminsToAdd: [a1] }))
        .to.emit(hv, "AdminAdded")
        .withArgs("1", a1);
    });
    it("should emit an AdminRemoved event on modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await expect(hv.modifyRealm({ ...modifyRealm(), adminsToRemove: [a0] }))
        .to.emit(hv, "AdminRemoved")
        .withArgs("1", a0);
    });
    it("should emit an InfuserAdded event on modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await expect(hv.modifyRealm({ ...modifyRealm(), infusersToAdd: [a1] }))
        .to.emit(hv, "InfuserAdded")
        .withArgs("1", a1);
    });
    it("should emit an InfuserRemoved event on modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await expect(hv.modifyRealm({ ...modifyRealm(), infusersToRemove: [a0] }))
        .to.emit(hv, "InfuserRemoved")
        .withArgs("1", a0);
    });
    it("should emit a CollectionAdded event on modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await expect(
        hv.modifyRealm({
          ...modifyRealm(),
          collectionsToAdd: [collection.address],
        })
      )
        .to.emit(hv, "CollectionAdded")
        .withArgs("1", collection.address);
    });
    it("should emit an CollectionRemoved event on modifyRealm", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await expect(
        hv.modifyRealm({
          ...modifyRealm(),
          collectionsToRemove: [collection.address],
        })
      )
        .to.emit(hv, "CollectionRemoved")
        .withArgs("1", collection.address);
    });
    it("should revert when adding or removing entities with zero address", async () => {
      await hv.createRealm({ ...createRealm(), admins: [a0] });
      await expect(
        hv.modifyRealm({ ...modifyRealm(), adminsToAdd: [AddressZero] })
      ).to.be.revertedWith("invalid admin");
      await expect(
        hv.modifyRealm({ ...modifyRealm(), adminsToRemove: [AddressZero] })
      ).to.be.revertedWith("invalid admin");
      await expect(
        hv.modifyRealm({ ...modifyRealm(), infusersToAdd: [AddressZero] })
      ).to.be.revertedWith("invalid infuser");
      await expect(
        hv.modifyRealm({ ...modifyRealm(), infusersToRemove: [AddressZero] })
      ).to.be.revertedWith("invalid infuser");
      await expect(
        hv.modifyRealm({ ...modifyRealm(), collectionsToAdd: [AddressZero] })
      ).to.be.revertedWith("invalid collection");
      await expect(
        hv.modifyRealm({
          ...modifyRealm(),
          collectionsToRemove: [AddressZero],
        })
      ).to.be.revertedWith("invalid collection");
    });
  });
});
