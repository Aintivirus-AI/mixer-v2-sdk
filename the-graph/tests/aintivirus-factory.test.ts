import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
} from "matchstick-as/assembly/index";
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import { Deposit } from "../generated/schema";
import { Deposit as DepositEvent } from "../generated/AintiVirusFactory/AintiVirusFactory";
import { handleDeposit } from "../src/aintivirus-factory";
import { eventEntityId } from "../src/utils/event";
import { createDepositEvent } from "./aintivirus-factory-utils";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  let depositId = "";

  beforeAll(() => {
    let asset = Address.fromString(
      "0x00000000000000000000000000000000000000ea",
    );
    let amount = BigInt.fromI32(234);
    let protocolFee = BigInt.fromI32(10);
    let extraFee = BigInt.fromI32(5);
    // bytes32 commitment (fixed bytes)
    let commitment = Bytes.fromHexString(
      "0x00000000000000000000000000000000000000000000000000000000499602d2",
    ) as Bytes;
    let partnerAddress = Address.fromString(
      "0x0000000000000000000000000000000000000000",
    );
    let newDepositEvent = createDepositEvent(
      asset,
      amount,
      protocolFee,
      extraFee,
      commitment,
      partnerAddress,
    );
    depositId = eventEntityId(newDepositEvent).toHexString();
    handleDeposit(newDepositEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("Deposit created and stored", () => {
    assert.entityCount("Deposit", 1);

    assert.fieldEquals(
      "Deposit",
      depositId,
      "pool",
      "0x00000000000000000000000000000000000000ea-234",
    );
    assert.fieldEquals(
      "Deposit",
      depositId,
      "commitment",
      "0x00000000000000000000000000000000000000000000000000000000499602d2",
    );
    assert.fieldEquals("Deposit", depositId, "protocolFee", "10");
    assert.fieldEquals("Deposit", depositId, "extraFee", "5");
    assert.fieldEquals(
      "Deposit",
      depositId,
      "partnerAddress",
      "0x0000000000000000000000000000000000000000",
    );

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  });
});
