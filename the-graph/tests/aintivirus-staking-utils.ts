import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  Claimed,
  NextSeasonDurationUpdated,
  RewardAdded,
  SeasonStarted,
  Staked,
  Unstaked
} from "../generated/AintiVirusStaking/AintiVirusStaking"

export function createClaimedEvent(
  staker: Address,
  seasonId: BigInt,
  asset: Address,
  amount: BigInt
): Claimed {
  let claimedEvent = changetype<Claimed>(newMockEvent())

  claimedEvent.parameters = new Array()

  claimedEvent.parameters.push(
    new ethereum.EventParam("staker", ethereum.Value.fromAddress(staker))
  )
  claimedEvent.parameters.push(
    new ethereum.EventParam(
      "seasonId",
      ethereum.Value.fromUnsignedBigInt(seasonId)
    )
  )
  claimedEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  claimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return claimedEvent
}

export function createNextSeasonDurationUpdatedEvent(
  oldDuration: BigInt,
  newDuration: BigInt
): NextSeasonDurationUpdated {
  let nextSeasonDurationUpdatedEvent =
    changetype<NextSeasonDurationUpdated>(newMockEvent())

  nextSeasonDurationUpdatedEvent.parameters = new Array()

  nextSeasonDurationUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "oldDuration",
      ethereum.Value.fromUnsignedBigInt(oldDuration)
    )
  )
  nextSeasonDurationUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newDuration",
      ethereum.Value.fromUnsignedBigInt(newDuration)
    )
  )

  return nextSeasonDurationUpdatedEvent
}

export function createRewardAddedEvent(
  amount: BigInt,
  asset: Address,
  seasonId: BigInt
): RewardAdded {
  let rewardAddedEvent = changetype<RewardAdded>(newMockEvent())

  rewardAddedEvent.parameters = new Array()

  rewardAddedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  rewardAddedEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  rewardAddedEvent.parameters.push(
    new ethereum.EventParam(
      "seasonId",
      ethereum.Value.fromUnsignedBigInt(seasonId)
    )
  )

  return rewardAddedEvent
}

export function createSeasonStartedEvent(
  seasonId: BigInt,
  start: BigInt,
  end: BigInt
): SeasonStarted {
  let seasonStartedEvent = changetype<SeasonStarted>(newMockEvent())

  seasonStartedEvent.parameters = new Array()

  seasonStartedEvent.parameters.push(
    new ethereum.EventParam(
      "seasonId",
      ethereum.Value.fromUnsignedBigInt(seasonId)
    )
  )
  seasonStartedEvent.parameters.push(
    new ethereum.EventParam("start", ethereum.Value.fromUnsignedBigInt(start))
  )
  seasonStartedEvent.parameters.push(
    new ethereum.EventParam("end", ethereum.Value.fromUnsignedBigInt(end))
  )

  return seasonStartedEvent
}

export function createStakedEvent(
  staker: Address,
  seasonId: BigInt,
  asset: Address,
  amount: BigInt
): Staked {
  let stakedEvent = changetype<Staked>(newMockEvent())

  stakedEvent.parameters = new Array()

  stakedEvent.parameters.push(
    new ethereum.EventParam("staker", ethereum.Value.fromAddress(staker))
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam(
      "seasonId",
      ethereum.Value.fromUnsignedBigInt(seasonId)
    )
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return stakedEvent
}

export function createUnstakedEvent(
  staker: Address,
  asset: Address,
  amount: BigInt
): Unstaked {
  let unstakedEvent = changetype<Unstaked>(newMockEvent())

  unstakedEvent.parameters = new Array()

  unstakedEvent.parameters.push(
    new ethereum.EventParam("staker", ethereum.Value.fromAddress(staker))
  )
  unstakedEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  unstakedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return unstakedEvent
}
