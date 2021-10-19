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

Run unit tests:

```
npm test
```

Compile all artifacts (generally will happen automatically before test and deploys):

```
npm run build
```

## Deployment

Copy `.env.example` to `.env` and override the default values before deploying.

Deploy the contract:

```
npm run deploy:rinkeby
```

This will output the deployed contract address in the console.

Verify on Etherscan, using the contract address from the previous step.

```
npm run verify:rinkeby -- $CONTRACT_ADDRESS
```

Verification may fail if run too quickly after contract deployment.
