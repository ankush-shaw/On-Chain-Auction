# 🔨 OnChainAuction

A decentralized project auction platform built on **Stellar** using **Soroban** smart contracts. Project managers list their projects on-chain, bidders connect their wallets and place XLM-backed bids, and the contract autonomously settles the auction — awarding the project to the highest bidder after the deadline.

Built as part of the **Rise In Build on Stellar** monthly challenge.

---

## 🌐 Live Demo

> Deploy your own instance using the steps below, or connect to testnet with your Freighter/Albedo/xBull/Hana wallet.

---

## ✨ Features

- 📋 **Project Listing** — Managers create auctions with a title, description, starting bid, and duration
- 💸 **XLM-Backed Bidding** — Bids are transferred to the contract; previous highest bidder is automatically refunded
- 🏆 **On-Chain Settlement** — Winning bid is sent to the seller trustlessly after the deadline
- 👛 **Multi-Wallet Support** — Freighter, Albedo, xBull, and Hana
- 📊 **Project Board View** — Browse all active and past auctions
- ⚡ **Preview Mode** — Frontend renders sample listings without a deployed contract

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **Blockchain** | Stellar Testnet, Soroban SDK |
| **Smart Contract** | Rust → WebAssembly |
| **Wallets** | Freighter, Albedo, xBull, Hana |
| **CI/CD** | GitHub Actions |

---

## 📁 Project Structure
On-Chain-Auction/

├── contracts/

│   └── auction-contract/     # Soroban smart contract (Rust)

├── frontend/                 # React + Vite frontend

│   └── .env                  # Environment config (see below)

├── .github/workflows/        # GitHub Actions

├── Cargo.toml

└── Cargo.lock

---

## 📜 Contract API

The smart contract lives in `contracts/auction-contract`.

| Function | Description |
|---|---|
| `create_auction` | Creates a project auction with seller, token, title, description, starting bid, and duration |
| `get_auction` | Reads one auction by ID |
| `get_auction_count` | Returns the highest auction ID currently stored |
| `place_bid` | Transfers bid from bidder to contract; refunds the previous highest bidder |
| `settle_auction` | Sends the winning bid to the seller after the auction ends |

---

## ⚙️ Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) with `wasm32` target
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run Contract Tests

```bash
cargo test -p auction-contract
```

### Build Frontend

```bash
cd frontend
npm run build
```

---

## 🌍 Environment Setup

Create a `frontend/.env` file:

```env
VITE_AUCTION_CONTRACT_ID=YOUR_DEPLOYED_CONTRACT_ID
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_NATIVE_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

> The frontend works in preview mode without a contract ID. Real bidding and settlement require a deployed contract.

---

## 🚀 Deployment

### 1. Build the Contract

From the repository root:

```bash
stellar contract build --package auction-contract
```

### 2. Deploy to Testnet

From the `frontend` folder (auto-builds WASM if missing, seeds 3 sample auctions):

```bash
npm run deploy:contract
```

> ⏱️ Expect **2–5 minutes** on testnet (upload + deploy + sample auctions).

### Deploy Without Sample Listings

```bash
# Windows (PowerShell)
$env:SKIP_SEED="1"
npm run deploy:contract

# Linux / macOS
SKIP_SEED=1 npm run deploy:contract
```

### Deploy with a Funded Secret Key

If Stellar Friendbot is down, create a testnet account at [Stellar Lab](https://lab.stellar.org/account/create/testnet), then:

```bash
# Windows (PowerShell)
$env:DEPLOY_SECRET_KEY="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
npm run deploy:contract

# To revert to Friendbot
Remove-Item Env:DEPLOY_SECRET_KEY
npm run deploy:contract
```

### 3. Set Contract ID

Copy the returned contract ID into `frontend/.env` as `VITE_AUCTION_CONTRACT_ID`.

---

## 🧪 Tests

```bash
cargo test -p auction-contract
```

![Tests passing](./cargo_test_success.png)

---

## 🔗 Links

- 🐙 **GitHub:** [ankush-shaw/On-Chain-Auction](https://github.com/ankush-shaw/On-Chain-Auction)
- 🌐 **Stellar Testnet Explorer:** [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)
- 📚 **Soroban Docs:** [developers.stellar.org/docs/build/smart-contracts](https://developers.stellar.org/docs/build/smart-contracts)

---

## 📄 License

This project is open source. See [LICENSE](./LICENSE) for details.
