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
    bool allowPublicInfusion;
}

// data provided when modifying a tenant
struct ModifyTenantInput {
    address[] adminsToAdd;
    address[] adminsToRemove;
    address[] infusersToAdd;
    address[] infusersToRemove;
}

// data provided when infusing an nft
struct InfuseInput {
    IERC721 nft;
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
    mapping(uint256 => mapping(address => bool)) public tenantAdmins;

    // tenant ID -> address -> (is infuser flag)
    mapping(uint256 => mapping(address => bool)) public tenantInfusers;

    // tenant ID -> configuration
    mapping(uint256 => TenantConfiguration) public tenantConfigs;

    // tenant ID -> nft -> token ID -> token data
    mapping(uint256 => mapping(IERC721 => mapping(uint256 => TokenData)))
        public tokenData;

    uint256 public nextTenantId = 1;

    // ---
    // events
    // ---

    event TenantCreated(
        uint256 indexed tenantId,
        address indexed operator,
        IERC20 indexed token,
        string name,
        string description
    );

    event AdminAdded(
        uint256 indexed tenantId,
        address indexed operator,
        address indexed admin
    );

    event AdminRemoved(
        uint256 indexed tenantId,
        address indexed operator,
        address indexed admin
    );

    event InfuserAdded(
        uint256 indexed tenantId,
        address indexed operator,
        address indexed admin
    );

    event InfuserRemoved(
        uint256 indexed tenantId,
        address indexed operator,
        address indexed admin
    );

    // ---
    // admin mutations
    // ---

    // setup a new tenant
    function createTenant(CreateTenantInput memory create) external {
        require(bytes(create.name).length > 0, "invalid name");
        require(create.token != IERC20(address(0)), "invalid token");
        uint256 tenantId = nextTenantId++;

        // invoker always starts as admin
        _addAdmin(tenantId, msg.sender);

        // add additional admins
        for (uint256 i = 0; i < create.admins.length; i++) {
            _addAdmin(tenantId, create.admins[i]);
        }

        // register all infusers
        for (uint256 i = 0; i < create.infusers.length; i++) {
            _addInfuser(tenantId, create.infusers[i]);
        }

        // zero address is sentinel for "public infusions"
        if (create.allowPublicInfusion) {
            _addInfuser(tenantId, address(0));
        }

        emit TenantCreated(
            tenantId,
            msg.sender,
            create.token,
            create.name,
            create.description
        );
    }

    function _addAdmin(uint256 tenantId, address admin) internal {
        tenantAdmins[tenantId][admin] = true;
        emit AdminAdded(tenantId, msg.sender, admin);
    }

    function _addInfuser(uint256 tenantId, address infuser) internal {
        tenantInfusers[tenantId][infuser] = true;
        emit InfuserAdded(tenantId, msg.sender, infuser);
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
        return tenantConfigs[tenantId].token != IERC20(address(0));
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
