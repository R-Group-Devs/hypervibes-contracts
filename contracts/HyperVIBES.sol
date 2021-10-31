//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// data stored for-each infused token
struct TokenData {
    uint256 dailyRate;
    uint256 balance;
    uint256 lastClaimAt;
}

// per-realm configuration
struct RealmConfig {
    IERC20 token;
    RealmConstraints constraints;
}

// modifyiable realm constraints
struct RealmConstraints {
    // token mining rate must be at least min
    uint256 minDailyRate;

    // token mining rate cannot exceed max
    uint256 maxDailyRate;

    // min amount allowed for a single infusion
    uint256 minInfusionAmount;

    // max amount allowed for a single infusion
    uint256 maxInfusionAmount;

    // token cannot have a total infused balance greater than `maxTokenBalance`
    uint256 maxTokenBalance;

    // cannot execute a claim for less than this amount
    uint256 minClaimAmount;

    // if true, infuser must own the NFT being infused
    bool requireNftIsOwned;

    // if true, an nft can be infused multiple times
    bool allowMultiInfuse;

    // if true, any msg.sender may infuse. If false, msg.sender must be on the
    // allowlist
    bool allowPublicInfusion;

    // if true, any NFT from any collection may be infused. If false, contract
    // must be on the allowlist
    bool allowAllCollections;
}

// data provided when creating a realm
struct CreateRealmInput {
    string name;
    string description;
    RealmConfig config;
    address[] admins;
    address[] infusers;
    IERC721[] collections;
}

// data provided when modifying a realm
struct ModifyRealmInput {
    uint256 realmId;
    address[] adminsToAdd;
    address[] adminsToRemove;
    address[] infusersToAdd;
    address[] infusersToRemove;
    IERC721[] collectionsToAdd;
    IERC721[] collectionsToRemove;
}

// data provided when infusing an nft
struct InfuseInput {
    uint256 realmId;
    IERC721 collection;
    uint256 tokenId;
    address infuser;
    uint256 dailyRate;
    uint256 amount;
    string comment;
}

// data provided when claiming from an infused nft
struct ClaimInput {
    uint256 realmId;
    IERC721 collection;
    uint256 tokenId;
    uint256 amount;
}

