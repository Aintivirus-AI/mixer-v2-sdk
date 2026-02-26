import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  MixerPool,
  Protocol,
  Season,
  SeasonAsset,
  StakerSeason
} from "../../generated/schema"

const PROTOCOL_ID = "protocol"
const ZERO = BigInt.zero()
const DEFAULT_FEE_RATE = BigInt.fromI32(250)
const ZERO_ADDRESS = Bytes.fromHexString("0x0000000000000000000000000000000000000000") as Bytes
const ZERO_HASH = Bytes.fromHexString(
  "0x0000000000000000000000000000000000000000000000000000000000000000"
) as Bytes

export function protocol(): Protocol {
  let p = Protocol.load(PROTOCOL_ID)
  if (p == null) {
    p = new Protocol(PROTOCOL_ID)
    p.feeRate = DEFAULT_FEE_RATE
    p.nextSeasonDuration = ZERO
    p.currentSeasonId = ZERO
    p.totalDeposited = ZERO
    p.totalWithdrawn = ZERO
    p.depositCount = ZERO
    p.withdrawalCount = ZERO
    p.totalStaked = ZERO
    p.totalClaimed = ZERO
    p.totalStakedAllTime = ZERO
    p.totalRewardsAddedAllTime = ZERO
    p.save()
  }
  return p
}

export function getOrCreateMixerPool(asset: Bytes, amount: BigInt): MixerPool {
  let id = asset.toHexString() + "-" + amount.toString()
  let pool = MixerPool.load(id)
  if (pool == null) {
    pool = new MixerPool(id)
    pool.asset = asset
    pool.amount = amount
    pool.address = ZERO_ADDRESS
    pool.deployedBlockNumber = ZERO
    pool.deployedBlockTimestamp = ZERO
    pool.deployedTransactionHash = ZERO_HASH
    pool.totalDeposited = ZERO
    pool.totalWithdrawn = ZERO
    pool.depositCount = ZERO
    pool.withdrawalCount = ZERO
    pool.save()
  }
  return pool
}

export function getOrCreateSeason(seasonId: BigInt): Season {
  let id = seasonId.toString()
  let s = Season.load(id)
  if (s == null) {
    s = new Season(id)
    s.seasonId = seasonId
    s.start = ZERO
    s.end = ZERO
    s.duration = ZERO
    s.totalStaked = ZERO
    s.totalReward = ZERO
    s.save()
  }
  return s
}

export function getOrCreateStakerSeason(
  staker: Bytes,
  seasonId: BigInt
): StakerSeason {
  let id = staker.toHexString() + "-" + seasonId.toString()
  let ss = StakerSeason.load(id)
  if (ss == null) {
    ss = new StakerSeason(id)
    ss.staker = staker
    ss.season = seasonId.toString()
    ss.totalStaked = ZERO
    ss.save()
  }
  return ss
}

export function getOrCreateSeasonAsset(seasonId: BigInt, asset: Bytes): SeasonAsset {
  let id = seasonId.toString() + "-" + asset.toHexString()
  let sa = SeasonAsset.load(id)
  if (sa == null) {
    sa = new SeasonAsset(id)
    sa.season = seasonId.toString()
    sa.asset = asset
    sa.duration = ZERO
    sa.totalStaked = ZERO
    sa.totalReward = ZERO
    sa.totalWeight = ZERO
    sa.save()
  }
  return sa
}
