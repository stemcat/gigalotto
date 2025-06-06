# GigaLotto Sepolia

## Subgraph Information

- Subgraph Studio: https://thegraph.com/studio/subgraph/gigalottosepolia
- Query URL: https://api.studio.thegraph.com/query/113076/gigalottosepolia/version/latest

## Contract Information

- Contract Address: 0xd466628a48437394ac7a58ca8CaF48E3Ce22733B
- Deployment Block: 8489136

### Example Query

```graphql
{
  contract(id: "0xd466628a48437394ac7a58ca8CaF48E3Ce22733B") {
    totalPool
    jackpotUsd
    targetUsd
    last24hDepositUsd
    entries(first: 20, orderBy: amount, orderDirection: desc) {
      user
      amount
      timestamp
    }
    withdrawals(first: 20, orderBy: timestamp, orderDirection: desc) {
      user
      amount
      timestamp
    }
    winner
    winnerSelectedAt
  }
}
```

## Features

- Winner selection expiration tracking
- Automatic reselection of winners after claim period expires
- Full event tracking for all contract interactions

## Contract Information

- Network: Sepolia
- Contract Address: 0x8366A6F4adbB6D2D9fDC4cD5B9b0aC5f12D96dF1
- Etherscan: https://sepolia.etherscan.io/address/0x8366A6F4adbB6D2D9fDC4cD5B9b0aC5f12D96dF1
