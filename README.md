# hypervibes-contracts

![tests](https://github.com/R-Group-Devs/hypervibes-contracts/actions/workflows/run-tests.yml/badge.svg)

Smart contracts for the HyperVIBES project.

## Links

* [Product Brief](https://docs.google.com/document/d/1NvztqdMAyLERTPuX5uHSnq8f5G0YVRaxNsq5UaXhQEw/edit?usp=sharing)
* [MVP Coordination Doc](https://docs.google.com/document/d/1dpMlzGeO4XfD6gBQoaTTXO2NxCCfA0hDYlTinJjCsfQ/edit?usp=sharing)
* [Frontend repo](https://github.com/R-Group-Devs/hypervibes-frontend)
* [VIBES Wellspring Contract](https://github.com/sickvibes/vibes-contracts/blob/main/contracts/NFTTokenFaucetV3.sol)

## Current Deployments

Find all contract addresses at [docs.hypervibes.xyz](https://docs.hypervibes.xyz):

* https://docs.hypervibes.xyz/developers/links-and-repos

## Development

Install dependencies:

```
yarn
```

Compile all artifacts and generate typechain types:

```
yarn build
```

Run unit tests:

```
yarn test
```

Run unit tests showing gas usage by function and deploy costs:

```
REPORT_GAS=1 yarn test
```

Run unit tests and report coverage:

```
yarn test:coverage
```


## Deployment

Copy `.env.example` to `.env` and override the default values before deploying.

Deploy the contract:

```
yarn deploy --network ropsten
```

This will output the deployed contract address in the console.

Verify on Etherscan, using the contract address from the previous step.

```
yarn verify --network ropsten $CONTRACT_ADDRESS
```

Verification may fail if run too quickly after contract deployment.

If you are verifying for `polygon` or `mumbai` networks, set the `POLYGON` env var:

```
POLYGON=1 yarn verify --network polygon $CONTRACT_ADDRESS
```

To deploy test fixtures and contracts (only needed for testnet):

```
yarn deploy:fixtures --network ropsten
```
