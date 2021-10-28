import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { HyperVIBES, MockERC20, MockERC721 } from "../typechain";

const { AddressZero } = ethers.constants;
const { parseUnits } = ethers.utils;

describe("HyperVIBES", function () {
  // ---
  // fixtures
  // ---

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
    // give infinite allowance for a0 to hv
    await token.approve(hv.address, BigNumber.from(2).pow(256).sub(1));
    [a0, a1, a2, a3] = accounts.map((a) => a.address);
  });

  const realmConstraints = () => {
    return {
      minDailyRate: parseUnits("0"),
      maxDailyRate: parseUnits("1000"),
      minInfusionAmount: parseUnits("0"),
      maxInfusionAmount: parseUnits("100000"),
      maxTokenBalance: parseUnits("100000"),
      requireNftIsOwned: true,
      allowMultiInfuse: false,
      allowPublicInfusion: false,
      allowAllCollections: true,
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

  // ---
  // basics
  // ---

  it("should snap on the dot sol", async function () {
    expect(await hv.name()).equals("HyperVIBES");
  });

  // ---
  // admin
  // ---

  describe("realm administration", () => {
    it("should create a realm", async () => {
      await hv.createRealm(createRealm());
      expect((await hv.realmConfig("1")).token).equals(token.address);
    });
    it("should revert if min daily rate exceeds max daily rate", async () => {
      const create = createRealm();
      create.config.constraints.minDailyRate = BigNumber.from(500);
      create.config.constraints.maxDailyRate = BigNumber.from(0);
      await expect(hv.createRealm(create)).to.be.revertedWith(
        "invalid min/max daily rate"
      );
    });
    it("should revert if min infusion amount exceeds max infusion amount", async () => {
      const create = createRealm();
      create.config.constraints.minInfusionAmount = BigNumber.from(500);
      create.config.constraints.maxInfusionAmount = BigNumber.from(0);
      await expect(hv.createRealm(create)).to.be.revertedWith(
        "invalid min/max amount"
      );
    });
    it("should revert if max infusion amount is zero", async () => {
      const create = createRealm();
      create.config.constraints.minInfusionAmount = BigNumber.from(0);
      create.config.constraints.maxInfusionAmount = BigNumber.from(0);
      await expect(hv.createRealm(create)).to.be.revertedWith(
        "invalid max amount"
      );
    });
    it("should revert if max token balance is zero", async () => {
      const create = createRealm();
      create.config.constraints.maxTokenBalance = BigNumber.from(0);
      await expect(hv.createRealm(create)).to.be.revertedWith(
        "invalid max token balance"
      );
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
    it("should revert if attempting to modify a non-existant realm", async () => {
      await hv.createRealm(createRealm());
      await expect(
        hv.modifyRealm({ ...modifyRealm(), realmId: "420" })
      ).to.be.revertedWith("invalid realm");
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

  // ---
  // end-users
  // ---

  describe("infusion", () => {
    // ---
    // fixtures
    // ---

    const infuse = () => {
      return {
        realmId: "1",
        collection: collection.address,
        tokenId: "420",
        infuser: a0,
        dailyRate: parseUnits("1000"),
        amount: parseUnits("50000"),
        comment: "comment",
      };
    };

    // ---
    // tests
    // ---

    it("should infuse tokens from msg.sender to nft", async () => {
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("60000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse() });
      expect(await token.balanceOf(a0)).to.equal(parseUnits("10000"));
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("50000"));
      expect(await token.balanceOf(hv.address)).to.equal(parseUnits("50000"));
    });
    it("should clamp infused amount to to max token balance", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");

      const create = createRealm();
      create.config.constraints.maxTokenBalance = parseUnits("60000");
      create.config.constraints.allowPublicInfusion = true;
      await hv.createRealm(create);
      await hv.infuse({ ...infuse(), amount: parseUnits("100000") });

      expect(await token.balanceOf(a0)).to.equal(parseUnits("40000")); // only took 60000
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("60000"));
    });
    it("should emit an Infused event", () => {});
    it("should revert on an invalid token id", () => {});
    it("should revert on an invalid token contract", () => {});
    it("should revert on an invalid realm", () => {});
    it("should revert if amount is too high", () => {});
    it("should revert if amount is too low", () => {});
    it("should revert if nft not owned by infuser and requireNftIsOwned is true", () => {});
    it("should revert if attempting delegated infusion by non-infuser", () => {});
    it("should revert if attempting public infusion when allowPublicInfusion is false", () => {});
    it("should revert if infusing a non-whitelisted collection and allowAllCollections is false", () => {});
    it("should revert if dailyRate is different from initial value on subsequent infusions", () => {});
    it("should revert if infusing a second time when allowMultiInfuse is false", () => {});
    it("should revert if daily rate too high", () => {});
    it("should revert if daily rate too low", () => {});
  });
  describe.only("claiming", () => {
    // ---
    // fixtures
    // ---

    const infuse = () => {
      return {
        realmId: "1",
        collection: collection.address,
        tokenId: "420",
        infuser: a0,
        dailyRate: parseUnits("1000"),
        amount: parseUnits("10000"),
        comment: "comment",
      };
    };

    const claim = () => {
      return {
        realmId: "1",
        collection: collection.address,
        tokenId: "420",
        amount: parseUnits("100000"), // all
      };
    };

    const mineNextBlock = () => ethers.provider.send("evm_mine", []);

    const increaseTimestampAndMineNextBlock = async (
      offsetInSeconds: number
    ) => {
      await ethers.provider.send("evm_increaseTime", [offsetInSeconds]);
      await mineNextBlock();
    };

    beforeEach(async () => {
      await ethers.provider.send("evm_setAutomine", [false]);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_setAutomine", [true]);
    });

    // ---
    // tests
    // ---
    it("should claim tokens", async () => {
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await mineNextBlock();

      // jump 1 day
      await increaseTimestampAndMineNextBlock(60 * 60 * 24);
      await hv.claim({ ...claim(), amount: parseUnits("1000") });
      await mineNextBlock();
      expect(await token.balanceOf(a0)).to.equal(parseUnits("1000"));

      // jump 1 day
      await increaseTimestampAndMineNextBlock(60 * 60 * 24);
      await hv.claim({ ...claim(), amount: parseUnits("1000") });
      await mineNextBlock();
      expect(await token.balanceOf(a0)).to.equal(parseUnits("2000"));

      // jump 100 days
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 100);
      await hv.claim({ ...claim(), amount: parseUnits("10000") });
      await mineNextBlock();
      expect(await token.balanceOf(a0)).to.equal(parseUnits("10000"));
    });
    it("should emit a Claimed event on claim", async () => {});
    it("should revert if nothing to claim", async () => {});
    it("should revert if not token owner", async () => {});
    it("should allow claiming if approved", async () => {});
    it("should allow claiming if approved for all", async () => {});
    it("should revert if attempting to claim from un-infused token", async () => {});
    it("should only claim one day of tokens after one day", async () => {});
    it("should claim entire balance after tokens fully mined out", async () => {});
  });
});
