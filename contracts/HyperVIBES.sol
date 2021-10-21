//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// required information per-tenant
struct TenantConfiguration {
    IERC20 token;
}

// data stored for-each infused token
struct TokenData {
    uint256 dailyRate;
    uint256 balance;
    uint256 lastClaimAt;
}

// data provided when creating a tenant
struct CreateTenantInput {
    string name;
    string description;
    IERC20 token;
    address[] admins;
    address[] infusers;
    IERC721[] collections;
}

// data provided when modifying a tenant
struct ModifyTenantInput {
    address[] adminsToAdd;
    address[] adminsToRemove;
    address[] infusersToAdd;
    address[] infusersToRemove;
    IERC721[] collectionsToAdd;
    IERC721[] collectionsToRemove;
}

// data provided when infusing an nft
struct InfuseInput {
    uint256 tenantId;
    IERC721 collection;
    uint256 tokenId;
    address infuser;
    uint256 dailyRate;
    uint256 amount;
    string comment;
}

contract HyperVIBES {
    // ---
    // storage
    // ---

    // tenant ID -> address -> (is admin flag)
    mapping(uint256 => mapping(address => bool)) public isAdmin;

    // tenant ID -> address -> (is infuser flag)
    // 0x0=true => no public infusion
    mapping(uint256 => mapping(address => bool)) public isInfuser;

    // tenant ID -> erc721 -> (is allowed nft flag)
    // 0x0=true => no open infusion
    mapping(uint256 => mapping(IERC721 => bool)) public isCollection;

    // tenant ID -> configuration
    mapping(uint256 => TenantConfiguration) public tenantConfig;

    // tenant ID -> nft -> token ID -> token data
    mapping(uint256 => mapping(IERC721 => mapping(uint256 => TokenData)))
        public tokenData;

    uint256 public nextTenantId = 1;

    // ---
    // events
    // ---

    event TenantCreated(
        uint256 indexed tenantId,
        IERC20 indexed token,
        string name,
        string description
    );

    event AdminAdded(uint256 indexed tenantId, address indexed admin);

    event AdminRemoved(uint256 indexed tenantId, address indexed admin);

    event InfuserAdded(uint256 indexed tenantId, address indexed admin);

    event InfuserRemoved(uint256 indexed tenantId, address indexed admin);

    event CollectionAdded(uint256 indexed tenantId, IERC721 indexed collection);

    event CollectionRemoved(
        uint256 indexed tenantId,
        IERC721 indexed collection
    );

    event Infused(
        uint256 indexed tenantId,
        IERC721 indexed collection,
        uint256 indexed tokenId,
        address infuser,
        uint256 amount,
        uint256 dailyRate,
        string comment
    );

    // ---
    // admin mutations
    // ---

    // setup a new tenant
    function createTenant(CreateTenantInput memory create) external {
        require(create.token != IERC20(address(0)), "invalid token");

        uint256 tenantId = nextTenantId++;
        tenantConfig[tenantId] = TenantConfiguration({token: create.token});

        emit TenantCreated(
            tenantId,
            create.token,
            create.name,
            create.description
        );

        for (uint256 i = 0; i < create.admins.length; i++) {
            _addAdmin(tenantId, create.admins[i]);
        }

        for (uint256 i = 0; i < create.infusers.length; i++) {
            _addInfuser(tenantId, create.infusers[i]);
        }

        for (uint256 i = 0; i < create.collections.length; i++) {
            _addCollection(tenantId, create.collections[i]);
        }
    }

    // update mutable configuration for a tenant
    function modifyTenant(uint256 tenantId, ModifyTenantInput memory input)
        public
    {
        require(isAdmin[tenantId][msg.sender], "not tenant admin");

        // adds

        for (uint256 i = 0; i < input.adminsToAdd.length; i++) {
            _addAdmin(tenantId, input.adminsToAdd[i]);
        }

        for (uint256 i = 0; i < input.infusersToAdd.length; i++) {
            _addInfuser(tenantId, input.infusersToAdd[i]);
        }

        for (uint256 i = 0; i < input.collectionsToAdd.length; i++) {
            _addCollection(tenantId, input.collectionsToAdd[i]);
        }

        // removes

        for (uint256 i = 0; i < input.adminsToRemove.length; i++) {
            _removeAdmin(tenantId, input.adminsToRemove[i]);
        }

        for (uint256 i = 0; i < input.infusersToRemove.length; i++) {
            _removeInfuser(tenantId, input.infusersToRemove[i]);
        }

        for (uint256 i = 0; i < input.collectionsToRemove.length; i++) {
            _addCollection(tenantId, input.collectionsToRemove[i]);
        }
    }

    function _addAdmin(uint256 tenantId, address admin) internal {
        isAdmin[tenantId][admin] = true;
        emit AdminAdded(tenantId, admin);
    }

    function _removeAdmin(uint256 tenantId, address admin) internal {
        delete isAdmin[tenantId][admin];
        emit AdminRemoved(tenantId, admin);
    }

    function _addInfuser(uint256 tenantId, address infuser) internal {
        isInfuser[tenantId][infuser] = true;
        emit InfuserAdded(tenantId, infuser);
    }

    function _removeInfuser(uint256 tenantId, address infuser) internal {
        delete isInfuser[tenantId][infuser];
        emit InfuserRemoved(tenantId, infuser);
    }

    function _addCollection(uint256 tenantId, IERC721 collection) internal {
        isCollection[tenantId][collection] = true;
        emit CollectionAdded(tenantId, collection);
    }

    function _removeCollection(uint256 tenantId, IERC721 collection) internal {
        delete isCollection[tenantId][collection];
        emit CollectionRemoved(tenantId, collection);
    }

    // ---
    // infuser mutations
    // ---

    function infuse(InfuseInput memory input) external {
        require(
            isAllowedToInfuse(input.tenantId, msg.sender, input.infuser),
            "infusion not allowed"
        );
        require(_isTokenValid(input.collection, input.tokenId), "invalid token");

        TokenData storage data = tokenData[input.tenantId][input.collection][
            input.tokenId
        ];

        // init storage or assert that daily rate is the same
        if (data.lastClaimAt != 0) {
            // if already infused, assert same rate
            require(
                data.dailyRate == input.dailyRate,
                "daily rate is immutable"
            );
        } else {
            // else write info to storage
            data.dailyRate = input.dailyRate;
            data.lastClaimAt = block.timestamp;
        }

        // infuse
        tenantConfig[input.tenantId].token.transferFrom(
            msg.sender,
            address(this),
            input.amount
        );
        data.balance += input.amount;

        emit Infused(
            input.tenantId,
            input.collection,
            input.tokenId,
            input.infuser,
            input.amount,
            input.dailyRate,
            input.comment
        );
    }

    function isAllowedToInfuse(
        uint256 tenantId,
        address operator,
        address infuser
    ) public view returns (bool) {
        // actual infuser -> yes
        if (isInfuser[tenantId][operator]) {
            return true;
        }
        // no public infusion allowed -> no
        else if (isInfuser[tenantId][address(0)]) {
            return false;
        }
        // else public is allowed if coming from infuser
        else if (operator == infuser) {
            return true;
        }

        return false;
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

    // returns true if a tenant has been setup
    function _tenantExists(uint256 tenantId) internal view returns (bool) {
        return tenantConfig[tenantId].token != IERC20(address(0));
    }

    // returns true if token exists (and is not burnt)
    function _isTokenValid(IERC721 nft, uint256 tokenId)
        internal
        view
        returns (bool)
    {
        try nft.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    // returns true if operator can manage tokenId
    function _isApprovedOrOwner(
        IERC721 nft,
        uint256 tokenId,
        address operator
    ) internal view returns (bool) {
        address owner = nft.ownerOf(tokenId);
        return
            owner == operator ||
            nft.getApproved(tokenId) == operator ||
            nft.isApprovedForAll(owner, operator);
    }
}
