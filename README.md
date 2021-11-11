# hypervibes-contracts

![tests](https://github.com/R-Group-Devs/hypervibes-contracts/actions/workflows/run-tests.yml/badge.svg)

Smart contracts for the HyperVIBES project.

## Links

* [Product Brief](https://docs.google.com/document/d/1NvztqdMAyLERTPuX5uHSnq8f5G0YVRaxNsq5UaXhQEw/edit?usp=sharing)
* [MVP Coordination Doc](https://docs.google.com/document/d/1dpMlzGeO4XfD6gBQoaTTXO2NxCCfA0hDYlTinJjCsfQ/edit?usp=sharing)
* [Frontend repo](https://github.com/R-Group-Devs/hypervibes-frontend)
* [VIBES Wellspring Contract](https://github.com/sickvibes/vibes-contracts/blob/main/contracts/NFTTokenFaucetV3.sol)

## Current Deployments

| network | address |
| --- | --- |
| ethereum mainnet | n/a
| polygon mainnet | n/a
| xDai mainnet | n/a
| mumbai testnet | n/a
| ropsten testnet | [`0x9Dd0d07224bAA34Da65709927f99BEe6DAFE6862`](https://ropsten.etherscan.io/address/0x9Dd0d07224bAA34Da65709927f99BEe6DAFE6862)
| rinkeby testnet | [`0xe40d31e51bEc80ba5Bd1A1074134FA61cc557927`](https://rinkeby.etherscan.io/address/0xe40d31e51bEc80ba5Bd1A1074134FA61cc557927)

### Rinkeby Testnet Fixtures

| contract | address |
| --- | --- |
| MockERC20 | [`0xA50f703771d04D9e76e03b20720539Fc014aaA40`](https://rinkeby.etherscan.io/address/0xA50f703771d04D9e76e03b20720539Fc014aaA40)
| MockERC721 | [`0xcF5D09efF740066D202E33bb59FA07FEC03Db06E`](https://rinkeby.etherscan.io/address/0xcF5D09efF740066D202E33bb59FA07FEC03Db06E)
| ReferenceERC721 | [`0x10223Ef0924A687666c469790c29C83935d4EA59`](https://rinkeby.etherscan.io/address/0x10223Ef0924A687666c469790c29C83935d4EA59)

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

To deploy test fixtures and contracts (only needed for testnet):

```
yarn deploy:fixtures --network ropsten
```
