import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
} from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { handleClaimed } from "../src/aintivirus-staking";
import { eventEntityId } from "../src/utils/event";
import { createClaimedEvent } from "./aintivirus-staking-utils";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  let claimedId = "";

  beforeAll(() => {
    let staker = Address.fromString(
      "0x0000000000000000000000000000000000000001",
    );
    let seasonId = BigInt.fromI32(234);
    let asset = Address.fromString(
      "0x00000000000000000000000000000000000000ea",
    );
    let amount = BigInt.fromI32(234);
    let newClaimedEvent = createClaimedEvent(staker, seasonId, asset, amount);
    claimedId = eventEntityId(newClaimedEvent).toHexString();
    handleClaimed(newClaimedEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("Claimed created and stored", () => {
    assert.entityCount("Claimed", 1);

    assert.fieldEquals(
      "Claimed",
      claimedId,
      "staker",
      "0x0000000000000000000000000000000000000001",
    );
    assert.fieldEquals(
      "Claimed",
      claimedId,
      "seasonAsset",
      "234-0x00000000000000000000000000000000000000ea",
    );
    assert.fieldEquals("Claimed", claimedId, "amount", "234");

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  });
});
