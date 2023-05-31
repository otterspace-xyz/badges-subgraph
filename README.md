# badges-subgraph
Subgraph for Otterspace Badges

## Developer setup
Get DEPLOY_KEY from [thegraph.com](https://thegraph.com/) dashboard of Otterspace org

```bash
# for hosted service deploys
graph auth --product hosted-service DEPLOY_KEY

# for subgraph studio deploys
graph auth --product subgraph-studio DEPLOY_KEY

yarn reinstall
yarn clean
yarn codegen
yarn build:goerli
yarn deploy:goerli
```

## Subgraphs
### Hosted service
* https://thegraph.com/hosted-service/subgraph/otterspace-xyz

### Studio
https://thegraph.com/studio/subgraph/badges-sepolia/