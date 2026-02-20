import { newMockEvent } from "matchstick-as";
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  Deposit,
  FeeRateUpdated,
  MixerDeployed,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  StakingDeployed,
  Withdrawal,
} from "../generated/AintiVirusFactory/AintiVirusFactory";

export function createDepositEvent(
  asset: Address,
  amount: BigInt,
  protocolFee: BigInt,
  extraFee: BigInt,
  commitment: Bytes,
  partnerAddress: Address,
): Deposit {
  let depositEvent = changetype<Deposit>(newMockEvent());

  depositEvent.parameters = new Array();

  depositEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset)),
  );
  depositEvent.parameters.push(
    new ethereum.EventParam(
      "amount",
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );
  depositEvent.parameters.push(
    new ethereum.EventParam(
      "protocolFee",
      ethereum.Value.fromUnsignedBigInt(protocolFee),
    ),
  );
  depositEvent.parameters.push(
    new ethereum.EventParam(
      "extraFee",
      ethereum.Value.fromUnsignedBigInt(extraFee),
    ),
  );
  depositEvent.parameters.push(
    new ethereum.EventParam(
      "commitment",
      ethereum.Value.fromFixedBytes(commitment),
    ),
  );
  depositEvent.parameters.push(
    new ethereum.EventParam(
      "partnerAddress",
      ethereum.Value.fromAddress(partnerAddress),
    ),
  );

  return depositEvent;
}

export function createFeeRateUpdatedEvent(
  oldFeeRate: BigInt,
  newFeeRate: BigInt,
): FeeRateUpdated {
  let feeRateUpdatedEvent = changetype<FeeRateUpdated>(newMockEvent());

  feeRateUpdatedEvent.parameters = new Array();

  feeRateUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "oldFeeRate",
      ethereum.Value.fromUnsignedBigInt(oldFeeRate),
    ),
  );
  feeRateUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newFeeRate",
      ethereum.Value.fromUnsignedBigInt(newFeeRate),
    ),
  );

  return feeRateUpdatedEvent;
}

export function createMixerDeployedEvent(
  mixer: Address,
  asset: Address,
  amount: BigInt,
): MixerDeployed {
  let mixerDeployedEvent = changetype<MixerDeployed>(newMockEvent());

  mixerDeployedEvent.parameters = new Array();

  mixerDeployedEvent.parameters.push(
    new ethereum.EventParam("mixer", ethereum.Value.fromAddress(mixer)),
  );
  mixerDeployedEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset)),
  );
  mixerDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "amount",
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );

  return mixerDeployedEvent;
}

export function createRoleAdminChangedEvent(
  role: Bytes,
  previousAdminRole: Bytes,
  newAdminRole: Bytes,
): RoleAdminChanged {
  let roleAdminChangedEvent = changetype<RoleAdminChanged>(newMockEvent());

  roleAdminChangedEvent.parameters = new Array();

  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role)),
  );
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "previousAdminRole",
      ethereum.Value.fromFixedBytes(previousAdminRole),
    ),
  );
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newAdminRole",
      ethereum.Value.fromFixedBytes(newAdminRole),
    ),
  );

  return roleAdminChangedEvent;
}

export function createRoleGrantedEvent(
  role: Bytes,
  account: Address,
  sender: Address,
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent());

  roleGrantedEvent.parameters = new Array();

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role)),
  );
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account)),
  );
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender)),
  );

  return roleGrantedEvent;
}

export function createRoleRevokedEvent(
  role: Bytes,
  account: Address,
  sender: Address,
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent());

  roleRevokedEvent.parameters = new Array();

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role)),
  );
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account)),
  );
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender)),
  );

  return roleRevokedEvent;
}

export function createStakingDeployedEvent(
  deployer: Address,
  staking: Address,
): StakingDeployed {
  let stakingDeployedEvent = changetype<StakingDeployed>(newMockEvent());

  stakingDeployedEvent.parameters = new Array();

  stakingDeployedEvent.parameters.push(
    new ethereum.EventParam("deployer", ethereum.Value.fromAddress(deployer)),
  );
  stakingDeployedEvent.parameters.push(
    new ethereum.EventParam("staking", ethereum.Value.fromAddress(staking)),
  );

  return stakingDeployedEvent;
}

export function createWithdrawalEvent(
  asset: Address,
  amount: BigInt,
  to: Address,
  nullifierHash: Bytes,
): Withdrawal {
  let withdrawalEvent = changetype<Withdrawal>(newMockEvent());

  withdrawalEvent.parameters = new Array();

  withdrawalEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset)),
  );
  withdrawalEvent.parameters.push(
    new ethereum.EventParam(
      "amount",
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );
  withdrawalEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to)),
  );
  withdrawalEvent.parameters.push(
    new ethereum.EventParam(
      "nullifierHash",
      ethereum.Value.fromFixedBytes(nullifierHash),
    ),
  );

  return withdrawalEvent;
}
