# OnChainAuction

OnChainAuction is a Stellar Soroban project auction platform. A project manager lists a project, public users connect a wallet, bidders submit XLM-backed bids, and the auction can be settled on-chain after the deadline so the highest bidder wins.

## What Changed

- Replaced the previous quiz contract with an auction contract.
- Rebuilt the React frontend as an auction marketplace.
- Kept the existing multi-wallet integration for Freighter, Albedo, xBull, and Hana.
- Added manager listing, public bidding, winner settlement, and project-board views.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Framer Motion
- Blockchain: Stellar Testnet, Soroban SDK
- Wallets: Freighter, Albedo, xBull, Hana
- Contract: Rust compiled to WebAssembly

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

Install frontend dependencies:

```bash
cd frontend
npm install
```

Run the frontend:

```bash
npm run dev
```

Run contract tests:

```bash
cargo test -p auction-contract
```

Build the frontend:

```bash
cd frontend
npm run build
```

## Environment

The frontend can render preview listings without a deployed contract. Real on-chain listing, bidding, and settlement require a deployed Soroban contract ID.

Create `frontend/.env`:

```bash
VITE_AUCTION_CONTRACT_ID=YOUR_DEPLOYED_CONTRACT_ID
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_NATIVE_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Deployment Notes

Build the contract:

```bash
stellar contract build
```

Deploy it to Stellar Testnet with the Stellar CLI, then put the returned contract ID into `frontend/.env` as `VITE_AUCTION_CONTRACT_ID`.

## Repository

Target GitHub repository:

[ankush-shaw/On-Chain-Auction](https://github.com/ankush-shaw/On-Chain-Auction)

Pushes are intentionally manual-confirmed. Do not push without explicit approval.
