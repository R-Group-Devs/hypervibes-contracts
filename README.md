# hypervibes-contracts

Smart contracts for the HyperVIBES project.

## Links

* [Product Brief](https://docs.google.com/document/d/1NvztqdMAyLERTPuX5uHSnq8f5G0YVRaxNsq5UaXhQEw/edit?usp=sharing)
* [MVP Coordination Doc](https://docs.google.com/document/d/1dpMlzGeO4XfD6gBQoaTTXO2NxCCfA0hDYlTinJjCsfQ/edit?usp=sharing)
* [Frontend repo](https://github.com/R-Group-Devs/hypervibes-frontend)
* [VIBES Wellspring Contract](https://github.com/sickvibes/vibes-contracts/blob/main/contracts/NFTTokenFaucetV3.sol)

## Development

Install dependencies:

```
yarn
```

## Deployment

Copy `.env.example` to `.env` and override the default values before deploying.

Deploy the contract:

```
npx hardhat run scripts/deploy.ts --network rinkeby
```

This will output the deployed contract address in the console.

Verify on Etherscan, using the contract address from the previous step.

```
npx hardhat verify --network rinkeby $CONTRACT_ADDRESS
```

Verification may fail if run too quickly after contract deployment.
