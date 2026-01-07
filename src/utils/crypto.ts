import { poseidon2 } from "poseidon-lite";
import { randomBytes } from "ethers";

/**
 * Generate secret and nullifier for a deposit
 */
export function generateSecretAndNullifier(): {
  secret: bigint;
  nullifier: bigint;
} {
  const secretBytes = randomBytes(32);
  const nullifierBytes = randomBytes(32);
  const secret = BigInt("0x" + Buffer.from(secretBytes).toString("hex"));
  const nullifier = BigInt("0x" + Buffer.from(nullifierBytes).toString("hex"));
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
  return "0x" + value.toString(16).padStart(64, "0");
}

/**
 * Convert bytes32 to bigint (for EVM)
 */
export function bytes32ToBigInt(value: string): bigint {
  return BigInt(value);
}

