import { poseidon2 } from "poseidon-lite";
import {
  getBytes,
  randomBytes,
  toBigInt,
  toBeHex,
  hexlify,
  zeroPadValue,
} from "ethers";

/**
 * Generate secret and nullifier for a deposit
 */
export function generateSecretAndNullifier(): {
  secret: bigint;
  nullifier: bigint;
} {
  const secretBytes = randomBytes(32);
  const nullifierBytes = randomBytes(32);
  const secret = BigInt(hexlify(secretBytes));
  const nullifier = BigInt(hexlify(nullifierBytes));
  return { secret, nullifier };
}
/**
 * Compute commitment hash: Poseidon(secret, nullifier)
 */
export function computeCommitment(secret: bigint, nullifier: bigint): bigint {
  return poseidon2([secret, nullifier]);
}

/**
 * Compute nullifier hash: Poseidon(nullifier, 0)
 */
export function computeNullifierHash(nullifier: bigint): bigint {
  return poseidon2([nullifier, 0n]);
}

/** Zero address used as default relayer in withdrawal proofs */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Convert bigint to bytes32 (for EVM)
 */
export function bigIntToBytes32(value: bigint): string {
  return zeroPadValue(toBeHex(value), 32);
}

/**
 * Convert bytes32 to bigint (for EVM)
 */
export function bytes32ToBigInt(value: string): bigint {
  return toBigInt(getBytes(value));
}
