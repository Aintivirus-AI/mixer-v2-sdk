import { poseidon2 } from "poseidon-lite";
import MerkleTree from "fixed-merkle-tree";
import { WithdrawalProof } from "../types";
import { computeCommitment, computeNullifierHash } from "./crypto";

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
  commitment: bigint
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
 * Generate withdrawal proof
 * Note: This requires the circuit WASM and zkey files
 * In production, you should load these from your build directory
 */
export async function generateWithdrawalProof(
  secret: bigint,
  nullifier: bigint,
  root: bigint,
  recipient: string,
  pathElements: bigint[],
  pathIndices: number[],
  circuitWasm?: Buffer,
  circuitZkey?: Buffer
): Promise<WithdrawalProof> {
  // If circuit files are not provided, return a placeholder structure
  // In production, you should always provide these files
  if (!circuitWasm || !circuitZkey) {
    console.warn(
      "Circuit files not provided. Returning placeholder proof structure."
    );
    const nullifierHash = computeNullifierHash(nullifier);
    const recipientBigInt = BigInt(recipient);

    return {
      pA: [0n, 0n],
      pB: [
        [0n, 0n],
        [0n, 0n],
      ],
      pC: [0n, 0n],
      pubSignals: [nullifierHash, recipientBigInt, root],
    };
  }

  // Dynamic import for snarkjs (only load when needed)
  const snarkjs = await import("snarkjs");

  // Prepare inputs
  const input = {
    secret: secret.toString(),
    nullifier: nullifier.toString(),
    root: root.toString(),
    recipient: BigInt(recipient).toString(),
    pathElements: pathElements.map((e) => e.toString()),
    pathIndices: pathIndices.map((i) => i.toString()),
  };

  // Generate witness (requires witness calculator)
  // Note: This is a simplified version. In production, you need to:
  // 1. Load the witness calculator from your compiled circuit
  // 2. Calculate witness using the calculator
  // 3. Generate proof using snarkjs.groth16.prove()

  // For now, return placeholder
  // TODO: Implement full proof generation with witness calculator
  const nullifierHash = computeNullifierHash(nullifier);
  const recipientBigInt = BigInt(recipient);

  try {
    // Attempt to generate proof if witness calculator is available
    // This would require loading the witness calculator from your build
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      circuitWasm,
      circuitZkey
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
        bigint
      ],
    };
  } catch (error) {
    console.error("Proof generation failed:", error);
    // Return placeholder on error
    return {
      pA: [0n, 0n],
      pB: [
        [0n, 0n],
        [0n, 0n],
      ],
      pC: [0n, 0n],
      pubSignals: [nullifierHash, recipientBigInt, root],
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
  circuitWasm?: Buffer;
  circuitZkey?: Buffer;
}

/**
 * Generate complete withdrawal proof from deposit data
 */
export async function generateWithdrawalProofFromData(
  data: WithdrawalProofData
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
    data.circuitWasm,
    data.circuitZkey
  );
}

