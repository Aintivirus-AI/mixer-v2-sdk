# AintiVirus Mixer SDK

TypeScript SDK for easy integration with AintiVirus Mixer - a privacy-preserving transaction mixer for both EVM (Ethereum) and Solana blockchains.

## Features

- 🔒 **Privacy-Preserving Transactions**: Deposit and withdraw funds anonymously using zero-knowledge proofs
- 💰 **Multi-Asset Support**: Support for native tokens (ETH/SOL) and ERC20/SPL tokens
- 🎯 **Staking & Rewards**: Stake assets and earn rewards from mixer fees
- 🌐 **Cross-Chain**: Unified API for both EVM and Solana
- 📦 **TypeScript**: Full TypeScript support with type definitions
- 🚀 **Easy Integration**: Simple API designed for frontend applications
- ⚛️ **React Hooks**: Optimized React hooks for Next.js with code splitting support
- 📊 **View Functions**: Comprehensive read-only functions for contract data
- 🔧 **Admin Functions**: Admin operations for contract management
- 🏗️ **Deploy Mixers**: Deploy new mixer instances programmatically

## Installation

```bash
npm install @aintivirus-ai/mixer-sdk
# or
yarn add @aintivirus-ai/mixer-sdk
```

## Quick Start

### React Hooks (Recommended for Next.js)

The SDK provides optimized React hooks for Next.js applications with automatic code splitting:

```typescript
import { useDeposit, ChainType } from "@aintivirus-ai/mixer-sdk/hooks";
import {
  generateSecretAndNullifier,
  computeCommitment,
} from "@aintivirus-ai/mixer-sdk";
import { parseEther } from "ethers";

function DepositPage() {
  const { deposit, isEVMReady } = useDeposit({
    evm: {
      factoryAddress: "0x...",
    },
  });

  const handleDeposit = async () => {
    const { secret, nullifier } = generateSecretAndNullifier();
    const commitment = computeCommitment(secret, nullifier);
    const amount = parseEther("1");

    await deposit(ChainType.EVM, amount, commitment);
  };

  return <button onClick={handleDeposit}>Deposit</button>;
}
```

**Available Hooks:**

- `useDeposit` - For deposits only
- `useStake` - For staking/unstaking only
- `useClaim` - For claiming rewards only
- `useWithdraw` - For withdrawals only
- `useView` - For reading contract data only
- `useDeploy` - For deploying mixers only
- `useAdmin` - For admin operations only
- `useAintiVirus` - All-in-one hook (when you need multiple functions)

