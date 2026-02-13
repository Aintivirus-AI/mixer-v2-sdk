/**
 * Hook for depositing into mixers (EVM only for now).
 * Generates commitment (secret/nullifier) internally. Save the returned depositData for withdrawals.
 * Must be used inside MixerProviderWithWagmi.
 * Solana integration commented out – pass solanaWallet + solanaConnection when re-enabled.
 */

import { useCallback } from "react";
import { AssetMode } from "../types";
import type { TransactionResult, DepositData } from "../types";
import { useAccount } from "wagmi";
import { useMixer } from "./context";
import { generateSecretAndNullifier, computeCommitment } from "../utils/crypto";
import { ETH_ADDRESS } from "../evm";

export interface DepositResult extends TransactionResult {
  /** Save this (secret, nullifier) to generate withdrawal proof later. */
  depositData: DepositData;
}

export interface UseDepositReturn {
  /**
   * Deposit into the mixer for the given asset and amount.
   * Commitment is generated automatically. Returns depositData for later withdrawal.
   * Fails if no mixer is deployed for this asset+amount.
   */
  deposit: (
    assetAddress: string,
    amount: bigint
  ) => Promise<DepositResult>;
  /** Total to pay (amount + fee). Use for display or approval. */
  calculateDepositAmount: (amount: bigint) => Promise<bigint>;
  /** Check if a mixer is deployed for this asset and amount. */
  mixerExists: (assetAddress: string, amount: bigint) => Promise<boolean>;
  isReady: boolean;
  isEVMReady: boolean;
  /** Always false; Solana integration disabled. */
  isSolanaReady: boolean;
}

/**
 * Deposit hook. Must be used inside MixerProviderWithWagmi.
 * EVM only: uses current chain from Provider.
 */
export function useDeposit(/* options?: SolanaConnectionOptions */): UseDepositReturn {
  const mixer = useMixer();
  const { isConnected: evmConnected } = useAccount();

  const evmSDK = mixer?.getActiveEVM?.() ?? null;
  const chainId = mixer?.chainId;
  const evmChainIds = mixer?.evmChainIds ?? [];
  const isSupportedEVMChain =
    chainId != null && evmChainIds.length > 0 && evmChainIds.includes(chainId);
  const isEVMReady = !!evmSDK && evmConnected && isSupportedEVMChain;

  // Solana integration disabled
  const isSolanaReady = false;

  const isReady = isEVMReady;

  const mixerExists = useCallback(
    async (assetAddress: string, amount: bigint): Promise<boolean> => {
      if (isEVMReady && evmSDK) {
        return evmSDK.mixerExists(assetAddress, amount);
      }
      // if (isSolanaReady && solanaSDK) { return solanaSDK.mixerExists(mode, amount); }
      return false;
    },
    [evmSDK, isEVMReady]
  );

  const deposit = useCallback(
    async (
      assetAddress: string,
      amount: bigint
    ): Promise<DepositResult> => {
      const exists = await mixerExists(assetAddress, amount);
      if (!exists) {
        throw new Error(
          "No mixer deployed for this asset and amount. Deploy a mixer first (Deploy tab)."
        );
      }

      const { secret, nullifier } = generateSecretAndNullifier();
      const commitment = computeCommitment(secret, nullifier);

      if (isEVMReady && evmSDK) {
        const isEth =
          assetAddress.toLowerCase() === ETH_ADDRESS.toLowerCase();
        const result = isEth
          ? await evmSDK.depositEth(amount, commitment)
          : await evmSDK.depositToken(amount, commitment);
        const mode = isEth ? AssetMode.ETH : AssetMode.TOKEN;
        return {
          ...result,
          depositData: { secret, nullifier, commitment, amount, mode },
        };
      }

      // if (isSolanaReady && solanaSDK) { ... }
      throw new Error(
        "No active chain. Connect wallet on a supported EVM chain (from config)."
      );
    },
    [evmSDK, isEVMReady, mixerExists]
  );

  const calculateDepositAmount = useCallback(
    async (amount: bigint): Promise<bigint> => {
      if (isEVMReady && evmSDK) {
        return evmSDK.calculateDepositAmount(amount);
      }
      // if (isSolanaReady && solanaSDK) { return solanaSDK.calculateDepositAmount(amount); }
      throw new Error(
        "No active chain. Connect wallet on a supported EVM chain (from config)."
      );
    },
    [evmSDK, isEVMReady]
  );

  return {
    deposit,
    calculateDepositAmount,
    mixerExists,
    isReady,
    isEVMReady,
    isSolanaReady,
  };
}
