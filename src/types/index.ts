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
  ETH = 0, // For EVM: ETH, For Solana: SOL
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
 * Staking season information
 */
export interface StakeSeason {
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
 * Staker record information
 */
export interface StakerRecord {
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
