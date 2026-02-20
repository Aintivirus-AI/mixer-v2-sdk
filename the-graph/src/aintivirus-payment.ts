import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  PaymentProcessed as PaymentProcessedEvent,
  TokenUpdated as TokenUpdatedEvent,
  TreasuryUpdated as TreasuryUpdatedEvent,
} from "../generated/AintivirusPayment/AintivirusPayment";
import {
  PaymentProcessed,
  PaymentStats,
  TokenUpdated,
  TreasuryUpdated,
} from "../generated/schema";
import { applyEventMetadata, eventEntityId } from "./utils/event";

function getOrCreatePaymentStats(contractAddress: Bytes): PaymentStats {
  let id = contractAddress.toHexString();
  let paymentStats = PaymentStats.load(id);
  if (paymentStats == null) {
    paymentStats = new PaymentStats(id);
    paymentStats.contractAddress = contractAddress;
    paymentStats.treasuryWallet = Bytes.fromHexString(
      "0x0000000000000000000000000000000000000000",
    ) as Bytes;
    paymentStats.totalVolume = BigInt.zero();
    paymentStats.paymentCount = BigInt.zero();
    paymentStats.updatedBlockNumber = BigInt.zero();
    paymentStats.updatedBlockTimestamp = BigInt.zero();
    paymentStats.updatedTransactionHash = Bytes.fromHexString(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ) as Bytes;
    paymentStats.save();
  }
  return paymentStats;
}
export function handlePaymentProcessed(event: PaymentProcessedEvent): void {
  let entity = new PaymentProcessed(eventEntityId(event));
  entity.orderId = event.params.orderId;
  entity.buyer = event.params.buyer;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.isNativeETH = event.params.token.equals(
    Address.fromString("0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"),
  );
  entity.timestamp = event.params.timestamp;
  applyEventMetadata(entity, event);
  entity.save();

  let paymentStats = getOrCreatePaymentStats(event.address);

  paymentStats.contractAddress = event.address;
  paymentStats.totalVolume = paymentStats.totalVolume.plus(event.params.amount);
  paymentStats.paymentCount = paymentStats.paymentCount.plus(BigInt.fromI32(1));
  paymentStats.updatedBlockNumber = event.block.number;
  paymentStats.updatedBlockTimestamp = event.block.timestamp;
  paymentStats.updatedTransactionHash = event.transaction.hash;
  paymentStats.save();
}

export function handleTreasuryUpdated(event: TreasuryUpdatedEvent): void {
  let entity = new TreasuryUpdated(eventEntityId(event));
  entity.oldTreasury = event.params.oldTreasury;
  entity.newTreasury = event.params.newTreasury;
  applyEventMetadata(entity, event);
  entity.save();

  let paymentStats = getOrCreatePaymentStats(event.address);
  paymentStats.treasuryWallet = event.params.newTreasury;
  paymentStats.updatedBlockNumber = event.block.number;
  paymentStats.updatedBlockTimestamp = event.block.timestamp;
  paymentStats.updatedTransactionHash = event.transaction.hash;
  paymentStats.save();
}

export function handleTokenUpdated(event: TokenUpdatedEvent): void {
  let entity = new TokenUpdated(eventEntityId(event));
  entity.token = event.params.token as Bytes;
  entity.allowed = event.params.allowed;
  applyEventMetadata(entity, event);
  entity.save();
}
