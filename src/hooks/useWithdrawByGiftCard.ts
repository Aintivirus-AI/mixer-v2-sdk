/**
 * Hook for withdrawing from mixers by gift card (EVM only).
 * Requires the mixer to have gift card withdrawals enabled (Admin: Set Gift Card).
 * Fetches pool deposits from subgraph, builds merkle tree and proof, then submits withdrawByGiftCard tx.
 * Must be used inside MixerProviderWithWagmi.
 */

import { useCallback } from "react";
import type { TransactionResult } from "../types";
import { useEVMReady } from "./useEVMReady";
import type { MixerPool } from "../evm/subgraph/types";
import { fetchCommitmentsAndBuildProof } from "../utils/withdrawProof";

export interface WithdrawByGiftCardParams {
  /** Pool you deposited to (asset + amount identify the mixer). */
  pool: MixerPool;
  secret: bigint;
  nullifier: bigint;
  /** Recipient (from proof; payment contract pays this address). */
  recipient: string;
  /** Order ID: 0x-prefixed 64-char hex (bytes32) or any string (hashed to bytes32). */
  orderId: string;
}

export interface UseWithdrawByGiftCardReturn {
  /**
   * Withdraw by gift card: factory pays the order via payment contract to the recipient from the proof.
   * Fetches commitments from subgraph, generates proof, submits withdrawByGiftCard tx.
   */
  withdrawByGiftCard: (
    params: WithdrawByGiftCardParams,
  ) => Promise<TransactionResult>;
  /** Check if gift card withdrawals are enabled for a pool (asset + amount). */
  isGiftCardEnabledForPool: (
    asset: string,
    amount: bigint,
  ) => Promise<boolean>;
  isReady: boolean;
  isEVMReady: boolean;
}

/**
 * Withdraw by gift card hook. Must be used inside MixerProviderWithWagmi.
 * EVM only. Ensure the mixer has gift card enabled (Admin → Set Gift Card) before calling.
 */
export function useWithdrawByGiftCard(): UseWithdrawByGiftCardReturn {
  const { evmSDK, subgraph, isEVMReady } = useEVMReady();
  const isReady = isEVMReady && !!subgraph;

  const withdrawByGiftCard = useCallback(
    async (
      params: WithdrawByGiftCardParams,
    ): Promise<TransactionResult> => {
      const { pool, secret, nullifier, recipient, orderId } = params;

      if (!evmSDK || !subgraph) {
        throw new Error(
          "Wallet or subgraph not ready. Connect wallet on a supported chain.",
        );
      }

      const proof = await fetchCommitmentsAndBuildProof(subgraph, pool, {
        secret,
        nullifier,
        recipient,
        fee: 0n,
      });
      return await evmSDK.withdrawByGiftCard(
        proof,
        orderId,
        pool.amount,
        pool.asset,
      );
    },
    [evmSDK, subgraph],
  );

  const isGiftCardEnabledForPool = useCallback(
    async (asset: string, amount: bigint): Promise<boolean> => {
      if (!evmSDK) return false;
      return evmSDK.isGiftCardWithdrawEnabledForPool(asset, amount);
    },
    [evmSDK],
  );

  return {
    withdrawByGiftCard,
    isGiftCardEnabledForPool,
    isReady,
    isEVMReady,
  };
}
