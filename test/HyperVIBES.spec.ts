import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  HyperVIBES,
  MockERC20,
  MockERC721,
  ReferenceERC721,
} from "../typechain";

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
      minInfusionAmount: parseUnits("0"),
      maxInfusionAmount: parseUnits("100000"),
      maxTokenBalance: parseUnits("100000"),
      minClaimAmount: parseUnits("0"),
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
        dailyRate: parseUnits("1000"),
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
    it("should revert if minClaimAmount is greater than maxTokenBalance", async () => {
      const create = createRealm();
      create.config.constraints.maxTokenBalance = parseUnits("1000");
      create.config.constraints.minClaimAmount = parseUnits("1001");
      await expect(hv.createRealm(create)).to.be.revertedWith(
        "invalid min claim amount"
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
    it("should batch infuse tokens from msg.sender to nft", async () => {
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("1000000"));
      const tokenIds = [...new Array(100)].map((_, idx) => `${idx + 1}`);
      for (const tokenId of tokenIds) {
        await collection.mint(tokenId);
      }
      await hv.batchInfuse(
        tokenIds.map((tokenId) => {
          return {
            amount: parseUnits("1000"),
            collection: collection.address,
            comment: "",
            infuser: a0,
            realmId: "1",
            tokenId,
          };
        })
      );
      expect(await token.balanceOf(a0)).to.equal(parseUnits("900000"));
      expect(
        (await hv.tokenData("1", collection.address, "1")).balance
      ).to.equal(parseUnits("1000"));
      expect(await token.balanceOf(hv.address)).to.equal(parseUnits("100000"));
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
    it("should handle multi infusion", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.allowMultiInfuse = true;
      await hv.createRealm(create);
      await hv.infuse({ ...infuse(), amount: parseUnits("1000") });
      await hv.infuse({ ...infuse(), amount: parseUnits("1000") });
      await hv.infuse({ ...infuse(), amount: parseUnits("1000") });

      expect(await token.balanceOf(a0)).to.equal(parseUnits("97000"));
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("3000"));
    });
    it("should emit an Infused event", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [a0] };
      await hv.createRealm(create);
      await expect(hv.infuse({ ...infuse(), amount: parseUnits("1000") }))
        .to.emit(hv, "Infused")
        .withArgs(
          "1",
          collection.address,
          "420",
          a0,
          parseUnits("1000"),
          "comment"
        );
    });
    it("should revert on an invalid token id", async () => {
      await token.mint(parseUnits("100000"));
      const create = { ...createRealm(), infusers: [a0] };
      await hv.createRealm(create);
      await expect(hv.infuse(infuse())).to.revertedWith("invalid token");
    });
    it("should revert on an invalid token contract", async () => {
      await token.mint(parseUnits("100000"));
      const create = { ...createRealm(), infusers: [a0] };
      await hv.createRealm(create);
      await expect(
        hv.infuse({ ...infuse(), collection: token.address })
      ).to.be.revertedWith("invalid token");
    });
    it("should revert on an invalid realm", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [a0] };
      await hv.createRealm(create);
      await expect(
        hv.infuse({ ...infuse(), realmId: "123" })
      ).to.be.revertedWith("invalid realm");
    });
    it("should revert if amount is too high", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.maxInfusionAmount = parseUnits("1000");
      await hv.createRealm(create);
      await expect(
        hv.infuse({ ...infuse(), amount: parseUnits("10000") })
      ).to.be.revertedWith("amount too high");
    });
    it("should revert if amount is too low", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.minInfusionAmount = parseUnits("1000");
      await hv.createRealm(create);
      await expect(
        hv.infuse({ ...infuse(), amount: parseUnits("10") })
      ).to.be.revertedWith("amount too low");
    });
    it("should revert if nft not owned by infuser and requireNftIsOwned is true", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      await collection.transferFrom(a0, a1, "420");
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.requireNftIsOwned = true;
      await hv.createRealm(create);
      await expect(hv.infuse({ ...infuse() })).to.be.revertedWith(
        "nft not owned by infuser"
      );
    });
    it("should revert if attempting proxy infusion by non-proxy", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      await collection.transferFrom(a0, a1, "420");
      const create = { ...createRealm(), infusers: [a0] };
      await hv.createRealm(create);
      await expect(hv.infuse({ ...infuse(), infuser: a1 })).to.be.revertedWith(
        "invalid proxy infusion"
      );
    });
    it("should revert if attempting proxy infusion by non-proxy thats on the allowlist", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      await collection.transferFrom(a0, a1, "420");
      const create = { ...createRealm(), infusers: [a0, a1] };
      await hv.createRealm(create);
      await expect(hv.infuse({ ...infuse(), infuser: a1 })).to.be.revertedWith(
        "invalid proxy infusion"
      );
    });
    it("should revert if attempting public infusion when allowPublicInfusion is false", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [] };
      await hv.createRealm(create);
      await expect(hv.infuse({ ...infuse() })).to.be.revertedWith(
        "invalid infuser"
      );
    });
    it("should allow public infusions when allowPublicInfusion flag is true", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [] };
      create.config.constraints.allowPublicInfusion = true;
      await hv.createRealm(create);
      await hv.infuse({ ...infuse(), amount: parseUnits("1000") });
      expect(await token.balanceOf(a0)).to.equal(parseUnits("99000"));
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("1000"));
    });
    it("should revert if infusing a non-allowed collection and allowAllCollections is false", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [a0], collection: [] };
      create.config.constraints.allowAllCollections = false;
      await hv.createRealm(create);
      await expect(hv.infuse(infuse())).to.be.revertedWith(
        "invalid collection"
      );
    });
    it("should revert if infusing a second time when allowMultiInfuse is false", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.allowMultiInfuse = false;
      await hv.createRealm(create);
      await hv.infuse({ ...infuse(), amount: parseUnits("1000") });
      await expect(
        hv.infuse({ ...infuse(), amount: parseUnits("1000") })
      ).to.be.revertedWith("multi infuse disabled");
    });
    it("should revert if clamped infusion amount is zero on multi-infuse", async () => {
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.maxTokenBalance = parseUnits("10000");
      create.config.constraints.allowMultiInfuse = true;
      await hv.createRealm(create);
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await expect(
        hv.infuse({ ...infuse(), amount: parseUnits("10000") })
      ).to.be.revertedWith("max token balance");
    });
  });
  describe("infusion proxy management", () => {
    it("should emit an InfusionProxyAdded event when adding a proxy", async () => {
      await hv.createRealm(createRealm());
      await expect(hv.allowInfusionProxy("1", a1))
        .to.emit(hv, "InfusionProxyAdded")
        .withArgs("1", a1);
    });
    it("should emit an InfusionProxyRemoved event when removing a proxy", async () => {
      await hv.createRealm(createRealm());
      await expect(hv.denyInfusionProxy("1", a1))
        .to.emit(hv, "InfusionProxyRemoved")
        .withArgs("1", a1);
    });
    it("should revert if providing an invalid realm to allowInfusionProxy", async () => {
      await expect(hv.allowInfusionProxy("1", a1)).to.be.revertedWith(
        "invalid realm"
      );
    });
    it("should revert if providing an invalid realm to denyInfusionProxy", async () => {
      await expect(hv.denyInfusionProxy("1", a1)).to.be.revertedWith(
        "invalid realm"
      );
    });
  });
  describe("claiming", () => {
    // ---
    // fixtures
    // ---

    const infuse = () => {
      return {
        realmId: "1",
        collection: collection.address,
        tokenId: "420",
        infuser: a0,
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
    const setAutomine = (set = true) =>
      ethers.provider.send("evm_setAutomine", [set]);

    const increaseTimestampAndMineNextBlock = async (
      offsetInSeconds: number
    ) => {
      await ethers.provider.send("evm_increaseTime", [offsetInSeconds]);
      await mineNextBlock();
    };

    beforeEach(() => setAutomine(false));
    afterEach(() => setAutomine(true));

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
    it("should batch claim tokens", async () => {
      await setAutomine();
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("100000"));
      const tokenIds = [...new Array(100)].map((_, idx) => `${idx + 1}`);
      for (const tokenId of tokenIds) {
        await collection.mint(tokenId);
      }

      await hv.batchInfuse(
        tokenIds.map((tokenId) => {
          return {
            amount: parseUnits("1000"),
            collection: collection.address,
            comment: "",
            infuser: a0,
            realmId: "1",
            tokenId,
          };
        })
      );

      // jump 1 day
      await increaseTimestampAndMineNextBlock(60 * 60 * 24);

      await hv.batchClaim(
        tokenIds.map((tokenId) => {
          return {
            amount: parseUnits("1000"),
            collection: collection.address,
            realmId: "1",
            tokenId,
          };
        })
      );

      expect(await token.balanceOf(a0)).to.equal(parseUnits("100000"));
      expect(await token.balanceOf(hv.address)).to.equal(parseUnits("0"));
    });
    it("should emit a Claimed event on claim", async () => {
      await setAutomine();
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24);

      await expect(hv.claim({ ...claim(), amount: parseUnits("1000") }))
        .to.emit(hv, "Claimed")
        .withArgs("1", collection.address, "420", parseUnits("1000"));
    });
    it("should revert if nothing to claim", async () => {
      await setAutomine();
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1000);
      await hv.claim({ ...claim(), amount: parseUnits("10000") }); // claim all
      await expect(
        hv.claim({ ...claim(), amount: parseUnits("10000") })
      ).to.be.revertedWith("nothing to claim");
    });
    it("should revert if not token owner", async () => {
      await setAutomine();
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1000);
      const hv1 = hv.connect(accounts[1]);
      await expect(
        hv1.claim({ ...claim(), amount: "10000" })
      ).to.be.revertedWith("not owner or approved");
    });
    it("should allow claiming if approved", async () => {
      await setAutomine();
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await collection.approve(a1, "420"); // <-- a1 approved for token
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1000);
      const hv1 = hv.connect(accounts[1]);
      await hv1.claim({ ...claim(), amount: parseUnits("1000") });
      expect(await token.balanceOf(a1)).to.equal(parseUnits("1000"));
    });
    it("should allow claiming if approved for all", async () => {
      await setAutomine();
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await collection.setApprovalForAll(a1, true); // <-- a1 approved for token
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1000);
      const hv1 = hv.connect(accounts[1]);
      await hv1.claim({ ...claim(), amount: parseUnits("1000") });
      expect(await token.balanceOf(a1)).to.equal(parseUnits("1000"));
    });
    it("should revert if attempting to claim from un-infused token", async () => {
      await setAutomine();
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1000);
      await expect(hv.claim({ ...claim() })).to.be.revertedWith(
        "token not infused"
      );
    });
    it("should revert if claiming less than minClaimAmount", async () => {
      await setAutomine();
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.minClaimAmount = parseUnits("1000");
      await hv.createRealm(create);
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1000);
      await expect(
        hv.claim({ ...claim(), amount: parseUnits("50") })
      ).to.be.revertedWith("amount too low");
    });
    it("should revert if claiming less than minClaimAmount when amount is gt token balance", async () => {
      await setAutomine();
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.minClaimAmount = parseUnits("1000");
      await hv.createRealm(create);
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await increaseTimestampAndMineNextBlock(60 * 60);
      await expect(
        hv.claim({ ...claim(), amount: parseUnits("100000") })
      ).to.be.revertedWith("amount too low");
    });
    it("should only claim one day of tokens after one day", async () => {
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await mineNextBlock();

      // jump 1 day
      await hv.claim({ ...claim(), amount: parseUnits("100000") }); // attempt overclaim
      await increaseTimestampAndMineNextBlock(60 * 60 * 24);
      expect(await token.balanceOf(a0)).to.equal(parseUnits("1000"));
    });
    it("should claim entire balance after tokens fully mined out", async () => {
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await mineNextBlock();

      // jump way forward
      await hv.claim({ ...claim(), amount: parseUnits("100000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 365);
      expect(await token.balanceOf(a0)).to.equal(parseUnits("10000"));
    });
    it("should only allow claiming newly mined tokens after re-infusing an empty nft", async () => {
      const create = { ...createRealm(), infusers: [a0] };
      create.config.constraints.allowMultiInfuse = true;
      await hv.createRealm(create);
      await token.mint(parseUnits("100000"));
      await collection.mint("420");
      await hv.infuse({
        ...infuse(),
        amount: parseUnits("10000"),
      });
      await mineNextBlock();

      // jump forward , claim all
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 10);
      await hv.claim({ ...claim(), amount: parseUnits("10000") });
      await mineNextBlock();
      expect(await token.balanceOf(a0)).to.equal(parseUnits("100000"));
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("0"));

      // jump forward alot
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 365);
      await hv.infuse({
        ...infuse(),
        amount: parseUnits("100000"),
      });
      await mineNextBlock();

      // jump forward 1 day , assert only 1 days worth claimable
      await hv.claim({ ...claim(), amount: parseUnits("100000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1);
      expect(await token.balanceOf(a0)).to.equal(parseUnits("1000"));
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("99000"));
    });
    it("should reduce claimable following a claim", async () => {
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await mineNextBlock();

      // jump 1 day
      await hv.claim({ ...claim(), amount: parseUnits("100000") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24);
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("9000"));
      expect(await token.balanceOf(a0)).to.equal(parseUnits("1000"));
    });
    it("should not allow claiming immediately after claiming", async () => {
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await mineNextBlock();

      // jump 1 day
      await hv.claim({ ...claim(), amount: parseUnits("100000") });
      await hv.claim({ ...claim(), amount: parseUnits("100000") });
      await hv.claim({ ...claim(), amount: parseUnits("100000") });
      await hv.claim({ ...claim(), amount: parseUnits("100000") }); // several overlcaims
      await increaseTimestampAndMineNextBlock(60 * 60 * 24);
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("9000"));
      expect(await token.balanceOf(a0)).to.equal(parseUnits("1000"));
    });
    it("should handle partial claiming", async () => {
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await token.mint(parseUnits("10000"));
      await collection.mint("420");
      await hv.infuse({ ...infuse(), amount: parseUnits("10000") });
      await mineNextBlock();
      await hv.claim({ ...claim(), amount: parseUnits("100") });
      await hv.claim({ ...claim(), amount: parseUnits("100") });
      await hv.claim({ ...claim(), amount: parseUnits("100") });
      await hv.claim({ ...claim(), amount: parseUnits("200") });
      await increaseTimestampAndMineNextBlock(60 * 60 * 24);
      expect(
        (await hv.tokenData("1", collection.address, "420")).balance
      ).to.equal(parseUnits("9500"));
      expect(await token.balanceOf(a0)).to.equal(parseUnits("500"));
    });
    it("should revert if attempting to claim from an invalid token", async () => {
      await setAutomine();
      await hv.createRealm({ ...createRealm(), infusers: [a0] });
      await expect(hv.claim({ ...claim() })).to.be.revertedWith(
        "invalid token"
      );
    });
  });
  describe("reference 721 contract", () => {
    let ref721: ReferenceERC721;

    beforeEach(async () => {
      const ReferenceERC721 = await ethers.getContractFactory(
        "ReferenceERC721"
      );
      ref721 = await ReferenceERC721.deploy();
    });

    // ---
    // testing integration with an ERC721 that infuses on mint
    // ---

    it("should infuse on mint", async () => {
      // create the realm -- this will be done via the UI
      await hv.createRealm({
        ...createRealm(),
        admins: [], // no admins, keeps things safe but prevents any modifications
        collections: [ref721.address], // only nfts from the 721 can be infused
        infusers: [ref721.address], // only the 721 contract can infuse
        config: {
          ...createRealm().config,
          constraints: {
            ...realmConstraints(),
            requireNftIsOwned: false, // the 721 will infuse after mint, will be in minters wallet
            allowMultiInfuse: false, // not needed
            allowPublicInfusion: false, // dont want anyone else infusing on this realm
            allowAllCollections: false, // only want our 721 involved for now
          },
        },
      });

      // point the collection at hv -- needs to just be done once
      await ref721.setHyperVIBES(token.address, "1", hv.address);

      // stock the 721 with tokens -- need to provide (tokens per NFT * total NFT) tokens
      await token.mint(parseUnits("300000"));
      await token.transfer(ref721.address, parseUnits("300000"));

      // mint 3 tokens, checking that they're properly infused, and that the tokens have left the erc721

      await ref721.mint("420");
      expect((await hv.tokenData("1", ref721.address, "420")).balance).to.equal(
        parseUnits("100000")
      );
      expect(await token.balanceOf(ref721.address)).to.equal(
        parseUnits("200000")
      );

      await ref721.mint("69");
      expect((await hv.tokenData("1", ref721.address, "69")).balance).to.equal(
        parseUnits("100000")
      );
      expect(await token.balanceOf(ref721.address)).to.equal(
        parseUnits("100000")
      );

      await ref721.mint("123");
      expect((await hv.tokenData("1", ref721.address, "123")).balance).to.equal(
        parseUnits("100000")
      );
      expect(await token.balanceOf(ref721.address)).to.equal(parseUnits("0"));
    });
  });
});
