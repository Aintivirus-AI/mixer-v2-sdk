/**
 * Hook for withdrawing from mixers (EVM only).
 * Fetches pool deposits from subgraph, builds merkle tree and proof, then submits withdraw tx.
 * Must be used inside MixerProviderWithWagmi.
 */

import { useCallback } from "react";
import type { TransactionResult } from "../types";
import { useEVMReady } from "./useEVMReady";
import type { MixerPool } from "../evm/subgraph/types";
import { fetchCommitmentsAndBuildProof } from "../utils/withdrawProof";

export interface WithdrawParams {
  /** Pool you deposited to (asset + amount identify the mixer). */
  pool: MixerPool;
  secret: bigint;
  nullifier: bigint;
  recipient: string;
  /** Withdrawal fee (default 0n). Must match circuit proof. */
  fee?: bigint;
  /** Relayer address (default zero address). Must match circuit proof. */
  relayer?: string;
}

export interface UseWithdrawReturn {
  /**
   * Withdraw from the given pool using secret/nullifier from deposit data.
   * Fetches commitments from subgraph, generates proof, submits tx.
   */
  withdraw: (params: WithdrawParams) => Promise<TransactionResult>;
  isReady: boolean;
  isEVMReady: boolean;
}

/**
 * Withdraw hook. Must be used inside MixerProviderWithWagmi.
 * EVM only: uses current chain and subgraph from config.
 */
export function useWithdraw(): UseWithdrawReturn {
  const { evmSDK, subgraph, isEVMReady } = useEVMReady();
  const isReady = isEVMReady && !!subgraph;

  const withdraw = useCallback(
    async (params: WithdrawParams): Promise<TransactionResult> => {
      const { pool, secret, nullifier, recipient } = params;

      if (!evmSDK || !subgraph) {
        throw new Error(
          "Wallet or subgraph not ready. Connect wallet on a supported chain.",
        );
      }

      const proof = await fetchCommitmentsAndBuildProof(subgraph, pool, {
        secret,
        nullifier,
        recipient,
        fee: params.fee,
        relayer: params.relayer,
      });
      const fee = BigInt(proof.pubSignals[3]);
      return await evmSDK.withdraw(proof, fee, pool.amount, pool.asset);
    },
    [evmSDK, subgraph],
  );

  return {
    withdraw,
    isReady,
    isEVMReady,
  };
}
