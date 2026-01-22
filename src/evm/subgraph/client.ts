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
  type SeasonEntity,
  type SeasonModeEntity,
  type StakedEntity,
  type SubgraphClientConfig,
  type SubgraphMode,
  type UnstakedEntity,
  type WithdrawalEntity,
  type WithdrawalOrderBy,
  type WithdrawalRelayedEntity,
} from "./types";
import { asBigint, requireFetch, toSubgraphMode } from "./utils";

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
      relayerFeeRate: asBigint(p.relayerFeeRate),
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
      relayerFeeRate: asBigint(p.relayerFeeRate),
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
   * Mixer pools (mode + fixed amount).
   */
  async getMixerPools(params?: {
    first?: number;
    skip?: number;
    mode?: SubgraphMode;
    orderBy?: MixerPoolOrderBy;
    orderDirection?: OrderDirection;
  }): Promise<MixerPool[]> {
    const {
      first = 50,
      skip = 0,
      mode,
      orderBy = "deployedBlockTimestamp",
      orderDirection = "desc",
    } = params ?? {};

    const where = mode ? { mode } : {};

    const data = await this.request<{ mixerPools: any[] }>(QUERIES.mixerPools, {
      first,
      skip,
      where,
      orderBy,
      orderDirection,
    });

    return (data.mixerPools ?? []).map((p) => ({
      id: p.id,
      mode: p.mode,
      amount: asBigint(p.amount),
      address: p.address,
      deployedBlockNumber: asBigint(p.deployedBlockNumber),
      deployedBlockTimestamp: asBigint(p.deployedBlockTimestamp),
      deployedTransactionHash: p.deployedTransactionHash,
      totalDeposited: asBigint(p.totalDeposited),
      totalWithdrawn: asBigint(p.totalWithdrawn),
      depositCount: asBigint(p.depositCount),
      withdrawalCount: asBigint(p.withdrawalCount),
    }));
  }

  /**
   * Pool id is defined by schema as: `<mode>-<amount>`.
   */
  getPoolId(mode: SubgraphMode, amount: bigint): string {
    return `${mode}-${amount.toString()}`;
  }

  /**
   * Convenience for SDK callers that use AssetMode.
   */
  getPoolIdFromAssetMode(mode: AssetMode, amount: bigint): string {
    return this.getPoolId(toSubgraphMode(mode), amount);
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
      mode: p.mode,
      amount: asBigint(p.amount),
      address: p.address,
      deployedBlockNumber: asBigint(p.deployedBlockNumber),
      deployedBlockTimestamp: asBigint(p.deployedBlockTimestamp),
      deployedTransactionHash: p.deployedTransactionHash,
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
      to: w.to,
      nullifierHash: w.nullifierHash,
      blockNumber: asBigint(w.blockNumber),
      blockTimestamp: asBigint(w.blockTimestamp),
      transactionHash: w.transactionHash,
    }));
  }

  async getWithdrawalsRelayed(params: {
    poolId?: string;
    recipient?: string;
    relayer?: string;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<WithdrawalRelayedEntity[]> {
    const {
      poolId,
      recipient,
      relayer,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (poolId) where.pool = poolId;
    if (recipient) where.recipient = recipient.toLowerCase();
    if (relayer) where.relayer = relayer.toLowerCase();

    const data = await this.request<{ withdrawalRelayeds: any[] }>(
      QUERIES.withdrawalsRelayed,
      { first, skip, where, orderDirection }
    );

    return (data.withdrawalRelayeds ?? []).map((w) => ({
      id: w.id,
      pool: { id: w.pool?.id },
      recipient: w.recipient,
      relayer: w.relayer,
      relayerFee: asBigint(w.relayerFee),
      nullifierHash: w.nullifierHash,
      blockNumber: asBigint(w.blockNumber),
      blockTimestamp: asBigint(w.blockTimestamp),
      transactionHash: w.transactionHash,
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
      modes: (s.modes ?? []).map((m: any) => ({
        id: m.id,
        mode: m.mode,
        duration: asBigint(m.duration),
        totalStaked: asBigint(m.totalStaked),
        totalReward: asBigint(m.totalReward),
        totalWeight: asBigint(m.totalWeight),
      })),
    };
  }

  async getSeasonModes(params?: {
    seasonId?: bigint;
    mode?: SubgraphMode;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<SeasonModeEntity[]> {
    const {
      seasonId,
      mode,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (seasonId !== undefined) where.season = seasonId.toString();
    if (mode) where.mode = mode;

    const data = await this.request<{ seasonModes: any[] }>(QUERIES.seasonModes, {
      first,
      skip,
      where,
      orderDirection,
    });

    return (data.seasonModes ?? []).map((m) => ({
      id: m.id,
      mode: m.mode,
      duration: asBigint(m.duration),
      totalStaked: asBigint(m.totalStaked),
      totalReward: asBigint(m.totalReward),
      totalWeight: asBigint(m.totalWeight),
    }));
  }

  async getStakedEvents(params?: {
    staker?: string;
    seasonModeId?: string;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<StakedEntity[]> {
    const {
      staker,
      seasonModeId,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (staker) where.staker = staker.toLowerCase();
    if (seasonModeId) where.seasonMode = seasonModeId;

    const data = await this.request<{ stakeds: any[] }>(QUERIES.stakedEvents, {
      first,
      skip,
      where,
      orderDirection,
    });

    return (data.stakeds ?? []).map((e) => ({
      id: e.id,
      staker: e.staker,
      seasonMode: { id: e.seasonMode?.id },
      amount: asBigint(e.amount),
      blockNumber: asBigint(e.blockNumber),
      blockTimestamp: asBigint(e.blockTimestamp),
      transactionHash: e.transactionHash,
    }));
  }

  async getUnstakedEvents(params?: {
    staker?: string;
    seasonModeId?: string;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<UnstakedEntity[]> {
    const {
      staker,
      seasonModeId,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (staker) where.staker = staker.toLowerCase();
    if (seasonModeId) where.seasonMode = seasonModeId;

    const data = await this.request<{ unstakeds: any[] }>(QUERIES.unstakedEvents, {
      first,
      skip,
      where,
      orderDirection,
    });

    return (data.unstakeds ?? []).map((e) => ({
      id: e.id,
      staker: e.staker,
      seasonMode: { id: e.seasonMode?.id },
      amount: asBigint(e.amount),
      blockNumber: asBigint(e.blockNumber),
      blockTimestamp: asBigint(e.blockTimestamp),
      transactionHash: e.transactionHash,
    }));
  }

  async getClaimedEvents(params?: {
    staker?: string;
    seasonModeId?: string;
    first?: number;
    skip?: number;
    orderDirection?: OrderDirection;
  }): Promise<ClaimedEntity[]> {
    const {
      staker,
      seasonModeId,
      first = 50,
      skip = 0,
      orderDirection = "desc",
    } = params ?? {};

    const where: any = {};
    if (staker) where.staker = staker.toLowerCase();
    if (seasonModeId) where.seasonMode = seasonModeId;

    const data = await this.request<{ claimeds: any[] }>(QUERIES.claimedEvents, {
      first,
      skip,
      where,
      orderDirection,
    });

    return (data.claimeds ?? []).map((e) => ({
      id: e.id,
      staker: e.staker,
      seasonMode: { id: e.seasonMode?.id },
      amount: asBigint(e.amount),
      blockNumber: asBigint(e.blockNumber),
      blockTimestamp: asBigint(e.blockTimestamp),
      transactionHash: e.transactionHash,
    }));
  }
}

