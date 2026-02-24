/**
 * Hook for deploying mixers (EVM only for now).
 * All SDK instances come from MixerProvider. EVM uses current chain (must be a supported chain).
 * Solana integration commented out – pass solanaWallet + solanaConnection when re-enabled.
 */

import { useCallback } from "react";
import { useEVMReady } from "./useEVMReady";

// export type { SolanaConnectionOptions }; // Reserved for future Solana support

export interface UseDeployReturn {
  /** Deploy on the current active chain (from provider/config). */
  deployMixer: (
    assetAddress: string,
    amount: bigint
  ) => Promise<import("../types").TransactionResult & { mixerAddress?: string }>;
  /** True when connected on a supported EVM chain. */
  isReady: boolean;
  isEVMReady: boolean;
  /** Always false; Solana integration disabled. */
  isSolanaReady: boolean;
}

/**
 * Deploy hook. Must be used inside MixerProviderWithWagmi.
 * EVM only: uses current chain from Provider (must be a supported chain ID).
 */
export function useDeploy(/* options?: SolanaConnectionOptions */): UseDeployReturn {
  const { evmSDK, isEVMReady, isReady } = useEVMReady();

  // Solana integration disabled – no solanaWallet/solanaConnection passed
  const isSolanaReady = false;

  const deployMixer = useCallback(
    async (
      assetAddress: string,
      amount: bigint
    ): Promise<import("../types").TransactionResult & { mixerAddress?: string }> => {
      if (isEVMReady && evmSDK) {
        return evmSDK.deployMixer(assetAddress, amount);
      }
      // if (isSolanaReady && solanaSDK) { return solanaSDK.deployMixer(mode, amount); }
      throw new Error("No active chain. Connect wallet on a supported EVM chain (from config).");
    },
    [evmSDK, isEVMReady]
  );

  return {
    deployMixer,
    isReady,
    isEVMReady,
    isSolanaReady,
  };
}
