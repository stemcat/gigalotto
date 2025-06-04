# GigaLotto Sepolia

## Subgraph Information

- Subgraph Studio: https://thegraph.com/studio/subgraph/gigalottosepolia
- Query URL: https://api.studio.thegraph.com/query/113076/gigalottosepolia/version/latest
- Deployment ID (v0.0.1): QmbmcDFq2182zQCPpHzQURZrvJ1mCKbGtZo4ZCdMN8hE1h

### Example Query

```graphql
{
  contract(id: "0x8366a6f4adbb6d2d9fdc4cd5b9b0ac5f12d96df1") {
    totalPool
    jackpotUsd
    targetUsd
    last24hDepositUsd
    entries(first: 20, orderBy: amount, orderDirection: desc) {
      user
      amount
    }
  }
}
```

## Contract Information

- Network: Sepolia
- Contract Address: 0x8366A6F4adbB6D2D9fDC4cD5B9b0aC5f12D96dF1
- Etherscan: https://sepolia.etherscan.io/address/0x8366A6F4adbB6D2D9fDC4cD5B9b0aC5f12D96dF1
