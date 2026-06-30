# OnChainAuction

OnChainAuction is a decentralized auction platform built on Stellar Soroban. A project manager lists a project, public users connect a Stellar wallet, bidders submit XLM-backed bids, and the auction is settled on-chain after the deadline so the highest bidder wins.

## Features

- Manager listing: create on-chain project auctions with a title, description, starting bid, and duration
- Public bidding: any wallet holder can place an XLM-backed bid; the previous highest bidder is automatically refunded
- On-chain settlement: the winning bid is transferred to the seller after the auction closes
- Multi-wallet support: Freighter, Albedo, xBull, and Hana wallets
- Preview mode: demo auctions are shown when no contract ID is configured

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Blockchain**: Stellar Testnet, Soroban SDK (`@stellar/stellar-sdk`)
- **Wallets**: Freighter (`@stellar/freighter-api`), Albedo, xBull, Hana
- **Contract**: Rust compiled to WebAssembly (Soroban)

## Contract API

The contract lives in `contracts/auction-contract`.

| Function | Description |
| --- | --- |
| `create_auction` | Creates a project auction with seller, token, title, description, starting bid, and duration. |
| `get_auction` | Reads one auction by ID. |
| `get_auction_count` | Returns the highest auction ID currently stored. |
| `place_bid` | Transfers a bid from the bidder to the contract and refunds the previous highest bidder. |
| `settle_auction` | Sends the winning bid to the seller after the auction ends. |

## Local Development

Install dependencies (run from the **repository root**):

```bash
npm install
```

Run the frontend dev server:

```bash
npm run dev
```

Run contract unit tests:

```bash
cargo test -p auction-contract
```

Build the frontend:

```bash
npm run build
```

## Environment

The frontend renders preview listings without a deployed contract. Real on-chain listing, bidding, and settlement require a deployed Soroban contract ID.

Create `.env` in the **repository root**:

```bash
VITE_AUCTION_CONTRACT_ID=YOUR_DEPLOYED_CONTRACT_ID
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_NATIVE_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Deployment Notes

Build the contract from the repository root:

```bash
stellar contract build --package auction-contract
```

Deploy to testnet and seed sample auctions. The deploy script will build the WASM automatically if it is missing. Expect **2–5 minutes** on testnet (upload, deploy, and 3 sample auctions).

```bash
npm run deploy:contract
```

For a faster deploy without sample listings:

```powershell
$env:SKIP_SEED="1"
npm run deploy:contract
```

If Stellar Friendbot is down, fund a testnet account at [Stellar Lab](https://lab.stellar.org/account/create/testnet), then deploy with your funded **secret key** (starts with `S`):

```powershell
$env:DEPLOY_SECRET_KEY="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
npm run deploy:contract
```

To use Friendbot instead of a saved secret, clear the variable first:

```powershell
Remove-Item Env:DEPLOY_SECRET_KEY
npm run deploy:contract
```

Or deploy manually with the Stellar CLI, then put the returned contract ID into `.env` as `VITE_AUCTION_CONTRACT_ID`.

## Live Demo & Testnet Explorer

- **GitHub Repository**: [ankush-shaw/On-Chain-Auction](https://github.com/ankush-shaw/On-Chain-Auction)
- **Testnet Contract Explorer**: [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)

Once deployed, find your contract at:
`https://stellar.expert/explorer/testnet/contract/<YOUR_CONTRACT_ID>`

## Project Structure

```
/
├── contracts/
│   └── auction-contract/     # Soroban smart contract (Rust)
│       ├── src/lib.rs         # Contract logic
│       ├── src/test.rs        # Contract unit tests
│       └── Cargo.toml
├── src/                       # React frontend source
│   ├── components/
│   │   ├── AuctionCard.tsx    # Auction listing card with bid UI
│   │   ├── ManagerPanel.tsx   # Create auction panel
│   │   └── WalletConnect.tsx  # Wallet connect/disconnect button
│   ├── hooks/
│   │   └── useWallet.ts       # Multi-wallet state management hook
│   ├── services/
│   │   └── soroban.ts         # Stellar SDK integration & contract calls
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── App.tsx                # Main application component
├── deploy-auction.js          # Deploy script (upload WASM, instantiate, seed)
├── index.html                 # Vite entry HTML
├── package.json               # npm scripts and dependencies
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── Cargo.toml                 # Rust workspace manifest
└── README.md
```
