import type { AssetMode } from "../../types";
import { QUERIES } from "./queries";
import {
  type ClaimedEntity,
  type DepositEntity,
  type DepositOrderBy,
  type MixerPool,
  type MixerPoolOrderBy,
  type OrderDirection,
  type ProtocolState,
  type SeasonAssetEntity,
  type SeasonEntity,
  type StakedEntity,
  type SubgraphClientConfig,
  type UnstakedEntity,
  type WithdrawalEntity,
  type WithdrawalOrderBy,
} from "./types";
import { asBigint, assetFromMode, getPoolId as getPoolIdUtil, requireFetch } from "./utils";

export class AintiVirusEVMSubgraph {
  private readonly endpoint: string;
  private readonly fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  private readonly headers?: Record<string, string>;

  constructor(config: SubgraphClientConfig) {
    this.endpoint = config.endpoint;
    this.fetch = requireFetch(config.fetch);
    this.headers = config.headers;
  }

  private async request<TData>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<TData> {
    const res = await this.fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.headers ?? {}),
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Subgraph HTTP ${res.status}: ${text || res.statusText}`);
    }

    const json = (await res.json()) as any;
    if (json.errors?.length) {
      throw new Error(`Subgraph error: ${json.errors[0]?.message ?? "Unknown"}`);
    }
    return json.data as TData;
  }

  /**
   * Fetch the Protocol singleton state entity.
   *
   * Note: The actual ID depends on your mappings. If unsure, call `getAnyProtocol()`.
   */
  async getProtocol(id: string): Promise<ProtocolState | null> {
    const data = await this.request<{ protocol: any | null }>(QUERIES.protocol, {
      id,
    });

    if (!data.protocol) return null;
    const p = data.protocol;
    return {
      id: p.id,
      feeRate: asBigint(p.feeRate),
      relayerFeeRate: 0n,
      factoryAddress: p.factoryAddress ?? null,
      stakingAddress: p.stakingAddress ?? null,
      nextSeasonDuration: asBigint(p.nextSeasonDuration),
      currentSeasonId: asBigint(p.currentSeasonId),
      totalDeposited: asBigint(p.totalDeposited),
      totalWithdrawn: asBigint(p.totalWithdrawn),
      depositCount: asBigint(p.depositCount),
      withdrawalCount: asBigint(p.withdrawalCount),
      totalStaked: asBigint(p.totalStaked),
      totalClaimed: asBigint(p.totalClaimed),
      updatedBlockNumber: p.updatedBlockNumber ? asBigint(p.updatedBlockNumber) : null,
      updatedBlockTimestamp: p.updatedBlockTimestamp
        ? asBigint(p.updatedBlockTimestamp)
        : null,
      updatedTransactionHash: p.updatedTransactionHash ?? null,
    };
  }

  /**
   * Convenience helper when you don't know the Protocol entity id.
   */
  async getProtocolData(): Promise<ProtocolState | null> {
    const data = await this.request<{ protocols: any[] }>(QUERIES.protocolData);
    const p = data.protocols?.[0];
    if (!p) return null;
    return {
      id: p.id,
      feeRate: asBigint(p.feeRate),
      relayerFeeRate: 0n,
      factoryAddress: p.factoryAddress ?? null,
      stakingAddress: p.stakingAddress ?? null,
      nextSeasonDuration: asBigint(p.nextSeasonDuration),
      currentSeasonId: asBigint(p.currentSeasonId),
      totalDeposited: asBigint(p.totalDeposited),
      totalWithdrawn: asBigint(p.totalWithdrawn),
      depositCount: asBigint(p.depositCount),
      withdrawalCount: asBigint(p.withdrawalCount),
      totalStaked: asBigint(p.totalStaked),
      totalClaimed: asBigint(p.totalClaimed),
      updatedBlockNumber: p.updatedBlockNumber ? asBigint(p.updatedBlockNumber) : null,
      updatedBlockTimestamp: p.updatedBlockTimestamp
        ? asBigint(p.updatedBlockTimestamp)
        : null,
      updatedTransactionHash: p.updatedTransactionHash ?? null,
    };
  }

  /**
   * Mixer pools (asset address + fixed amount). Schema id: `<asset>-<amount>`.
   */
  async getMixerPools(params?: {
    first?: number;
    skip?: number;
    asset?: string;
    orderBy?: MixerPoolOrderBy;
    orderDirection?: OrderDirection;
  }): Promise<MixerPool[]> {
    const {
      first = 50,
      skip = 0,
      asset,
      orderBy = "deployedBlockTimestamp",
      orderDirection = "desc",
    } = params ?? {};

    const where = asset ? { asset: asset.toLowerCase() } : {};

    const data = await this.request<{ mixerPools: any[] }>(QUERIES.mixerPools, {
      first,
      skip,
      where,
      orderBy,
      orderDirection,
    });

    return (data.mixerPools ?? []).map((p) => ({
      id: p.id,
      asset: typeof p.asset === "string" ? p.asset : String(p.asset),
      amount: asBigint(p.amount),
      address: typeof p.address === "string" ? p.address : String(p.address),
      deployedBlockNumber: asBigint(p.deployedBlockNumber),
      deployedBlockTimestamp: asBigint(p.deployedBlockTimestamp),
      deployedTransactionHash:
        typeof p.deployedTransactionHash === "string"
          ? p.deployedTransactionHash
          : String(p.deployedTransactionHash),
      totalDeposited: asBigint(p.totalDeposited),
      totalWithdrawn: asBigint(p.totalWithdrawn),
      depositCount: asBigint(p.depositCount),
      withdrawalCount: asBigint(p.withdrawalCount),
    }));
  }

  /**
   * Pool id in subgraph: `<asset>-<amount>` (asset = hex address).
   */
  getPoolId(asset: string, amount: bigint): string {
    return getPoolIdUtil(asset, amount);
  }

  /**
   * Convenience for SDK callers that use AssetMode. For TOKEN mode, pass tokenAddress.
   */
  getPoolIdFromAssetMode(
    mode: AssetMode,
    amount: bigint,
    tokenAddress?: string
  ): string {
    return getPoolIdUtil(assetFromMode(mode, tokenAddress), amount);
  }

  async getMixerPoolById(id: string): Promise<MixerPool | null> {
    const data = await this.request<{ mixerPool: any | null }>(
      QUERIES.mixerPoolById,
      { id }
    );
    const p = data.mixerPool;
    if (!p) return null;
    return {
      id: p.id,
      asset: typeof p.asset === "string" ? p.asset : String(p.asset),
      amount: asBigint(p.amount),
      address: typeof p.address === "string" ? p.address : String(p.address),
      deployedBlockNumber: asBigint(p.deployedBlockNumber),
      deployedBlockTimestamp: asBigint(p.deployedBlockTimestamp),
      deployedTransactionHash:
        typeof p.deployedTransactionHash === "string"
          ? p.deployedTransactionHash
          : String(p.deployedTransactionHash),
      totalDeposited: asBigint(p.totalDeposited),
      totalWithdrawn: asBigint(p.totalWithdrawn),
      depositCount: asBigint(p.depositCount),
      withdrawalCount: asBigint(p.withdrawalCount),
    };
  }

  async getDeposits(params: {
    poolId?: string;
    first?: number;
    skip?: number;
    orderBy?: DepositOrderBy;
    orderDirection?: OrderDirection;
  }): Promise<DepositEntity[]> {
    const {
      poolId,
      first = 50,
      skip = 0,
      orderBy = "blockTimestamp",
      orderDirection = "desc",
    } = params;

    const where: any = {};
    if (poolId) where.pool = poolId;

    const data = await this.request<{ deposits: any[] }>(QUERIES.deposits, {
      first,
      skip,
      where,
      orderBy,
      orderDirection,
    });

    return (data.deposits ?? []).map((d) => ({
      id: d.id,
      pool: { id: d.pool?.id },
      commitment: d.commitment,
      blockNumber: asBigint(d.blockNumber),
      blockTimestamp: asBigint(d.blockTimestamp),
      transactionHash: d.transactionHash,
    }));
  }

  async getWithdrawals(params: {
    poolId?: string;
    to?: string;
    first?: number;
    skip?: number;
    orderBy?: WithdrawalOrderBy;
    orderDirection?: OrderDirection;
  }): Promise<WithdrawalEntity[]> {
    const {
      poolId,
      to,
      first = 50,
      skip = 0,
      orderBy = "blockTimestamp",
      orderDirection = "desc",
    } = params;

    const where: any = {};
    if (poolId) where.pool = poolId;
    if (to) where.to = to.toLowerCase();

    const data = await this.request<{ withdrawals: any[] }>(QUERIES.withdrawals, {
      first,
      skip,
      where,
      orderBy,
      orderDirection,
    });

    return (data.withdrawals ?? []).map((w) => ({
      id: w.id,
      pool: { id: w.pool?.id },
      to: typeof w.to === "string" ? w.to : String(w.to),
      nullifierHash: typeof w.nullifierHash === "string" ? w.nullifierHash : String(w.nullifierHash),
      blockNumber: asBigint(w.blockNumber),
      blockTimestamp: asBigint(w.blockTimestamp),
      transactionHash: typeof w.transactionHash === "string" ? w.transactionHash : String(w.transactionHash),
    }));
  }

  async getSeason(seasonId: bigint): Promise<SeasonEntity | null> {
    const id = seasonId.toString();
    const data = await this.request<{ season: any | null }>(QUERIES.season, { id });

    const s = data.season;
    if (!s) return null;
    return {
      id: s.id,
      seasonId: asBigint(s.seasonId),
      start: asBigint(s.start),
      end: asBigint(s.end),
      duration: asBigint(s.duration),
      assets: (s.assets ?? []).map((a: any) => ({
        id: a.id,
        asset: typeof a.asset === "string" ? a.asset : String(a.asset),
        duration: asBigint(a.duration),
        totalStaked: asBigint(a.totalStaked),
        totalReward: asBigint(a.totalReward),
        totalWeight: asBigint(a.totalWeight),
      })),
    };
  }

  async getSeasonAssets(params?: {
    seasonId?: bigint;
    asset?: string;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<SeasonAssetEntity[]> {
    const {
      seasonId,
      asset,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (seasonId !== undefined) where.season = seasonId.toString();
    if (asset) where.asset = asset.toLowerCase();

    const data = await this.request<{ seasonAssets: any[] }>(
      QUERIES.seasonAssets,
      { first, skip, where, orderDirection }
    );

    return (data.seasonAssets ?? []).map((a) => ({
      id: a.id,
      asset: typeof a.asset === "string" ? a.asset : String(a.asset),
      duration: asBigint(a.duration),
      totalStaked: asBigint(a.totalStaked),
      totalReward: asBigint(a.totalReward),
      totalWeight: asBigint(a.totalWeight),
    }));
  }

  async getStakedEvents(params?: {
    staker?: string;
    seasonAssetId?: string;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<StakedEntity[]> {
    const {
      staker,
      seasonAssetId,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (staker) where.staker = staker.toLowerCase();
    if (seasonAssetId) where.seasonAsset = seasonAssetId;

    const data = await this.request<{ stakeds: any[] }>(QUERIES.stakedEvents, {
      first,
      skip,
      where,
      orderDirection,
    });

    return (data.stakeds ?? []).map((e) => ({
      id: e.id,
      staker: e.staker,
      seasonAsset: { id: e.seasonAsset?.id },
      amount: asBigint(e.amount),
      blockNumber: asBigint(e.blockNumber),
      blockTimestamp: asBigint(e.blockTimestamp),
      transactionHash: e.transactionHash,
    }));
  }

  async getUnstakedEvents(params?: {
    staker?: string;
    seasonAssetId?: string;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<UnstakedEntity[]> {
    const {
      staker,
      seasonAssetId,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (staker) where.staker = staker.toLowerCase();
    if (seasonAssetId) where.seasonAsset = seasonAssetId;

    const data = await this.request<{ unstakeds: any[] }>(QUERIES.unstakedEvents, {
      first,
      skip,
      where,
      orderDirection,
    });

    return (data.unstakeds ?? []).map((e) => ({
      id: e.id,
      staker: e.staker,
      seasonAsset: { id: e.seasonAsset?.id },
      amount: asBigint(e.amount),
      blockNumber: asBigint(e.blockNumber),
      blockTimestamp: asBigint(e.blockTimestamp),
      transactionHash: e.transactionHash,
    }));
  }

  async getClaimedEvents(params?: {
    staker?: string;
    seasonAssetId?: string;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<ClaimedEntity[]> {
    const {
      staker,
      seasonAssetId,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (staker) where.staker = staker.toLowerCase();
    if (seasonAssetId) where.seasonAsset = seasonAssetId;

    const data = await this.request<{ claimeds: any[] }>(QUERIES.claimedEvents, {
      first,
      skip,
      where,
      orderDirection,
    });

    return (data.claimeds ?? []).map((e) => ({
      id: e.id,
      staker: e.staker,
      seasonAsset: { id: e.seasonAsset?.id },
      amount: asBigint(e.amount),
      blockNumber: asBigint(e.blockNumber),
      blockTimestamp: asBigint(e.blockTimestamp),
      transactionHash: e.transactionHash,
    }));
  }
}

