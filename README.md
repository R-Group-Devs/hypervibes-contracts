# hypervibes-contracts

![tests](https://github.com/R-Group-Devs/hypervibes-contracts/actions/workflows/run-tests.yml/badge.svg)

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

Run unit tests:

```
yarn test
```

Run unit tests showing gas usage by function and deploy costs:

```
REPORT_GAS=1 yarn test
```

Compile all artifacts (generally will happen automatically before test and deploys):

```
yarn build
```

## Deployment

Copy `.env.example` to `.env` and override the default values before deploying.

Deploy the contract:

```
yarn deploy:ropsten
```

This will output the deployed contract address in the console.

Verify on Etherscan, using the contract address from the previous step.

```
yarn verify:ropsten -- $CONTRACT_ADDRESS
```

Verification may fail if run too quickly after contract deployment.
