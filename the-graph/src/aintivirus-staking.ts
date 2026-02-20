import {
  AintiVirusStaking as AintiVirusStakingContract,
  Claimed as ClaimedEvent,
  NextSeasonDurationUpdated as NextSeasonDurationUpdatedEvent,
  RewardAdded as RewardAddedEvent,
  SeasonStarted as SeasonStartedEvent,
  Staked as StakedEvent,
  Unstaked as UnstakedEvent
} from "../generated/AintiVirusStaking/AintiVirusStaking"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Claimed,
  NextSeasonDurationUpdated,
  RewardAdded,
  SeasonStarted,
  Staked,
  Unstaked
} from "../generated/schema"
import { applyEventMetadata, eventEntityId } from "./utils/event"
import {
  getOrCreateSeason,
  getOrCreateSeasonAsset,
  protocol
} from "./utils/state"

function refreshSeasonAssetFromContract(
  contract: AintiVirusStakingContract,
  seasonId: BigInt,
  asset: Address
): void {
  let season = getOrCreateSeason(seasonId)
  season.save()

  let assetBytes = Bytes.fromHexString(asset.toHexString())
  let sa = getOrCreateSeasonAsset(seasonId, assetBytes)
  let res = contract.try_seasonAndTotals(seasonId, asset)
  if (!res.reverted) {
    sa.duration = res.value.getDuration()
    sa.totalStaked = res.value.getTotalStaked()
    sa.totalReward = res.value.getTotalReward()
    sa.totalWeight = res.value.getTotalWeight()
  }
  sa.save()
}

export function handleClaimed(event: ClaimedEvent): void {
  let entity = new Claimed(eventEntityId(event))
  entity.staker = event.params.staker
  let season = getOrCreateSeason(event.params.seasonId)
  season.save()
  let assetBytes = Bytes.fromHexString(event.params.asset.toHexString())
  let sa = getOrCreateSeasonAsset(event.params.seasonId, assetBytes)
  entity.seasonAsset = sa.id
  entity.amount = event.params.amount
  applyEventMetadata(entity, event)

  entity.save()

  let p = protocol()
  p.stakingAddress = event.address
  p.totalClaimed = p.totalClaimed.plus(event.params.amount)
  p.updatedBlockNumber = event.block.number
  p.updatedBlockTimestamp = event.block.timestamp
  p.updatedTransactionHash = event.transaction.hash
  p.save()

  let contract = AintiVirusStakingContract.bind(event.address)
  refreshSeasonAssetFromContract(
    contract,
    event.params.seasonId,
    event.params.asset
  )
}

export function handleNextSeasonDurationUpdated(
  event: NextSeasonDurationUpdatedEvent
): void {
  let entity = new NextSeasonDurationUpdated(eventEntityId(event))
  entity.oldDuration = event.params.oldDuration
  entity.newDuration = event.params.newDuration
  applyEventMetadata(entity, event)

  entity.save()

  let p = protocol()
  p.stakingAddress = event.address
  p.nextSeasonDuration = event.params.newDuration
  p.updatedBlockNumber = event.block.number
  p.updatedBlockTimestamp = event.block.timestamp
  p.updatedTransactionHash = event.transaction.hash
  p.save()
}

export function handleRewardAdded(event: RewardAddedEvent): void {
  let entity = new RewardAdded(eventEntityId(event))
  entity.amount = event.params.amount
  entity.asset = event.params.asset
  entity.seasonId = event.params.seasonId
  applyEventMetadata(entity, event)

  entity.save()

  let p = protocol()
  p.stakingAddress = event.address
  p.updatedBlockNumber = event.block.number
  p.updatedBlockTimestamp = event.block.timestamp
  p.updatedTransactionHash = event.transaction.hash
  p.save()

  let contract = AintiVirusStakingContract.bind(event.address)
  refreshSeasonAssetFromContract(
    contract,
    event.params.seasonId,
    event.params.asset
  )
}

export function handleSeasonStarted(event: SeasonStartedEvent): void {
  let entity = new SeasonStarted(eventEntityId(event))
  entity.seasonId = event.params.seasonId
  entity.start = event.params.start
  entity.end = event.params.end
  applyEventMetadata(entity, event)

  entity.save()

  let p = protocol()
  p.stakingAddress = event.address
  p.currentSeasonId = event.params.seasonId
  p.updatedBlockNumber = event.block.number
  p.updatedBlockTimestamp = event.block.timestamp
  p.updatedTransactionHash = event.transaction.hash
  p.save()

  let season = getOrCreateSeason(event.params.seasonId)
  season.start = event.params.start
  season.end = event.params.end
  season.duration = season.end.ge(season.start)
    ? season.end.minus(season.start)
    : BigInt.zero()
  season.save()
}

export function handleStaked(event: StakedEvent): void {
  let entity = new Staked(eventEntityId(event))
  entity.staker = event.params.staker
  let season = getOrCreateSeason(event.params.seasonId)
  season.save()
  let assetBytes = Bytes.fromHexString(event.params.asset.toHexString())
  let sa = getOrCreateSeasonAsset(event.params.seasonId, assetBytes)
  entity.seasonAsset = sa.id
  entity.amount = event.params.amount
  applyEventMetadata(entity, event)

  entity.save()

  let p = protocol()
  p.stakingAddress = event.address
  p.totalStaked = p.totalStaked.plus(event.params.amount)
  p.updatedBlockNumber = event.block.number
  p.updatedBlockTimestamp = event.block.timestamp
  p.updatedTransactionHash = event.transaction.hash
  p.save()

  let contract = AintiVirusStakingContract.bind(event.address)
  refreshSeasonAssetFromContract(
    contract,
    event.params.seasonId,
    event.params.asset
  )
}

export function handleUnstaked(event: UnstakedEvent): void {
  let entity = new Unstaked(eventEntityId(event))
  entity.staker = event.params.staker
  entity.amount = event.params.amount

  let p = protocol()
  p.stakingAddress = event.address
  if (p.totalStaked.ge(event.params.amount)) {
    p.totalStaked = p.totalStaked.minus(event.params.amount)
  } else {
    p.totalStaked = BigInt.zero()
  }
  p.updatedBlockNumber = event.block.number
  p.updatedBlockTimestamp = event.block.timestamp
  p.updatedTransactionHash = event.transaction.hash
  p.save()

  let contract = AintiVirusStakingContract.bind(event.address)
  let inferredSeasonId = p.currentSeasonId
  let recRes = contract.try_records(event.params.staker, event.params.asset)
  if (!recRes.reverted) {
    inferredSeasonId = recRes.value.getSeasonId()
    refreshSeasonAssetFromContract(
      contract,
      inferredSeasonId,
      event.params.asset
    )
  }

  let season = getOrCreateSeason(inferredSeasonId)
  season.save()
  let assetBytes = Bytes.fromHexString(event.params.asset.toHexString())
  let sa = getOrCreateSeasonAsset(inferredSeasonId, assetBytes)
  entity.seasonAsset = sa.id

  applyEventMetadata(entity, event)
  entity.save()
}
