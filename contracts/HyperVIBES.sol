//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

struct TenantConfiguration {
    IERC20 token;
}

struct TokenData {
    uint256 dailyRate;
    uint256 balance;
    uint256 lastClaimAt;
}

contract HyperVIBES {
    // ---
    // storage
    // ---

    // tenant ID -> address -> (is admin flag)
    mapping(uint256 => mapping(uint256 => bool)) public tenantAdmins;

    // tenant ID -> address -> (is infuser flag)
    mapping(uint256 => mapping(uint256 => bool)) public tenantInfusers;

    // tenant ID -> configuration
    mapping(uint256 => TenantConfiguration) public tenantConfigs;

    // tenant ID -> nft -> token ID -> token data
    mapping(uint256 => mapping(IERC721 => mapping(uint256 => TokenData)))
        public tokenData;

    // ---
    // admin mutations
    // ---

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