contract HyperVIBES {
    // ---
    // storage
    // ---

    // realm ID -> realm data
    mapping(uint256 => RealmConfig) public realmConfig;

    // realm ID -> address -> (is admin flag)
    mapping(uint256 => mapping(address => bool)) public isAdmin;

    // realm ID -> address -> (is infuser flag)
    mapping(uint256 => mapping(address => bool)) public isInfuser;

    // realm ID -> erc721 -> (is allowed collection flag)
    mapping(uint256 => mapping(IERC721 => bool)) public isCollection;

    // realm ID -> nft -> token ID -> token data
    mapping(uint256 => mapping(IERC721 => mapping(uint256 => TokenData)))
        public tokenData;

    // realm ID -> operator -> infuser -> (is allowed infusion proxy flag)
    mapping(uint256 => mapping(address => mapping(address => bool))) public isInfusionProxy;

    uint256 public nextRealmId = 1;

    // ---
    // events
    // ---

    event RealmCreated(uint256 indexed realmId, string name, string description);

    event AdminAdded(uint256 indexed realmId, address indexed admin);

    event AdminRemoved(uint256 indexed realmId, address indexed admin);

    event InfuserAdded(uint256 indexed realmId, address indexed infuser);

    event InfuserRemoved(uint256 indexed realmId, address indexed infuser);

    event CollectionAdded(uint256 indexed realmId, IERC721 indexed collection);

    event CollectionRemoved(uint256 indexed realmId, IERC721 indexed collection);

    event InfusionProxyAdded(uint256 indexed realmId, address indexed proxy);

    event InfusionProxyRemoved(uint256 indexed realmId, address indexed proxy);

    event Infused(
        uint256 indexed realmId,
        IERC721 indexed collection,
        uint256 indexed tokenId,
        address infuser,
        uint256 amount,
        uint256 dailyRate,
        string comment
    );

    event Claimed(
        uint256 indexed realmId,
        IERC721 indexed collection,
        uint256 indexed tokenId,
        uint256 amount
    );

    // ---
    // admin mutations
    // ---

    // setup a new realm
    function createRealm(CreateRealmInput memory create) external {
        require(create.config.token != IERC20(address(0)), "invalid token");

        _validateRealmConstraints(create.config.constraints);
        uint256 realmId = nextRealmId++;
        realmConfig[realmId] = create.config;

        emit RealmCreated(realmId, create.name, create.description);

        for (uint256 i = 0; i < create.admins.length; i++) {
            _addAdmin(realmId, create.admins[i]);
        }

        for (uint256 i = 0; i < create.infusers.length; i++) {
            _addInfuser(realmId, create.infusers[i]);
        }

        for (uint256 i = 0; i < create.collections.length; i++) {
            _addCollection(realmId, create.collections[i]);
        }
    }

    // update mutable configuration for a realm
    function modifyRealm(ModifyRealmInput memory input) public {
        require(_realmExists(input.realmId), "invalid realm");
        require(isAdmin[input.realmId][msg.sender], "not realm admin");

        // adds

        for (uint256 i = 0; i < input.adminsToAdd.length; i++) {
            _addAdmin(input.realmId, input.adminsToAdd[i]);
        }

        for (uint256 i = 0; i < input.infusersToAdd.length; i++) {
            _addInfuser(input.realmId, input.infusersToAdd[i]);
        }

        for (uint256 i = 0; i < input.collectionsToAdd.length; i++) {
            _addCollection(input.realmId, input.collectionsToAdd[i]);
        }

        // removes

        for (uint256 i = 0; i < input.adminsToRemove.length; i++) {
            _removeAdmin(input.realmId, input.adminsToRemove[i]);
        }

        for (uint256 i = 0; i < input.infusersToRemove.length; i++) {
            _removeInfuser(input.realmId, input.infusersToRemove[i]);
        }

        for (uint256 i = 0; i < input.collectionsToRemove.length; i++) {
            _removeCollection(input.realmId, input.collectionsToRemove[i]);
        }
    }

    // check for constraint values that are nonsensical, revert if a problem
    function _validateRealmConstraints(RealmConstraints memory constraints) internal pure {
        require(constraints.minDailyRate <= constraints.maxDailyRate, "invalid min/max daily rate");
        require(constraints.minInfusionAmount <= constraints.maxInfusionAmount, "invalid min/max amount");
        require(constraints.maxInfusionAmount > 0, "invalid max amount");
        require(constraints.maxTokenBalance > 0, "invalid max token balance");
        require(constraints.minClaimAmount <= constraints.maxTokenBalance, "invalid min claim amount");
    }

    function _addAdmin(uint256 realmId, address admin) internal {
        require(admin != address(0), "invalid admin");
        isAdmin[realmId][admin] = true;
        emit AdminAdded(realmId, admin);
    }

    function _removeAdmin(uint256 realmId, address admin) internal {
        require(admin != address(0), "invalid admin");
        delete isAdmin[realmId][admin];
        emit AdminRemoved(realmId, admin);
    }

    function _addInfuser(uint256 realmId, address infuser) internal {
        require(infuser != address(0), "invalid infuser");
        isInfuser[realmId][infuser] = true;
        emit InfuserAdded(realmId, infuser);
    }

    function _removeInfuser(uint256 realmId, address infuser) internal {
        require(infuser != address(0), "invalid infuser");
        delete isInfuser[realmId][infuser];
        emit InfuserRemoved(realmId, infuser);
    }

    function _addCollection(uint256 realmId, IERC721 collection) internal {
        require(collection != IERC721(address(0)), "invalid collection");
        isCollection[realmId][collection] = true;
        emit CollectionAdded(realmId, collection);
    }

    function _removeCollection(uint256 realmId, IERC721 collection) internal {
        require(collection != IERC721(address(0)), "invalid collection");
        delete isCollection[realmId][collection];
        emit CollectionRemoved(realmId, collection);
    }

    // ---
    // infuser mutations
    // ---

    function infuse(InfuseInput memory input) external {
        TokenData storage data = tokenData[input.realmId][input.collection][input.tokenId];
        RealmConfig memory realm = realmConfig[input.realmId];

        // ensure input is valid as a function of realm state, token state, and infusion input
        _validateInfusion(input, data, realm);

        // initialize token storage if first infusion
        if (data.lastClaimAt == 0) {
            data.dailyRate = input.dailyRate;
            data.lastClaimAt = block.timestamp;
        }
        // re-set last claim to now if this is empty, else it will effectivel
        // pre-mine the time since the last claim
        else if (data.balance == 0) {
            data.lastClaimAt = block.timestamp;
        }

        // determine if we need to clamp the amount based on maxTokenBalance
        uint256 nextBalance = data.balance + input.amount;
        uint256 clampedBalance = nextBalance > realm.constraints.maxTokenBalance
            ? realm.constraints.maxTokenBalance
            : nextBalance;
        uint256 amountToTransfer = clampedBalance - data.balance;

        // pull tokens from msg sender into the contract, executing transferFrom
        // last to ensure no malicious erc-20 can cause re-entrancy issues
        data.balance += amountToTransfer;
        realm.token.transferFrom(msg.sender, address(this), amountToTransfer);

        emit Infused(
            input.realmId,
            input.collection,
            input.tokenId,
            input.infuser,
            input.amount,
            input.dailyRate,
            input.comment
        );
    }

    function _validateInfusion(InfuseInput memory input, TokenData memory data, RealmConfig memory realm) internal view {
        require(_isTokenValid(input.collection, input.tokenId), "invalid token");
        require(_realmExists(input.realmId), "invalid realm");

        // assert amount to be infused is within the min and max constraints
        require(input.amount >= realm.constraints.minInfusionAmount, "amount too low");
        require(input.amount <= realm.constraints.maxInfusionAmount, "amount too high");

        bool isOwnedByInfuser = input.collection.ownerOf(input.tokenId) == input.infuser;
        bool isOnInfuserAllowlist = isInfuser[input.realmId][msg.sender];
        bool isOnCollectionAllowlist = isCollection[input.realmId][input.collection];
        bool isValidInfusionProxy = isInfusionProxy[input.realmId][msg.sender][input.infuser];

        require(isOwnedByInfuser || !realm.constraints.requireNftIsOwned, "nft not owned by infuser");
        require(isOnInfuserAllowlist || realm.constraints.allowPublicInfusion, "invalid infuser");
        require(isOnCollectionAllowlist || realm.constraints.allowAllCollections, "invalid collection");
        require(isValidInfusionProxy || msg.sender == input.infuser, "invalid proxy infusion");

        // if already infused...
        if (data.lastClaimAt != 0) {
            require(data.dailyRate == input.dailyRate, "daily rate is immutable");
            require(realm.constraints.allowMultiInfuse, "multi infuse disabled");
            // intentionally ommitting checks to min/max daily rate -- its
            // possible realm configuration has changed since the initial
            // infusion, we don't want to prevent "topping off" the NFT if this
            // is the case
        } else {
            // else ensure daily rate is within min/max constraints
            require(input.dailyRate >= realm.constraints.minDailyRate, "daily rate too low");
            require(input.dailyRate <= realm.constraints.maxDailyRate, "daily rate too high");
        }

        // if token balance is already at max, clamped amount will be zero
        require(data.balance < realm.constraints.maxTokenBalance, "max token balance");

        // we made it! 🚀 LFG!
    }

    // allower operator to infuse on behalf of msg.sender for a specific realm
    function allowInfusionProxy(uint256 realmId, address proxy) external {
        require(_realmExists(realmId), "invalid realm");
        isInfusionProxy[realmId][proxy][msg.sender] = true;
        emit InfusionProxyAdded(realmId, proxy);
    }

    // deny operator the ability to infuse on behalf of msg.sender for a specific realm
    function denyInfusionProxy(uint256 realmId, address proxy) external {
        require(_realmExists(realmId), "invalid realm");
        delete isInfusionProxy[realmId][proxy][msg.sender];
        emit InfusionProxyRemoved(realmId, proxy);
    }

    // ---
    // claimer mutations
    // ---

    function claim(ClaimInput memory input) public {
        require(_isApprovedOrOwner(input.collection, input.tokenId, msg.sender), "not owner or approved");

        TokenData storage data = tokenData[input.realmId][input.collection][input.tokenId];
        require(data.lastClaimAt != 0, "token not infused");

        // compute how much we can claim, only pay attention to amount if its less
        // than available
        uint256 availableToClaim = _claimable(input.realmId, input.collection, input.tokenId);
        uint256 toClaim = input.amount < availableToClaim ? input.amount : availableToClaim;
        require(toClaim >= realmConfig[input.realmId].constraints.minClaimAmount, "amount too low");
        require(toClaim > 0, "nothing to claim");

        // claim only as far up as we need to get our amount... basically "advances"
        // the lastClaim timestamp the exact amount needed to provide the amount
        // claim at = last + (to claim / rate) * 1 day, rewritten for div last
        uint256 claimAt = data.lastClaimAt + (toClaim * 1 days) / data.dailyRate;

        // update balances and execute ERC-20 transfer, calling transferFrom
        // last to prevent any malicious erc-20 from causing re-entrancy issues
        data.balance -= toClaim;
        data.lastClaimAt = claimAt;
        realmConfig[input.realmId].token.transfer(msg.sender, toClaim);

        emit Claimed(input.realmId, input.collection, input.tokenId, toClaim);
    }

    // compute claimable tokens, reverts for invalid tokens
    function _claimable(
        uint256 realmId,
        IERC721 collection,
        uint256 tokenId
    ) internal view returns (uint256) {
        TokenData memory data = tokenData[realmId][collection][tokenId];
        require(data.lastClaimAt != 0, "token has not been infused");
        require(_isTokenValid(collection, tokenId), "invalid token");

        uint256 secondsToClaim = block.timestamp - data.lastClaimAt;
        uint256 toClaim = (secondsToClaim * data.dailyRate) / 1 days;

        // clamp to token balance
        return toClaim > data.balance ? data.balance : toClaim;
    }

    // ---
    // views
    // ---

    function name() external pure returns (string memory) {
        return "HyperVIBES";
    }

    // ---
    // utils
    // ---

    // returns true if a realm has been setup
    function _realmExists(uint256 realmId) internal view returns (bool) {
        return realmConfig[realmId].token != IERC20(address(0));
    }

    // returns true if token exists (and is not burnt)
    function _isTokenValid(IERC721 collection, uint256 tokenId)
        internal
        view
        returns (bool)
    {
        try collection.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    // returns true if operator can manage tokenId
    function _isApprovedOrOwner(
        IERC721 collection,
        uint256 tokenId,
        address operator
    ) internal view returns (bool) {
        address owner = collection.ownerOf(tokenId);
        return
            owner == operator ||
            collection.getApproved(tokenId) == operator ||
            collection.isApprovedForAll(owner, operator);
    }
}
