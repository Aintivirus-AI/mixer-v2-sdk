# Devnet Test Script

This test script allows you to test the AintiVirus Mixer SDK against a local devnet or testnet.

## Prerequisites

1. **Local Devnet Node** (choose one):

   - [Hardhat](https://hardhat.org/) - `npx hardhat node`
   - [Anvil](https://book.getfoundry.sh/anvil/) (Foundry) - `anvil`
   - [Ganache](https://trufflesuite.com/ganache/) - GUI or CLI

2. **Deployed Contracts**: The mixer contracts must be deployed to your devnet with the correct addresses.

3. **Dependencies**: Install project dependencies:

   ```bash
   npm install
   # or
   pnpm install
   ```

   The script uses `dotenv` to load environment variables from a `.env` file. It's included in devDependencies, but if you prefer not to use it, you can set environment variables directly in your shell.

## Quick Start

### 1. Start a Local Devnet

**Using Hardhat:**

```bash
npx hardhat node
```

**Using Anvil (Foundry):**

```bash
anvil
```

This will start a local node at `http://localhost:8545` with test accounts.

### 2. Deploy Contracts

Deploy your mixer contracts to the devnet. Make sure to note the deployed addresses:

- Factory contract address
- Token contract address (if using tokens)

### 3. Configure Test Script

**Option 1: Using .env file (Recommended)**

Copy the example file and customize it:

```bash
cp .env.example .env
```

Then edit `.env` with your values:

```bash
# .env
RPC_URL=http://localhost:8545
FACTORY_ADDRESS=0xcC0a05eC339BDE293686AE3856253Ea2cA0db10c
TOKEN_ADDRESS=0x17A53880B82f3535646B85D62Eb805BceCF433d6
STAKING_ADDRESS=0xA4A994D091012A64a96bD90E93AA5D9E1aeD4D66
POSEIDON_ADDRESS=0xd7D831eaa532142541B56c7ae94464E904426FDc
VERIFIER_ADDRESS=0xEf29b4549F80cd285D324F5411312a68fc292Da4
EXPECTED_FEE_RATE=250
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Option 2: Using environment variables directly**

The script comes pre-configured with default contract addresses. You can override them using environment variables:

```bash
# Using environment variables
export RPC_URL="http://localhost:8545"
export FACTORY_ADDRESS="0xcC0a05eC339BDE293686AE3856253Ea2cA0db10c"
export TOKEN_ADDRESS="0x17A53880B82f3535646B85D62Eb805BceCF433d6"
export STAKING_ADDRESS="0xA4A994D091012A64a96bD90E93AA5D9E1aeD4D66"
export POSEIDON_ADDRESS="0xd7D831eaa532142541B56c7ae94464E904426FDc"
export VERIFIER_ADDRESS="0xEf29b4549F80cd285D324F5411312a68fc292Da4"
export EXPECTED_FEE_RATE="250"
export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

Or edit the constants at the top of `test-devnet.ts`:

```typescript
const RPC_URL = "http://localhost:8545";
const FACTORY_ADDRESS = "0xcC0a05eC339BDE293686AE3856253Ea2cA0db10c";
const TOKEN_ADDRESS = "0x17A53880B82f3535646B85D62Eb805BceCF433d6"; // AINTI Token
const STAKING_ADDRESS = "0xA4A994D091012A64a96bD90E93AA5D9E1aeD4D66";
const POSEIDON_ADDRESS = "0xd7D831eaa532142541B56c7ae94464E904426FDc";
const VERIFIER_ADDRESS = "0xEf29b4549F80cd285D324F5411312a68fc292Da4";
const EXPECTED_FEE_RATE = 250n; // 0.25%
const PRIVATE_KEY = "0x...";
```

**Default Contract Addresses (pre-configured):**

- Factory: `0xcC0a05eC339BDE293686AE3856253Ea2cA0db10c`
- Token (AINTI): `0x17A53880B82f3535646B85D62Eb805BceCF433d6`
- Staking: `0xA4A994D091012A64a96bD90E93AA5D9E1aeD4D66`
- Poseidon: `0xd7D831eaa532142541B56c7ae94464E904426FDc`
- Verifier: `0xEf29b4549F80cd285D324F5411312a68fc292Da4`
- Fee Rate: `250` (0.25%)

### 4. Run Tests

```bash
# Using npm script
npm run test:devnet

# Or directly with tsx
npx tsx test-devnet.ts

# Or with ts-node
npx ts-node test-devnet.ts
```

## Test Coverage

The script tests both **EVM** and **Solana** implementations with the following functionality:

### EVM Tests

1. **View Functions**

   - Fee rate
   - Mixer existence
   - Deposit amount calculation
   - Staking contract address
   - Current stake season
   - Account balances
   - Staker records

2. **Deploy Mixer**

   - Deploy new mixer instance for 0.05 ETH

3. **Deposit**

   - Generate secret and nullifier
   - Compute commitment
   - Deposit 0.05 ETH to mixer

4. **Staking**

   - Stake 0.05 ETH
   - View updated staker record

5. **Claim Rewards**
   - Get current season
   - Claim ETH rewards (if available)

### Solana Tests

1. **View Functions**

   - Fee rate
   - Mixer existence
   - Deposit amount calculation
   - Staking contract address
   - Current stake season
   - Account balances
   - Staker records

2. **Deploy Mixer**

   - Deploy new mixer instance for 0.05 SOL

3. **Deposit**

   - Generate secret and nullifier
   - Compute commitment
   - Deposit 0.05 SOL to mixer

4. **Staking**

   - Stake 0.05 SOL
   - View updated staker record

5. **Claim Rewards**
   - Get current season
   - Claim SOL rewards (if available)

## Using with Testnets

You can also use this script with public testnets:

```bash
export RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
export FACTORY_ADDRESS="0x..." # Your deployed factory address
export TOKEN_ADDRESS="0x..." # Your deployed token address
export PRIVATE_KEY="0x..." # Your testnet account private key

npm run test:devnet
```

## Troubleshooting

### "Cannot find module 'dotenv'"

- Install dotenv: `npm install dotenv` or `pnpm add dotenv`
- Or set environment variables directly in your shell instead of using a .env file

### "RPC_URL is required" or "FACTORY_ADDRESS is required"

- Make sure you have a `.env` file in the project root with the required variables
- Or set them as environment variables in your shell
- The script will show which variables are missing

### "Account has zero balance"

- Make sure your devnet account is funded
- For local devnet, accounts are usually pre-funded
- For testnets, send test ETH to your account

### "Mixer not deployed"

- Deploy a mixer for the test amount (0.05 ETH) before running tests
- Or modify the test amounts in the script
- The script uses small amounts (0.05 ETH) to minimize costs

### "Signer required for transactions"

- Make sure you're using a private key that corresponds to a funded account
- The account must have the OPERATOR_ROLE for admin functions

### Connection errors

- **EVM**: Verify your devnet is running, check the RPC_URL is correct
- **Solana**: Verify you can connect to Solana devnet, check SOLANA_RPC_URL
- For local EVM devnet, ensure it's running on port 8545

### Solana-specific issues

- **"Account has zero balance"**: Get devnet SOL from https://faucet.solana.com/
- **"Generated new keypair"**: The script generated a new wallet. Fund it with devnet SOL
- **"Program ID not found"**: Verify the Solana program IDs are correct and programs are deployed

## Environment Variables

### EVM Configuration

| Variable            | Description                         | Default                                      |
| ------------------- | ----------------------------------- | -------------------------------------------- |
| `RPC_URL`           | RPC endpoint URL                    | `http://localhost:8545`                      |
| `FACTORY_ADDRESS`   | Factory contract address            | `0xcC0a05eC339BDE293686AE3856253Ea2cA0db10c` |
| `TOKEN_ADDRESS`     | Token contract address (AINTI)      | `0x17A53880B82f3535646B85D62Eb805BceCF433d6` |
| `STAKING_ADDRESS`   | Staking contract address            | `0xA4A994D091012A64a96bD90E93AA5D9E1aeD4D66` |
| `POSEIDON_ADDRESS`  | Poseidon hasher address             | `0xd7D831eaa532142541B56c7ae94464E904426FDc` |
| `VERIFIER_ADDRESS`  | ZK verifier address                 | `0xEf29b4549F80cd285D324F5411312a68fc292Da4` |
| `EXPECTED_FEE_RATE` | Expected fee rate (in basis points) | `250` (0.25%)                                |
| `PRIVATE_KEY`       | Private key for test account        | (Hardhat default #0)                         |

### Solana Configuration

| Variable                    | Description                          | Default                                        |
| --------------------------- | ------------------------------------ | ---------------------------------------------- |
| `SOLANA_RPC_URL`            | Solana RPC endpoint URL              | `https://api.devnet.solana.com`                |
| `SOLANA_FACTORY_PROGRAM_ID` | Factory program ID                   | `4LXpWrr1BFYkffdxYNnV7LhMT4ETYt38amAGRQZg2WoJ` |
| `SOLANA_MIXER_PROGRAM_ID`   | Mixer program ID                     | `CGZ8t3ZgSnEkN5zbVsAJ21d5bu9vrsBvBh7xxnZZcrVu` |
| `SOLANA_STAKING_PROGRAM_ID` | Staking program ID                   | `EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ` |
| `SOLANA_PRIVATE_KEY`        | Solana wallet private key (optional) | If not provided, generates a new keypair       |

## Notes

- **EVM**: The script uses the first Hardhat default account by default
- **Test amounts are set to 0.05 ETH/0.05 SOL** to minimize costs
- **EVM**: Total estimated cost: ~0.15 ETH including gas fees
- **Solana**: Total estimated cost: ~0.15 SOL including transaction fees
- **Solana**: If no private key is provided, a new keypair is generated (needs to be funded)
- Store secrets and nullifiers securely in production (they're needed for withdrawals)
- Some tests may be skipped if prerequisites aren't met (e.g., no active season for claiming)
- The script will continue even if some tests fail, showing a summary at the end
- Both EVM and Solana tests run independently - you can configure one or both
