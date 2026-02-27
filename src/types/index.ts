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
 * Withdrawal proof structure.
 * pubSignals: [nullifierHash, recipient, root, fee, relayer]
 */
export interface WithdrawalProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint];
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
 * Per-chain EVM config (one entry per chainId in MixerSDKConfig.chains.evm).
 * Optimized for many EVM networks: each chain can override multicall and RPC/subgraph independently.
 */
export interface EvmChainConfig {
  factoryAddress: string;
  tokenAddress?: string;
  /** WETH contract address (for identifying ETH pools; used with wethGatewayAddress) */
  wethAddress?: string;
  /** WETHGateway contract; required for native ETH deposits/stakes (Factory is ERC20-only) */
  wethGatewayAddress?: string;
  rpcUrl?: string;
  subgraphUrl?: string;
  /** Subgraph API key for The Graph Gateway (Bearer token). Required when using gateway.thegraph.com */
  subgraphApiKey?: string;
  /** Payment contract address (for subgraph payment stats / payment processed list) */
  paymentAddress?: string;
  /**
   * Multicall3 contract address for this chain. Omit to use the standard Multicall3 address.
   * Set when the chain uses a different multicall contract or address.
   */
  multicallAddress?: string;
  /**
   * Enable batch reads via multicall for this chain. Overrides global useMulticall when set.
   * Omit to use global config.useMulticall.
   */
  useMulticall?: boolean;
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
    wethAddress?: string;
    wethGatewayAddress?: string;
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
