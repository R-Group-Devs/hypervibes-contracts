// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./HyperVIBES.sol";


// This is an example ERC721 that will "infuse on mint"
contract ReferenceERC721 is ERC721 {

    // the minting contract needs to know
    // - the address of the HyperVIBES protocol
    // - the correct Realm ID
    HyperVIBES public hyperVIBES;
    uint256 public realmId;

    constructor() ERC721("MockERC721", "TEST") { }

    // Set the pointer to the HyperVIBES protocol
    // NOTE: this function should be secure (only a privledged admin should be
    // allowed to use this)
    function setHyperVIBES(IERC20 token, uint256 realmId_, HyperVIBES hyperVIBES_) external {
      realmId = realmId_;
      hyperVIBES = hyperVIBES_;

      // we need to approve hypervibes to spend any tokens owned by this
      // contract, we'll store the tokens required for infusing in the ERC-721
      token.approve(address(hyperVIBES_), 2 ** 256 - 1);

      // dont need to store token address since its only needed to call approve initially
    }

    function mint(uint256 tokenId) external {
        // mint however you are normally
        _mint(_msgSender(), tokenId);

        // then infuse with hyper vibes -- the tokens will be transfered from
        // the ERC-721 address into the HyperVIBES protocol
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

          // based on desired behavior and realm config. using ether keyword
          // here is ofc only correct if the ERC-20 being used has decimals = 18
          amount: 100_000 ether,
          // daily rate is set on the realm config and cannot be modified

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
