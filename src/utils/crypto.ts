import { poseidon2 } from "poseidon-lite";
import { getBytes, randomBytes, toBigInt, toBeHex, zeroPadValue } from "ethers";

/** Uint8Array to hex string (browser-safe, no Node Buffer) */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate secret and nullifier for a deposit
 */
export function generateSecretAndNullifier(): {
  secret: bigint;
  nullifier: bigint;
} {
  const secretBytes = randomBytes(32);
  const nullifierBytes = randomBytes(32);
  const secret = BigInt("0x" + bytesToHex(secretBytes));
  const nullifier = BigInt("0x" + bytesToHex(nullifierBytes));
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
