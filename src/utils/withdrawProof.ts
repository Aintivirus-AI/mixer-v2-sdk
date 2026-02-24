/**
 * Shared helper: fetch commitments from subgraph and build withdrawal proof.
 * Used by useWithdraw and useWithdrawByGiftCard to avoid duplicated logic.
 */

import type { WithdrawalProof } from "../types";
import type { AintiVirusEVMSubgraph } from "../evm/subgraph";
import type { MixerPool } from "../evm/subgraph/types";
import { generateWithdrawalProofFromData } from "./proof";

export interface FetchCommitmentsAndBuildProofParams {
  secret: bigint;
  nullifier: bigint;
  recipient: string;
  fee?: bigint;
  relayer?: string;
}

/**
 * Fetches deposits for the pool from subgraph, builds merkle tree, and generates withdrawal proof.
 * @throws Error "No deposits found for this pool; cannot build merkle tree." when commitments are empty
 */
export async function fetchCommitmentsAndBuildProof(
  subgraph: AintiVirusEVMSubgraph,
  pool: MixerPool,
  params: FetchCommitmentsAndBuildProofParams,
): Promise<WithdrawalProof> {
  const deposits = await subgraph.getDeposits({
    poolId: pool.id,
    first: 500,
    orderBy: "blockNumber",
    orderDirection: "asc",
  });
  const commitments = deposits.map((d) => BigInt(d.commitment));

  if (commitments.length === 0) {
    throw new Error(
      "No deposits found for this pool; cannot build merkle tree.",
    );
  }

  return generateWithdrawalProofFromData({
    secret: params.secret,
    nullifier: params.nullifier,
    recipient: params.recipient,
    commitments,
    fee: params.fee,
    relayer: params.relayer,
  });
}
