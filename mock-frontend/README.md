# AintiVirus Mixer SDK – Mock Frontend

A runnable React app in this repo to develop and test all SDK features (deposit, withdraw, stake, claim, view, deploy, admin, subgraph) without integrating a separate frontend.

## Prerequisites

- Node 18+
- pnpm (or npm)
- Built SDK: from repo root run `pnpm run build` so `dist/` (and `dist/hooks/`) exist.

## Setup

1. From repo root, install dependencies and build the SDK:
   ```bash
   pnpm install
   pnpm run build
   ```

2. Install mock-frontend dependencies:
   ```bash
   cd mock-frontend
   pnpm install
   ```

3. Copy env and set your contract and RPC:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at least:
   - `VITE_FACTORY_ADDRESS` – Factory contract address (required)
   - `VITE_TOKEN_ADDRESS` – Token contract (optional; only for token deposits/staking)
   - `VITE_CHAIN_ID` – e.g. `11155111` for Sepolia (default)
   - `VITE_RPC_URL` – RPC URL (optional; defaults per chain)
   - `VITE_SUBGRAPH_URL` – Subgraph endpoint (optional; for Subgraph tab)

## Run

From `mock-frontend`:

```bash
pnpm dev
```

Or from repo root:

```bash
pnpm run dev:app
```

Open http://localhost:5173, connect your wallet, and use the tabs to test View, Stake, Deposit, Withdraw, Claim, Deploy, Admin, and Subgraph.

## Pages

- **View** – Read mixer address, fee rate, current season, your balances, staker record.
- **Stake** – Stake ETH / unstake.
- **Deposit** – Deposit ETH (generates secret/nullifier; save them for withdrawal).
- **Withdraw** – Withdraw with a ZK proof (paste JSON with pA, pB, pC, pubSignals).
- **Claim** – Claim staking rewards for a season.
- **Deploy** – Deploy a new mixer for a given mode and amount.
- **Admin** – Set fee rate, relayer fee rate, season period; start season (requires admin role).
- **Subgraph** – Load recent deposits/withdrawals from the subgraph (set `VITE_SUBGRAPH_URL`).

## Build

```bash
cd mock-frontend
pnpm run build
```

Output is in `dist/`. Preview with `pnpm preview`.

## SDK link

The app depends on the SDK via `"@aintivirus-ai/mixer-sdk": "file:.."`. After changing the SDK, run `pnpm run build` at repo root, then restart or refresh the mock frontend.
