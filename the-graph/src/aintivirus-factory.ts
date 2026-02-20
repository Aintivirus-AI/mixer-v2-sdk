import {
  Deposit as DepositEvent,
  FeeRateUpdated as FeeRateUpdatedEvent,
  FactoryInitialized as FactoryInitializedEvent,
  MixerDeployed as MixerDeployedEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  StakingDeployed as StakingDeployedEvent,
  Withdrawal as WithdrawalEvent,
  FeeCollectorUpdated as FeeCollectorUpdatedEvent,
  FeeConfigUpdated as FeeConfigUpdatedEvent,
  RewardPoolShareUpdated as RewardPoolShareUpdatedEvent,
  PartnerAdded as PartnerAddedEvent,
  PartnerRemoved as PartnerRemovedEvent,
  PartnerExtraFeeUpdated as PartnerExtraFeeUpdatedEvent,
  GiftCardWithdrawal as GiftCardWithdrawalEvent,
  GiftCardEnabledUpdated as GiftCardEnabledUpdatedEvent,
  UnclaimedRewardsClaimed as UnclaimedRewardsClaimedEvent,
} from "../generated/AintiVirusFactory/AintiVirusFactory";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  Deposit,
  FeeRateUpdated,
  FactoryInitialized,
  MixerDeployed,
  FeeCollectorUpdated,
  FeeConfigUpdated,
  RewardPoolShareUpdated,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  StakingDeployed,
  Withdrawal,
  PartnerAdded,
  PartnerRemoved,
  PartnerExtraFeeUpdated,
  GiftCardWithdrawal,
  GiftCardEnabledUpdated,
  UnclaimedRewardsClaimed,
} from "../generated/schema";
import { applyEventMetadata, eventEntityId } from "./utils/event";
import { getOrCreateMixerPool, protocol } from "./utils/state";

const ONE = BigInt.fromI32(1);

export function handleDeposit(event: DepositEvent): void {
  let pool = getOrCreateMixerPool(event.params.asset, event.params.amount);

  let entity = new Deposit(eventEntityId(event));
  entity.pool = pool.id;
  entity.commitment = event.params.commitment;
  entity.protocolFee = event.params.protocolFee;
  entity.extraFee = event.params.extraFee;
  entity.partnerAddress = event.params.partnerAddress;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.totalDeposited = p.totalDeposited.plus(event.params.amount);
  p.depositCount = p.depositCount.plus(ONE);
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();

  pool.totalDeposited = pool.totalDeposited.plus(event.params.amount);
  pool.depositCount = pool.depositCount.plus(ONE);
  pool.save();
}

export function handleFeeRateUpdated(event: FeeRateUpdatedEvent): void {
  let entity = new FeeRateUpdated(eventEntityId(event));
  entity.oldFeeRate = event.params.oldFeeRate;
  entity.newFeeRate = event.params.newFeeRate;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.feeRate = event.params.newFeeRate;
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();
}

export function handleFeeCollectorUpdated(event: FeeCollectorUpdatedEvent): void {
  let entity = new FeeCollectorUpdated(eventEntityId(event));
  entity.oldWallet = event.params.oldWallet;
  entity.newWallet = event.params.newWallet;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.feeCollector = event.params.newWallet;
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();
}

export function handleFeeConfigUpdated(event: FeeConfigUpdatedEvent): void {
  let entity = new FeeConfigUpdated(eventEntityId(event));
  entity.feeCollector = event.params.feeCollector;
  entity.feeRate = event.params.feeBps;
  entity.rewardPoolShareBps = event.params.rewardsShareBps;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.feeCollector = event.params.feeCollector;
  p.feeRate = event.params.feeBps;
  p.rewardPoolShareBps = event.params.rewardsShareBps;
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();
}

export function handleRewardPoolShareUpdated(
  event: RewardPoolShareUpdatedEvent,
): void {
  let entity = new RewardPoolShareUpdated(eventEntityId(event));
  entity.oldBps = event.params.oldBps;
  entity.newBps = event.params.newBps;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.rewardPoolShareBps = event.params.newBps;
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();
}

export function handleFactoryInitialized(event: FactoryInitializedEvent): void {
  let entity = new FactoryInitialized(eventEntityId(event));
  entity.feeCollector = event.params.feeCollector;
  entity.feeRate = event.params.feeBps;
  entity.rewardPoolShareBps = event.params.rewardsShareBps;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.feeRate = event.params.feeBps;
  p.feeCollector = event.params.feeCollector;
  p.rewardPoolShareBps = event.params.rewardsShareBps;
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();
}

