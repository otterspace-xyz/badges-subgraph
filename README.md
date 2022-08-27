# badges-subgraph
Subgraph for Otterspace Badges

## Developer setup
Get DEPLOY_KEY from [thegraph.com](https://thegraph.com/) dashboard of Otterspace org

```bash
graph auth --product hosted-service DEPLOY_KEY

yarn reinstall
yarn clean
yarn codegen
yarn build:goerli
yarn deploy:goerli
```

## Subgraphs
* https://thegraph.com/hosted-service/subgraph/otterspace-xyz/badges-goerli