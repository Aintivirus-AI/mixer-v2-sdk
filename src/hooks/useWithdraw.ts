/**
 * Hook for withdrawing from mixers (EVM only).
 * Fetches pool deposits from subgraph, builds merkle tree and proof, then submits withdraw tx.
 * Must be used inside MixerProviderWithWagmi.
 */

import { useCallback, useMemo } from "react";
import type { TransactionResult } from "../types";
import { useAccount, useChainId } from "wagmi";
import { useMixer, useMixerConfig } from "./context";
import { AintiVirusEVMSubgraph } from "../evm/subgraph";
import type { MixerPool } from "../evm/subgraph/types";
import { generateWithdrawalProofFromData } from "../utils/proof";

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
  const mixer = useMixer();
  const chainId = useChainId();
  const { isConnected: evmConnected } = useAccount();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();

  const evmSDK = mixer?.getActiveEVM?.() ?? null;
  const evmChainConfig =
    chainId != null ? getEvmChainConfig(chainId) : undefined;
  const subgraphUrl = evmChainConfig?.subgraphUrl;

  const subgraph = useMemo(() => {
    if (!subgraphUrl) return null;
    return new AintiVirusEVMSubgraph({ endpoint: subgraphUrl });
  }, [subgraphUrl]);

  const isSupportedEVMChain =
    chainId != null && evmChainIds.length > 0 && evmChainIds.includes(chainId);
  const isEVMReady =
    !!evmSDK && evmConnected && isSupportedEVMChain && !!subgraph;
  const isReady = isEVMReady;

  const withdraw = useCallback(
    async (params: WithdrawParams): Promise<TransactionResult> => {
      const { pool, secret, nullifier, recipient } = params;

      if (!evmSDK || !subgraph) {
        throw new Error(
          "Wallet or subgraph not ready. Connect wallet on a supported chain.",
        );
      }

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

      const proof = await generateWithdrawalProofFromData({
        secret,
        nullifier,
        recipient,
        commitments,
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
