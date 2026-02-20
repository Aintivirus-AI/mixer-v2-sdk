import { poseidon2 } from "poseidon-lite";
import MerkleTree from "fixed-merkle-tree";
import { WithdrawalProof } from "../types";
import {
  computeCommitment,
  computeNullifierHash,
  ZERO_ADDRESS,
} from "./crypto";
import * as snarkjs from "snarkjs";
import { config } from "./circuit";

/** Load circuit buffer from URL (fetch) or base64 string. */
async function loadCircuitValue(value: string): Promise<Buffer> {
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const res = await fetch(trimmed);
    if (!res.ok) throw new Error(`Failed to fetch circuit: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return Buffer.from(trimmed, "base64");
}

/**
 * Build merkle tree from commitments
 */
export function buildMerkleTree(commitments: bigint[]): MerkleTree {
  const tree = new MerkleTree(24, [], {
    hashFunction: (left: string | number, right: string | number) => {
      return poseidon2([BigInt(left), BigInt(right)]).toString();
    },
    zeroElement: "0",
  });

  for (const commitment of commitments) {
    tree.insert(commitment.toString());
  }

  return tree;
}

/**
 * Get merkle path for a commitment
 */
export function getMerklePath(
  tree: MerkleTree,
  commitment: bigint,
): { pathElements: bigint[]; pathIndices: number[] } {
  const commitmentIndex = tree.elements.indexOf(commitment.toString());
  if (commitmentIndex === -1) {
    throw new Error("Commitment not found in merkle tree");
  }

  const path = tree.path(commitmentIndex);
  return {
    pathElements: path.pathElements.map((e) => BigInt(e)),
    pathIndices: path.pathIndices,
  };
}

/**
 * Generate withdrawal proof.
 * pubSignals: [nullifierHash, recipient, root, fee, relayer].
 * Circuit WASM and zkey are read from config (import from "../config").
 */
export async function generateWithdrawalProof(
  secret: bigint,
  nullifier: bigint,
  root: bigint,
  recipient: string,
  pathElements: bigint[],
  pathIndices: number[],
  fee: bigint = 0n,
  relayer: string = ZERO_ADDRESS,
): Promise<WithdrawalProof> {
  const nullifierHash = computeNullifierHash(nullifier);
  const recipientBigInt = BigInt(recipient);
  const relayerBigInt = BigInt(relayer);

  let circuitWasm: Buffer | undefined;
  let circuitZkey: Buffer | undefined;
  const wasmVal = config.circuitWasm?.trim();
  const zkeyVal = config.circuitZkey?.trim();
  if (wasmVal && zkeyVal) {
    circuitWasm = await loadCircuitValue(wasmVal);
    circuitZkey = await loadCircuitValue(zkeyVal);
  }
  if (!circuitWasm || !circuitZkey) {
    console.warn(
      "Circuit files not provided. Returning placeholder proof structure.",
    );
    return {
      pA: [0n, 0n],
      pB: [
        [0n, 0n],
        [0n, 0n],
      ],
      pC: [0n, 0n],
      pubSignals: [nullifierHash, recipientBigInt, root, fee, relayerBigInt],
    };
  }

  const input = {
    secret: secret.toString(),
    nullifier: nullifier.toString(),
    root: root.toString(),
    recipient: recipientBigInt.toString(),
    fee: fee.toString(),
    relayer: relayerBigInt.toString(),
    pathElements: pathElements.map((e) => e.toString()),
    pathIndices: pathIndices.map((i) => i.toString()),
  };
  try {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      circuitWasm,
      circuitZkey,
    );
    return {
      pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
      pB: [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
      ],
      pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
      pubSignals: publicSignals.map((x: string) => BigInt(x)) as [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
      ],
    };
  } catch (error) {
    console.error("Proof generation failed:", error);
    return {
      pA: [0n, 0n],
      pB: [
        [0n, 0n],
        [0n, 0n],
      ],
      pC: [0n, 0n],
      pubSignals: [nullifierHash, recipientBigInt, root, fee, relayerBigInt],
    };
  }
}

/**
 * Helper to prepare withdrawal proof data
 */
export interface WithdrawalProofData {
  secret: bigint;
  nullifier: bigint;
  recipient: string;
  commitments: bigint[];
  /** Fee (default 0n) */
  fee?: bigint;
  /** Relayer address (default ZERO_ADDRESS) */
  relayer?: string;
}

/**
 * Generate complete withdrawal proof from deposit data.
 * Builds merkle tree from commitments, gets path for commitment(secret, nullifier), then generates proof.
 * Circuit paths are read from config (see src/config.ts).
 */
export async function generateWithdrawalProofFromData(
  data: WithdrawalProofData,
): Promise<WithdrawalProof> {
  const commitment = computeCommitment(data.secret, data.nullifier);
  const tree = buildMerkleTree(data.commitments);
  const root = BigInt(tree.root);
  const path = getMerklePath(tree, commitment);

  return generateWithdrawalProof(
    data.secret,
    data.nullifier,
    root,
    data.recipient,
    path.pathElements,
    path.pathIndices,
    data.fee ?? 0n,
    data.relayer ?? ZERO_ADDRESS,
  );
}