export function handleMixerDeployed(event: MixerDeployedEvent): void {
  let entity = new MixerDeployed(eventEntityId(event));
  entity.mixer = event.params.mixer;
  entity.asset = event.params.asset;
  entity.amount = event.params.amount;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();

  let pool = getOrCreateMixerPool(event.params.asset, event.params.amount);
  pool.address = event.params.mixer;
  pool.deployedBlockNumber = event.block.number;
  pool.deployedBlockTimestamp = event.block.timestamp;
  pool.deployedTransactionHash = event.transaction.hash;
  pool.save();
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let entity = new RoleAdminChanged(eventEntityId(event));
  entity.role = event.params.role;
  entity.previousAdminRole = event.params.previousAdminRole;
  entity.newAdminRole = event.params.newAdminRole;
  applyEventMetadata(entity, event);

  entity.save();
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let entity = new RoleGranted(eventEntityId(event));
  entity.role = event.params.role;
  entity.account = event.params.account;
  entity.sender = event.params.sender;
  applyEventMetadata(entity, event);

  entity.save();
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let entity = new RoleRevoked(eventEntityId(event));
  entity.role = event.params.role;
  entity.account = event.params.account;
  entity.sender = event.params.sender;
  applyEventMetadata(entity, event);

  entity.save();
}

export function handleStakingDeployed(event: StakingDeployedEvent): void {
  let entity = new StakingDeployed(eventEntityId(event));
  entity.deployer = event.params.deployer;
  entity.staking = event.params.staking;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.stakingAddress = event.params.staking;
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();
}

export function handlePartnerAdded(event: PartnerAddedEvent): void {
  let entity = new PartnerAdded(eventEntityId(event));
  entity.partner = event.params.partner;
  entity.extraFee = event.params.extraFee;
  applyEventMetadata(entity, event);

  entity.save();
}

export function handlePartnerRemoved(event: PartnerRemovedEvent): void {
  let entity = new PartnerRemoved(eventEntityId(event));
  entity.partner = event.params.partner;
  applyEventMetadata(entity, event);

  entity.save();
}

export function handlePartnerExtraFeeUpdated(
  event: PartnerExtraFeeUpdatedEvent,
): void {
  let entity = new PartnerExtraFeeUpdated(eventEntityId(event));
  entity.partner = event.params.partner;
  entity.extraFee = event.params.extraFee;
  applyEventMetadata(entity, event);

  entity.save();
}

export function handleWithdrawal(event: WithdrawalEvent): void {
  let pool = getOrCreateMixerPool(event.params.asset, event.params.amount);

  let entity = new Withdrawal(eventEntityId(event));
  entity.pool = pool.id;
  entity.to = event.params.to;
  entity.nullifierHash = event.params.nullifierHash;
  applyEventMetadata(entity, event);

  entity.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.totalWithdrawn = p.totalWithdrawn.plus(event.params.amount);
  p.withdrawalCount = p.withdrawalCount.plus(ONE);
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();

  pool.totalWithdrawn = pool.totalWithdrawn.plus(event.params.amount);
  pool.withdrawalCount = pool.withdrawalCount.plus(ONE);
  pool.save();
}

export function handleGiftCardWithdrawal(event: GiftCardWithdrawalEvent): void {
  let entity = new GiftCardWithdrawal(eventEntityId(event));
  entity.asset = event.params.asset;
  entity.amount = event.params.amount;
  entity.to = event.params.to;
  entity.orderId = event.params.orderId;
  entity.nullifierHash = event.params.nullifierHash;
  applyEventMetadata(entity, event);

  entity.save();

  let pool = getOrCreateMixerPool(event.params.asset, event.params.amount);
  pool.totalWithdrawn = pool.totalWithdrawn.plus(event.params.amount);
  pool.withdrawalCount = pool.withdrawalCount.plus(ONE);
  pool.save();

  let p = protocol();
  p.factoryAddress = event.address;
  p.totalWithdrawn = p.totalWithdrawn.plus(event.params.amount);
  p.withdrawalCount = p.withdrawalCount.plus(ONE);
  p.updatedBlockNumber = event.block.number;
  p.updatedBlockTimestamp = event.block.timestamp;
  p.updatedTransactionHash = event.transaction.hash;
  p.save();
}

export function handleGiftCardEnabledUpdated(
  event: GiftCardEnabledUpdatedEvent,
): void {
  let entity = new GiftCardEnabledUpdated(eventEntityId(event));
  entity.asset = event.params.asset;
  entity.amount = event.params.amount;
  entity.enabled = event.params.enabled;
  applyEventMetadata(entity, event);

  entity.save();
}

export function handleUnclaimedRewardsClaimed(
  event: UnclaimedRewardsClaimedEvent,
): void {
  let entity = new UnclaimedRewardsClaimed(eventEntityId(event));
  entity.asset = event.params.asset;
  entity.seasonId = event.params.seasonId;
  entity.amount = event.params.amount;
  applyEventMetadata(entity, event);

  entity.save();
}