See [Examples](#examples) section for complete hook examples.

### EVM (Ethereum) Example

```typescript
import {
  AintiVirusEVM,
  AssetMode,
  generateSecretAndNullifier,
  computeCommitment,
} from "@aintivirus-ai/mixer-sdk";
import { ethers } from "ethers";

// Connect to Ethereum
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Initialize SDK
const sdk = new AintiVirusEVM(
  "0x...", // Factory contract address
  "0x...", // Token contract address
  signer,
);

// Deposit ETH
const { secret, nullifier } = generateSecretAndNullifier();
const commitment = computeCommitment(secret, nullifier);
const amount = ethers.parseEther("1"); // 1 ETH

const result = await sdk.depositEth(amount, commitment);
console.log("Deposit transaction:", result.txHash);

// Withdraw (requires ZK proof - see proof generation section)
// const proof = await generateWithdrawalProof(...);
// await sdk.withdraw(proof, amount, AssetMode.ETH);

// Stake ETH
await sdk.stakeEther(ethers.parseEther("10"));

// Claim rewards
const currentSeason = await sdk.getCurrentStakeSeason();
await sdk.claimEth(currentSeason);
```

### Solana Example

```typescript
import {
  AintiVirusSolana,
  AssetMode,
  generateSecretAndNullifier,
  computeCommitment,
} from "@aintivirus-ai/mixer-sdk";
import { Connection, Keypair } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";

// Connect to Solana
const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = new Wallet(keypair); // Your wallet/keypair

// Initialize SDK
const sdk = new AintiVirusSolana(
  "AinTiV1ru5FacTor1111111111111111111111111111", // Factory program ID
  "AinTiV1ru5Mixer1111111111111111111111111111", // Mixer program ID
  "AinTiV1ru5Staking1111111111111111111111111111", // Staking program ID
  wallet,
  connection,
  "TokenMintAddress...", // Optional: Token mint address
);

// Deposit SOL
const { secret, nullifier } = generateSecretAndNullifier();
const commitment = computeCommitment(secret, nullifier);
const amount = 1_000_000_000n; // 1 SOL (in lamports)

const result = await sdk.depositSol(amount, commitment);
console.log("Deposit transaction:", result.txHash);

// Stake SOL
await sdk.stakeSol(10_000_000_000n); // 10 SOL
```

## React Hooks API

### Individual Hooks (Recommended for Code Splitting)

Each hook only loads what it needs, improving bundle size and page load performance.

#### `useDeposit`

```typescript
import { useDeposit, ChainType } from "@aintivirus-ai/mixer-sdk/hooks";

const { deposit, isEVMReady, isSolanaReady } = useDeposit({
  evm: {
    factoryAddress: "0x...",
    tokenAddress: "0x...", // Optional
  },
  solana: {
    factoryProgramId: "...",
    mixerProgramId: "...",
    stakingProgramId: "...",
    tokenMint: "...", // Optional
  },
  solanaWallet: wallet, // Optional
  solanaConnection: connection, // Optional
});

// Deposit
await deposit(ChainType.EVM, amount, commitment);
```

#### `useStake`

```typescript
import { useStake, ChainType } from "@aintivirus-ai/mixer-sdk/hooks";

const { stake, unstake, isEVMReady } = useStake({
  evm: {
    factoryAddress: "0x...",
  },
});

// Stake
await stake(ChainType.EVM, amount);

// Unstake
await unstake(ChainType.EVM);
```

#### `useClaim`

```typescript
import { useClaim, ChainType } from "@aintivirus-ai/mixer-sdk/hooks";

const { claim, getCurrentSeason, isEVMReady } = useClaim({
  evm: {
    factoryAddress: "0x...",
  },
});

// Get current season and claim
const season = await getCurrentSeason(ChainType.EVM);
if (season) {
  await claim(ChainType.EVM, season);
}
```

#### `useWithdraw`

```typescript
import {
  useWithdraw,
  ChainType,
  AssetMode,
} from "@aintivirus-ai/mixer-sdk/hooks";

const { withdraw, isEVMReady } = useWithdraw();

// Withdraw
await withdraw(ChainType.EVM, proof, amount, AssetMode.ETH);
```

#### `useView`

```typescript
import { useView, ChainType, AssetMode } from "@aintivirus-ai/mixer-sdk/hooks";

const {
  getMixer,
  mixerExists,
  calculateDepositAmount,
  getFeeRate,
  getCurrentSeason,
  getStakeSeason,
  getStakerRecord,
  hasClaimedEth,
  getTokenBalance,
  getEthBalance,
  isEVMReady,
} = useView({
  evm: {
    factoryAddress: "0x...",
  },
});

// Read contract data
const mixer = await getMixer(ChainType.EVM, AssetMode.ETH, amount);
const exists = await mixerExists(ChainType.EVM, AssetMode.ETH, amount);
const feeRate = await getFeeRate(ChainType.EVM);
```

#### `useDeploy`

```typescript
import {
  useDeploy,
  ChainType,
  AssetMode,
} from "@aintivirus-ai/mixer-sdk/hooks";

const { deployMixer, isEVMReady } = useDeploy({
  evm: {
    factoryAddress: "0x...",
  },
});

// Deploy new mixer
const result = await deployMixer(ChainType.EVM, AssetMode.ETH, amount);
console.log("Mixer address:", result.mixerAddress);
```

#### `useAdmin`

```typescript
import { useAdmin, ChainType } from "@aintivirus-ai/mixer-sdk/hooks";

const {
  setFeeRate,
  setStakingSeasonPeriod,
  startStakeSeason,
  setVerifier,
  setHasher,
  isEVMReady,
} = useAdmin({
  evm: {
    factoryAddress: "0x...",
  },
});

// Admin operations (requires OPERATOR_ROLE)
await setFeeRate(ChainType.EVM, BigInt(250)); // 0.25%
await setStakingSeasonPeriod(ChainType.EVM, BigInt(86400)); // 1 day
await startStakeSeason(ChainType.EVM);
```

#### `useAintiVirus` (Unified Hook)

Use this hook when you need multiple functions on the same page:

```typescript
import { useAintiVirus, ChainType } from "@aintivirus-ai/mixer-sdk/hooks";

const {
  deposit,
  withdraw,
  stake,
  unstake,
  claim,
  getCurrentSeason,
  getMixer,
  mixerExists,
  calculateDepositAmount,
  isEVMReady,
  isSolanaReady,
} = useAintiVirus({
  evm: {
    factoryAddress: "0x...",
  },
});
```

### Code Splitting Benefits

Using individual hooks provides better code splitting:

```typescript
// ✅ Good - Only loads deposit code
import { useDeposit } from "@aintivirus-ai/mixer-sdk/hooks";

// ❌ Bad - Loads everything (deposit, withdraw, stake, claim, etc.)
import { useAintiVirus } from "@aintivirus-ai/mixer-sdk/hooks";
```

**Benefits:**

- Smaller bundle size per page
- Faster page loads
- Better tree-shaking
- Cleaner code organization

## SDK Classes API Reference

### EVM SDK (`AintiVirusEVM`)

#### Constructor

```typescript
new AintiVirusEVM(
  factoryAddress: string,
  tokenAddress: string,
  signerOrProvider: Signer | Provider
)
```

#### Methods

##### Deposits

- `depositEth(amount: bigint, commitment: bigint): Promise<TransactionResult>`
- `depositToken(amount: bigint, commitment: bigint): Promise<TransactionResult>`

##### Withdrawals

- `withdraw(proof: WithdrawalProof, amount: bigint, mode: AssetMode): Promise<TransactionResult>`

##### Staking

- `stakeEther(amount: bigint): Promise<TransactionResult>`
- `stakeToken(amount: bigint): Promise<TransactionResult>`
- `unstakeEth(): Promise<TransactionResult>`
- `unstakeToken(): Promise<TransactionResult>`

##### Rewards

- `claimEth(seasonId: bigint): Promise<TransactionResult>`
- `claimToken(seasonId: bigint): Promise<TransactionResult>`

##### View Functions

- `getMixer(mode: AssetMode, amount: bigint): Promise<string>`
- `mixerExists(mode: AssetMode, amount: bigint): Promise<boolean>`
- `calculateDepositAmount(amount: bigint): Promise<bigint>`
- `getFeeRate(): Promise<bigint>`
- `getCurrentStakeSeason(): Promise<bigint>`
- `getStakeSeason(seasonId: bigint): Promise<StakeSeason>`
- `getStakerRecord(address: string): Promise<StakerRecord>`
- `hasClaimedEth(address: string, seasonId: bigint): Promise<boolean>`
- `hasClaimedToken(address: string, seasonId: bigint): Promise<boolean>`
- `getTokenBalance(address: string): Promise<bigint>`
- `getEthBalance(address: string): Promise<bigint>`
- `getStakingAddress(): Promise<string>`

##### Deployment

- `deployMixer(mode: AssetMode, amount: bigint): Promise<TransactionResult & { mixerAddress: string }>`

### Solana SDK (`AintiVirusSolana`)

#### Constructor

```typescript
new AintiVirusSolana(
  factoryProgramId: string,
  mixerProgramId: string,
  stakingProgramId: string,
  wallet: Wallet,
  connection: Connection,
  tokenMint?: string
)
```

#### Methods

##### Deposits

- `depositSol(amount: bigint, commitment: bigint): Promise<TransactionResult>`
- `depositToken(amount: bigint, commitment: bigint): Promise<TransactionResult>`

##### Withdrawals

- `withdraw(instructionData: Buffer, nullifierHash: bigint, amount: bigint, mode: AssetMode): Promise<TransactionResult>`

##### Staking

- `stakeSol(amount: bigint): Promise<TransactionResult>`
- `stakeToken(amount: bigint): Promise<TransactionResult>`
- `unstakeSol(): Promise<TransactionResult>`
- `unstakeToken(): Promise<TransactionResult>`

##### Rewards

- `claimSol(seasonId: bigint): Promise<TransactionResult>`
- `claimToken(seasonId: bigint): Promise<TransactionResult>`

##### View Functions

- `getMixer(mode: AssetMode, amount: bigint): Promise<PublicKey>`
- `mixerExists(mode: AssetMode, amount: bigint): Promise<boolean>`
- `calculateDepositAmount(amount: bigint): Promise<bigint>`
- `getFeeRate(): Promise<bigint>`
- `getCurrentStakeSeason(): Promise<bigint>`
- `getStakeSeason(seasonId: bigint): Promise<StakeSeason>`
- `getStakerRecord(address: PublicKey): Promise<StakerRecord>`
- `hasClaimedSol(address: PublicKey, seasonId: bigint): Promise<boolean>`
- `hasClaimedToken(address: PublicKey, seasonId: bigint): Promise<boolean>`
- `getSolBalance(address: PublicKey): Promise<bigint>`
- `getTokenBalance(address: PublicKey): Promise<bigint>`
- `getStakingAddress(): Promise<PublicKey>`

##### Deployment

- `deployMixer(mode: AssetMode, amount: bigint): Promise<TransactionResult>`

##### Admin Functions

- `setFeeRate(feeRate: bigint): Promise<TransactionResult>`
- `setStakingSeasonPeriod(period: bigint): Promise<TransactionResult>`
- `startStakeSeason(): Promise<TransactionResult>`
- `setVerifier(verifierAddress: string): Promise<TransactionResult>`
- `setHasher(hasherAddress: string): Promise<TransactionResult>`

## Proof Generation

### Generating Deposit Data

```typescript
import {
  generateSecretAndNullifier,
  computeCommitment,
} from "@aintivirus-ai/mixer-sdk";

// Generate secret and nullifier
const { secret, nullifier } = generateSecretAndNullifier();

// Compute commitment
const commitment = computeCommitment(secret, nullifier);

// Store these securely - you'll need them for withdrawal
// secret and nullifier should be kept private
```

### Generating Withdrawal Proof

Set `CIRCUIT_WASM` and `CIRCUIT_ZKEY` in your environment. Values may be HTTPS URLs (fetched at proof time) or base64-encoded file content.

```typescript
import {
  generateWithdrawalProofFromData,
  buildMerkleTree,
  getMerklePath,
} from "@aintivirus-ai/mixer-sdk";

// Get all commitments from deposit events
const commitments = [
  /* ... commitments from events ... */
];

// Build merkle tree
const tree = buildMerkleTree(commitments);
const root = BigInt(tree.root);

// Get merkle path for your commitment
const path = getMerklePath(tree, commitment);

// Generate proof (circuit files loaded from env)
const proof = await generateWithdrawalProofFromData({
  secret,
  nullifier,
  recipient: "0x...", // Recipient address
  commitments,
});

// Withdraw
await sdk.withdraw(proof, amount, AssetMode.ETH);
```

## Staking & Rewards

### Staking Flow

```typescript
// 1. Stake assets
await sdk.stakeEther(ethers.parseEther("10"));

// 2. Wait for season to end (or check current season)
const currentSeason = await sdk.getCurrentStakeSeason();

// 3. Check if you can claim
const hasClaimed = await sdk.hasClaimedEth(userAddress, currentSeason);
if (!hasClaimed) {
  // 4. Claim rewards
  await sdk.claimEth(currentSeason);
}

// 5. Unstake (optional)
await sdk.unstakeEth();
```

### Viewing Staking Information

```typescript
// Get current season
const season = await sdk.getCurrentStakeSeason();

// Get season details
const seasonInfo = await sdk.getStakeSeason(season);
console.log("Total rewards:", seasonInfo.totalRewardEthAmount);

// Get your staking record
const record = await sdk.getStakerRecord(userAddress);
console.log("Staked amount:", record.stakedEthAmount);
console.log("Weight value:", record.ethWeightValue);
```

## Types

### AssetMode

```typescript
enum AssetMode {
  ETH = 0, // For EVM: ETH, For Solana: SOL
  TOKEN = 1,
}
```

### WithdrawalProof

```typescript
interface WithdrawalProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint];
}
```

### TransactionResult

```typescript
interface TransactionResult {
  txHash: string;
  blockNumber?: number;
  blockTime?: number;
}
```

## Error Handling

```typescript
try {
  await sdk.depositEth(amount, commitment);
} catch (error) {
  if (error.message.includes("Insufficient")) {
    // Handle insufficient balance
  } else if (error.message.includes("Mixer not deployed")) {
    // Handle mixer not found
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Store Secrets Securely**: Always store `secret` and `nullifier` securely. You'll need them for withdrawals.

2. **Check Mixer Existence**: Before depositing, check if the mixer exists:

   ```typescript
   const exists = await sdk.mixerExists(AssetMode.ETH, amount);
   if (!exists) {
     throw new Error("Mixer not deployed for this amount");
   }
   ```

3. **Calculate Fees**: Always calculate the total amount including fees:

   ```typescript
   const totalAmount = await sdk.calculateDepositAmount(amount);
   ```

4. **Handle Approvals**: For token deposits/staking, ensure you approve the factory contract:

   ```typescript
   const allowance = await token.allowance(userAddress, factoryAddress);
   if (allowance < amount) {
     await token.approve(factoryAddress, amount);
   }
   ```

5. **Monitor Transactions**: Always wait for transaction confirmations:
   ```typescript
   const result = await sdk.depositEth(amount, commitment);
   await provider.waitForTransaction(result.txHash);
   ```

## Examples

Complete example implementations are available in the `examples/` directory:

- **`deposit-page.tsx`** - Deposit page using `useDeposit` hook
- **`stake-page.tsx`** - Staking page using `useStake` hook
- **`view-functions-page.tsx`** - View functions page using `useView` hook
- **`admin-page.tsx`** - Admin panel using `useAdmin` hook
- **`deploy-mixer-page.tsx`** - Deploy mixer page using `useDeploy` hook

Each example demonstrates:

- Proper hook usage
- Error handling
- Loading states
- Transaction status display

## Next.js Integration

The hooks are optimized for Next.js with `wagmi` for EVM interactions. See the examples directory for complete Next.js integration patterns.

### Setup

1. Install dependencies:

```bash
npm install @aintivirus-ai/mixer-sdk wagmi viem @tanstack/react-query
```

2. Configure wagmi in your Next.js app (see examples for full setup)

3. Use hooks in your components:

```typescript
import { useDeposit, ChainType } from "@aintivirus-ai/mixer-sdk/hooks";
```

## Development

### Building

```bash
npm run build
```

### TypeScript

The SDK is written in TypeScript and includes full type definitions. Make sure your project has TypeScript configured.

## License

MIT

## Support

For issues, questions, or contributions, please refer to the project repository.
