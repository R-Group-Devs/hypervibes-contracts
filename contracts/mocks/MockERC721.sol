// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract MockERC721 is ERC721Enumerable {
    constructor() ERC721("MockERC721", "TEST") {}

    function mint(uint256 tokenId) external {
        _mint(_msgSender(), tokenId);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "uri";
    }
}

contract MockERC721NoMetadata is ERC721 {
    constructor() ERC721("MockERC721", "TEST") {}

    function mint(uint256 tokenId) external {
        _mint(_msgSender(), tokenId);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        revert("no metadata");
    }
}
