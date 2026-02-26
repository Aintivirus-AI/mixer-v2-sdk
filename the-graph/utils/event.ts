import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

export function eventEntityId(event: ethereum.Event): Bytes {
  return event.transaction.hash.concatI32(event.logIndex.toI32());
}

export interface EventMetadataEntity {
  blockNumber: BigInt;
  blockTimestamp: BigInt;
  transactionHash: Bytes;
}

export function applyEventMetadata<T extends EventMetadataEntity>(
  entity: T,
  event: ethereum.Event,
): void {
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
}
