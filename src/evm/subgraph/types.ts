import type { AssetMode } from "../../types";

export type GraphFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type OrderDirection = "asc" | "desc";

export type MixerPoolOrderBy =
  | "id"
  | "asset"
  | "amount"
  | "deployedBlockNumber"
  | "deployedBlockTimestamp"
  | "depositCount"
  | "withdrawalCount"
  | "totalDeposited"
  | "totalWithdrawn";

export type DepositOrderBy = "blockTimestamp" | "blockNumber";
export type WithdrawalOrderBy = "blockTimestamp" | "blockNumber";

export interface SubgraphClientConfig {
  endpoint: string;
  fetch?: GraphFetch;
  /**
   * Optional request headers (e.g. auth)
   */
  headers?: Record<string, string>;
}

export type { AssetMode };

export interface ProtocolState {
  id: string;
  feeRate: bigint;
  /** Not present in current subgraph schema; set to 0n if needed for compatibility */
  relayerFeeRate?: bigint;
  factoryAddress?: string | null;
  stakingAddress?: string | null;
  feeCollector?: string | null;
  rewardPoolShareBps?: bigint | null;
  nextSeasonDuration: bigint;
  currentSeasonId: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  depositCount: bigint;
  withdrawalCount: bigint;
  totalStaked: bigint;
  totalClaimed: bigint;
  /** Cumulative staked amount across all seasons */
  totalStakedAllTime?: bigint;
  /** Cumulative rewards added across all seasons */
  totalRewardsAddedAllTime?: bigint;
  updatedBlockNumber?: bigint | null;
  updatedBlockTimestamp?: bigint | null;
  updatedTransactionHash?: string | null;
}

export interface MixerPool {
  id: string; // <asset>-<amount>, asset is hex address
  asset: string; // address as hex (ETH_ADDRESS or token)
  amount: bigint;
  address: string;
  deployedBlockNumber: bigint;
  deployedBlockTimestamp: bigint;
  deployedTransactionHash: string;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  depositCount: bigint;
  withdrawalCount: bigint;
}

export interface DepositEntity {
  id: string;
  pool: { id: string };
  commitment: string;
  protocolFee?: bigint;
  extraFee?: bigint;
  partnerAddress?: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

export interface WithdrawalEntity {
  id: string;
  pool: { id: string };
  to: string;
  nullifierHash: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

export interface StakedEntity {
  id: string;
  staker: string;
  seasonAsset: { id: string };
  amount: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

export interface UnstakedEntity {
  id: string;
  staker: string;
  seasonAsset: { id: string };
  amount: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

export interface ClaimedEntity {
  id: string;
  staker: string;
  seasonAsset: { id: string };
  amount: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

/** SeasonAsset id = <seasonId>-<asset (hex)> */
export interface SeasonAssetEntity {
  id: string;
  asset: string; // address as hex
  duration: bigint;
  totalStaked: bigint;
  totalReward: bigint;
  totalWeight: bigint;
}

export interface SeasonEntity {
  id: string;
  seasonId: bigint;
  start: bigint;
  end: bigint;
  duration: bigint;
  /** TVL for the season (sum across assets) */
  totalStaked?: bigint;
  /** Total rewards for the season */
  totalReward?: bigint;
  assets: SeasonAssetEntity[];
}

/** Per-staker participation in a season */
export interface StakerSeasonParticipant {
  staker: string;
  totalStaked: bigint;
}

/** Season with participants list (from participants relation) */
export interface SeasonWithParticipants extends Omit<SeasonEntity, "assets"> {
  participants: StakerSeasonParticipant[];
}

/** Season summary for list views */
export interface SeasonSummary {
  id: string;
  seasonId: bigint;
  totalStaked: bigint;
  totalReward: bigint;
  start: bigint;
  end: bigint;
}

export interface PaymentStats {
  id: string;
  contractAddress: string;
  treasuryWallet: string;
  totalVolume: bigint;
  paymentCount: bigint;
  updatedBlockNumber: bigint;
  updatedBlockTimestamp: bigint;
  updatedTransactionHash: string;
}

export interface PaymentProcessedEntity {
  id: string;
  orderId: string;
  buyer: string;
  token: string;
  amount: bigint;
  timestamp: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
  isNativeETH: boolean;
}

export interface TokenUpdatedEntity {
  id: string;
  token: string;
  allowed: boolean;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}
