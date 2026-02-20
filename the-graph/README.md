# AintiVirus Mixer + Staking Subgraph (Sepolia)

This repository contains a **The Graph** subgraph that indexes events from:

- **AintiVirusFactory**: `0xAAab3D8C2cc83b53707D52E673892050A34399F0` (start block: `10090204`)
- **AintiVirusStaking**: `0x550659EEd1e7C4bDB701Ef20b1B309aF99451B37` (start block: `10090204`)

The manifest is `subgraph.yaml` (network: `sepolia`) and the mappings live in `src/`.

## Prerequisites

- **Node.js** (recommended: 18+)
- **Docker** (for local Graph Node)
- The Graph CLI (installed via `npm install` in this repo)

## Install

```bash
npm install
```

## Codegen + build

```bash
npm run codegen
npm run build
```

## Run locally (Graph Node via Docker)

1. Start the local stack:

```bash
docker compose up -d
```

2. Ensure your `docker-compose.yml` points Graph Node at a **Sepolia** RPC.

The `graph-node` service uses the `ethereum` environment variable in the form:

```text
<network-name>:<rpc-url>
```

Because `subgraph.yaml` uses `network: sepolia`, the network name **must be `sepolia`**. For example:

```yaml
ethereum: "sepolia:http://host.docker.internal:8545"
```

3. Create and deploy the subgraph to your local node:

```bash
npm run create-local
npm run deploy-local
```

4. Query locally:

- GraphQL endpoint: `http://localhost:8000/subgraphs/name/aintivirus-mixer-eth`

## Run tests

```bash
npm test
```

Notes:

- On Windows, Matchstick may require Docker. If `graph test` reports an unsupported platform, run `graph test -d` (Docker must be installed and available on your `PATH`).

## Deploy to The Graph Studio

1. Authenticate (you’ll be prompted for a Studio deploy key):

```bash
graph auth --studio
```

2. Deploy using the repo script:

```bash
npm run deploy
```

## Project layout

- `subgraph.yaml`: data sources, start blocks, handlers
- `schema.graphql`: entities and relationships
- `src/`: AssemblyScript mappings
- `abis/`: contract ABIs used by the mappings
- `docker-compose.yml`: local Graph Node + IPFS + Postgres
