# 🔨 OnChainAuction

[![Stellar Smart Contract CI](https://github.com/ankush-shaw/On-Chain-Auction/actions/workflows/stellar.yml/badge.svg)](https://github.com/ankush-shaw/On-Chain-Auction/actions)
[![Soroban CI](https://github.com/ankush-shaw/On-Chain-Auction/actions/workflows/ci.yml/badge.svg)](https://github.com/ankush-shaw/On-Chain-Auction/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stellar Network](https://img.shields.io/badge/Stellar-Testnet-blue)](https://stellar.org)

**OnChainAuction** is a decentralized, on-chain project bidding and auction platform built on **Stellar Soroban**. Project managers can list project proposals directly to the blockchain, and public users can bid XLM in real-time. The smart contract automatically locks the highest bid, refunds the previous bidder instantly, and transfers the winning funds to the seller upon auction settlement after the duration expires.

---

## 🚀 Key Features

*   **Manager Bidding Dashboard** — Create auctions on-chain with customized titles, descriptions, starting bids, and durations.
*   **Automatic XLM Bidding & Refunds** — Bidders place bids using native XLM. The smart contract holds the active bid and instantly refunds the previous bidder on-chain.
*   **Decentralized Settlement** — Once the deadline expires, the seller can settle the auction to claim the winning bid, closing it securely.
*   **Multi-Wallet Compatibility** — Fully integrated with **Freighter**, **Albedo**, **xBull**, and **Hana** browser wallets.
*   **Visual Preview Mode** — Implements a fallback demo board when no contract address is set, facilitating rapid UI preview and development.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **Blockchain** | Stellar Testnet, Soroban Smart Contracts |
| **Smart Contract** | Rust (WASM target), Soroban SDK |
| **Wallets** | Freighter API, Albedo Intent API, xBull SDK, Hana Wallet |
| **CI/CD** | GitHub Actions (automated compilation & test verification) |

---

## 📜 Smart Contract API

The core contract source code is located in [`contracts/auction-contract`](file:///c:/Users/ankus/OneDrive/Desktop/FUN%20PROJECTS/Stellar%20wallet%20project/contracts/auction-contract).

| Function | Arguments | Description |
|---|---|---|
| **`create_auction`** | `seller: Address`, `token: Address`, `id: u32`, `title: String`, `description: String`, `starting_bid: i128`, `duration_seconds: u64` | Registers a new auction on-chain with target parameters and duration. |
| **`get_auction`** | `id: u32` | Retrieves details and active bid info for the given auction ID. |
| **`get_auction_count`** | *None* | Returns the total count of created auctions (highest registered ID). |
| **`place_bid`** | `bidder: Address`, `id: u32`, `amount: i128` | Submits a new highest bid. Safely locks new funds and refunds the previous bidder. |
| **`settle_auction`** | `id: u32` | Finalizes the auction (must be ended). Transfers the locked highest bid to the seller. |

---

## ⚙️ Local Development Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   [Rust & Cargo](https://www.rust-lang.org/) with `wasm32-unknown-unknown` target
*   [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)

### 1. Installation
Clone the repository and install the dependencies from the project root:
```bash
npm install
```

### 2. Local Environment Configuration
Create a `.env` file in the root of the project to declare your environment parameters:
```env
VITE_AUCTION_CONTRACT_ID=YOUR_DEPLOYED_CONTRACT_ID
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_NATIVE_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

### 3. Run the Frontend
Launch the local dev server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🧪 Smart Contract Testing

The smart contract includes complete unit tests verifying the auction creation, bidding limits, refunds, and final settlements. Run the test suite:

```bash
cargo test -p auction-contract
```

All 3 unit tests run and pass locally:
```
running 3 tests
test test::test_create_auction ... ok
test test::test_place_bid_refunds_previous_bidder ... ok
test test::test_settle_auction_transfers_winning_bid_to_seller ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.12s
```

---

## 🚢 Testnet Deployment Workflow

### 1. Build the WASM Contract
Build the Rust smart contract in release mode from the repository root:
```bash
stellar contract build --package auction-contract
```

### 2. Run the Deployment Script
To build the WASM, deploy the contract to Stellar Testnet, instantiate it, and seed 3 sample listings on-chain in a single command, run:
```bash
npm run deploy:contract
```

#### Fast Deployment Option (Skip Seeding)
To deploy the contract without adding the sample auctions:
```powershell
# Windows
$env:SKIP_SEED="1"; npm run deploy:contract

# Linux / macOS
SKIP_SEED=1 npm run deploy:contract
```

#### Manual Secret Funding (When Friendbot is Offline)
If Friendbot is experiencing downtime, you can fund a testnet account at [Stellar Lab](https://lab.stellar.org/account/create/testnet) and deploy using the account's secret key:
```powershell
# Windows
$env:DEPLOY_SECRET_KEY="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; npm run deploy:contract

# To reset to Friendbot after
Remove-Item Env:DEPLOY_SECRET_KEY
```

---

## 📁 Repository Directory Structure

```
/
├── .github/workflows/        # Automated CI/CD Actions workflows
├── contracts/
│   └── auction-contract/     # Soroban smart contract source (Rust)
│       ├── src/
│       │   ├── lib.rs        # Main contract logic & API
│       │   └── test.rs       # Comprehensive unit tests
│       └── Cargo.toml
├── src/                       # React frontend source
│   ├── components/
│   │   ├── AuctionCard.tsx    # Bidding card with active timer & inputs
│   │   ├── ManagerPanel.tsx   # Dashboard tool for listing new projects
│   │   └── WalletConnect.tsx  # Interactive multi-wallet selector & logout
│   ├── hooks/
│   │   └── useWallet.ts       # React state hook for Freighter, Albedo, xBull, Hana
│   ├── services/
│   │   └── soroban.ts         # Stellar SDK transaction builders & RPC server calls
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces
│   └── App.tsx                # Main layout and central state manager
├── deploy-auction.js          # Deployment & seeding automation script (Stellar CLI wrapper)
├── package.json               # Development scripts & dependencies configuration
├── vite.config.ts             # Vite server config with Node polyfills
├── tailwind.config.js         # CSS design utility parameters
├── tsconfig.json              # TypeScript compilation rules
└── README.md                  # Project documentation
```

---

## 🔗 Project Links

*   **GitHub Repository**: [ankush-shaw/On-Chain-Auction](https://github.com/ankush-shaw/On-Chain-Auction)
*   **Stellar Expert Testnet Explorer**: [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)
