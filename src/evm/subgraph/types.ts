import type { AssetMode } from "../../types";

export type GraphFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type OrderDirection = "asc" | "desc";

export type MixerPoolOrderBy =
  | "id"
  | "mode"
  | "amount"
  | "deployedBlockNumber"
  | "deployedBlockTimestamp"
  | "depositCount"
  | "withdrawalCount"
  | "totalDeposited"
  | "totalWithdrawn";

export type DepositOrderBy = "blockTimestamp" | "blockNumber";
export type WithdrawalOrderBy = "blockTimestamp" | "blockNumber";

/**
 * Subgraph enum `Mode` (schema.graphql):
 * - ETH (0)
 * - AINTI (1)  // token mode
 */
export type SubgraphMode = "ETH" | "AINTI";

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
  relayerFeeRate: bigint;
  factoryAddress?: string | null;
  stakingAddress?: string | null;
  nextSeasonDuration: bigint;
  currentSeasonId: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  depositCount: bigint;
  withdrawalCount: bigint;
  totalStaked: bigint;
  totalClaimed: bigint;
  updatedBlockNumber?: bigint | null;
  updatedBlockTimestamp?: bigint | null;
  updatedTransactionHash?: string | null;
}

export interface MixerPool {
  id: string; // <mode>-<amount>
  mode: SubgraphMode;
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

export interface WithdrawalRelayedEntity {
  id: string;
  pool: { id: string };
  recipient: string;
  relayer: string;
  relayerFee: bigint;
  nullifierHash: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

export interface StakedEntity {
  id: string;
  staker: string;
  seasonMode: { id: string };
  amount: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

export interface UnstakedEntity {
  id: string;
  staker: string;
  seasonMode: { id: string };
  amount: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

export interface ClaimedEntity {
  id: string;
  staker: string;
  seasonMode: { id: string };
  amount: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
}

export interface SeasonModeEntity {
  id: string; // <seasonId>-<mode>
  mode: SubgraphMode;
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
  modes: SeasonModeEntity[];
}

