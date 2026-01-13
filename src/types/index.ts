/**
 * Supported blockchain networks
 */
export enum ChainType {
  EVM = "EVM",
  SOLANA = "SOLANA",
}

/**
 * Asset modes for deposits and withdrawals
 */
export enum AssetMode {
  SOL = 0,
  ETH = 0,
  TOKEN = 1,
}

/**
 * Withdrawal proof structure
 */
export interface WithdrawalProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint];
}

/**
 * Deposit data structure
 */
export interface DepositData {
  secret: bigint;
  nullifier: bigint;
  commitment: bigint;
  amount: bigint;
  mode: AssetMode;
}

/**
 * Staking season information for Solana
 */
export interface SolanaStakeSeason {
  seasonId: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
  totalStakedSolAmount: bigint;
  totalStakedTokenAmount: bigint;
  totalRewardSolAmount: bigint;
  totalRewardTokenAmount: bigint;
  totalSolWeightValue: bigint;
  totalTokenWeightValue: bigint;
}

/**
 * Staker record information for Solana
 */
export interface SolanaStakerRecord {
  solStakedSeasonId: bigint;
  tokenStakedSeasonId: bigint;
  solStakedTimestamp: bigint;
  tokenStakedTimestamp: bigint;
  stakedSolAmount: bigint;
  stakedTokenAmount: bigint;
  solWeightValue: bigint;
  tokenWeightValue: bigint;
}

/**
 * Staking season information for EVM
 */
export interface EVMStakeSeason {
  seasonId: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
  totalStakedEthAmount: bigint;
  totalStakedTokenAmount: bigint;
  totalRewardEthAmount: bigint;
  totalRewardTokenAmount: bigint;
  totalEthWeightValue: bigint;
  totalTokenWeightValue: bigint;
}

/**
 * Staker record information for EVM
 */
export interface EVMStakerRecord {
  ethStakedSeasonId: bigint;
  tokenStakedSeasonId: bigint;
  ethStakedTimestamp: bigint;
  tokenStakedTimestamp: bigint;
  stakedEthAmount: bigint;
  stakedTokenAmount: bigint;
  ethWeightValue: bigint;
  tokenWeightValue: bigint;
}

/**
 * Staking season information (union type for backward compatibility)
 * @deprecated Use SolanaStakeSeason or EVMStakeSeason instead
 */
export type StakeSeason = SolanaStakeSeason | EVMStakeSeason;

/**
 * Staker record information (union type for backward compatibility)
 * @deprecated Use SolanaStakerRecord or EVMStakerRecord instead
 */
export type StakerRecord = SolanaStakerRecord | EVMStakerRecord;

/**
 * Configuration for SDK initialization
 */
export interface SDKConfig {
  // EVM Configuration
  evm?: {
    factoryAddress: string;
    tokenAddress: string;
    rpcUrl?: string;
    provider?: any; // ethers.Provider
  };
  // Solana Configuration
  solana?: {
    factoryProgramId: string;
    mixerProgramId: string;
    stakingProgramId: string;
    tokenMint?: string;
    rpcUrl?: string;
    connection?: any; // Connection
  };
}

/**
 * Transaction result
 */
export interface TransactionResult {
  txHash: string;
  blockNumber?: number;
  blockTime?: number;
}

/**
 * Hook configuration for EVM
 */
export interface EVMHookConfig {
  factoryAddress: string;
  tokenAddress?: string;
}

/**
 * Hook configuration for Solana
 */
export interface SolanaHookConfig {
  factoryProgramId: string;
  mixerProgramId: string;
  stakingProgramId: string;
  tokenMint?: string;
}
