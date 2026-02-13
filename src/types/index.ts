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
 * Per-chain EVM config (one entry per chainId in MixerSDKConfig.chains.evm)
 */
export interface EvmChainConfig {
  factoryAddress: string;
  tokenAddress?: string;
  rpcUrl?: string;
  subgraphUrl?: string;
}

/**
 * Per-network Solana config (one entry per network in MixerSDKConfig.chains.solana).
 * Config still normalized; Solana SDK/hooks integration is disabled.
 */
export interface SolanaChainConfig {
  factoryProgramId: string;
  mixerProgramId: string;
  stakingProgramId: string;
  tokenMint?: string;
  rpcUrl?: string;
}

/**
 * Multi-chain SDK config (settings JSON shape).
 * Use this for 5 EVM chains + Solana; pass to MixerProvider or createMixerSDK().
 */
export interface MixerSDKConfig {
  chains: {
    evm: Record<number, EvmChainConfig>;
    solana?: Record<string, SolanaChainConfig>;
  };
  useMulticall?: boolean;
}

/**
 * Configuration for SDK initialization (legacy single-chain)
 */
export interface SDKConfig {
  // Legacy: single EVM chain
  evm?: {
    factoryAddress: string;
    tokenAddress?: string;
    rpcUrl?: string;
    provider?: unknown;
  };
  // Legacy: single Solana network
  solana?: {
    factoryProgramId: string;
    mixerProgramId: string;
    stakingProgramId: string;
    tokenMint?: string;
    rpcUrl?: string;
    connection?: unknown;
  };
  // Multi-chain (when set, takes precedence; evm/solana used for backward compat)
  chains?: {
    evm?: Record<number, EvmChainConfig>;
    solana?: Record<string, SolanaChainConfig>;
  };
  useMulticall?: boolean;
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
 * Hook configuration for Solana (Solana integration disabled in hooks).
 */
export interface SolanaHookConfig {
  factoryProgramId: string;
  mixerProgramId: string;
  stakingProgramId: string;
  tokenMint?: string;
}
