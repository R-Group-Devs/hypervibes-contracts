// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./HyperVIBES.sol";


// This is an example ERC721 that will "infuse on mint"
contract ReferenceERC721 is ERC721Enumerable {

    // the minting contract needs to know
    // - the address of the HyperVIBES protocol
    // - the correct Realm ID
    // - the ERC20 to infuse
    HyperVIBES public hyperVIBES;
    uint256 public realmId;
    IERC20 public token;

    constructor(IERC20 token_) ERC721("MockERC721", "TEST") {
      // token set via constructor, could be configured post-deploy as well
      token = token_;
    }

    // Set the pointer to the HyperVIBES protocol
    // NOTE: this function should be secure (only a privledged admin should be
    // allowed to use this)
    function setHyperVIBES(uint256 realmId_, HyperVIBES hyperVIBES_) external {
      realmId = realmId_;
      hyperVIBES = hyperVIBES_;

      // we need to approve hypervibes to spend any tokens owned by this
      // contract, we'll store the tokens required for infusing in the ERC-721
      token.approve(address(hyperVIBES_), 2 ** 256 - 1);
    }

    function mint(uint256 tokenId) external {
        // mint however you are normally
        _mint(_msgSender(), tokenId);

        // then infuse with hyper vibes
        hyperVIBES.infuse(InfuseInput({
          // must be set to configured realm
          realmId: realmId,

          // the NFT
          collection: this,
          tokenId: tokenId,

          // if you dont want to attribute the infusion the ERC721, the address
          // that this is set to must call allowInfusionProxy with the ERC721
          // address
          infuser: address(this),

          // based on desired behavior and realm config
          dailyRate: 1_000 ether,
          amount: 100_000 ether,

          // optional, can just be an empty string
          comment: "nice!"
        }));
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://ipfs/QmSrvhWBLbedStELaMS8eXAbgTDG2q4g6qj6QSMoKwFskG";
    }
}
