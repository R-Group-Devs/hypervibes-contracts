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
    mapping(uint256 => mapping(uint256 => bool)) public tenantAdmins;

    mapping(uint256 => mapping(uint256 => bool)) public tenantInfusers;

    mapping(uint256 => TenantConfiguration) public tenantConfigs;

    mapping(uint256 => mapping(IERC721 => mapping(uint256 => TokenData)))
        public tokenData;

    // ---
    // utils
    // ---

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
