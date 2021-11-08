// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    constructor() ERC721("MockERC721", "TEST") {}

    function mint(uint256 tokenId) external {
        _mint(_msgSender(), tokenId);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://ipfs/QmSrvhWBLbedStELaMS8eXAbgTDG2q4g6qj6QSMoKwFskG";
    }
}
