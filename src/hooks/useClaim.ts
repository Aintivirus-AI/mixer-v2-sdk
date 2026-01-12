/**
 * Hook for claiming rewards (EVM or Solana)
 * Use this hook when you only need claim functionality
 */

import { useCallback, useMemo } from "react";
import { ChainType, EVMHookConfig, SolanaHookConfig } from "../types";
import { Wallet } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { AintiVirusEVM } from "../evm";
import { AintiVirusSolana } from "../solana";
import { TransactionResult } from "../types";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import {
  createEthersProviderFromViem,
  createEthersSignerFromViem,
} from "./utils";

/**
 * Hook configuration for claiming
 */
export interface ClaimHookConfig {
  evm?: EVMHookConfig;
  solana?: SolanaHookConfig;
  solanaWallet?: Wallet;
  solanaConnection?: Connection;
}

/**
 * Claim hook return type
 */
export interface UseClaimReturn {
  claim: (chainType: ChainType, seasonId: bigint) => Promise<TransactionResult>;
  getCurrentSeason: (chainType: ChainType) => Promise<bigint | null>;
  isEVMReady: boolean;
  isSolanaReady: boolean;
}

/**
 * Hook for claiming rewards
 * Only initializes what's needed for claiming
 */
export function useClaim(config: ClaimHookConfig): UseClaimReturn {
  // EVM setup
  const { isConnected: evmConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const evmSDK = useMemo(() => {
    if (!config.evm?.factoryAddress) {
      return null;
    }
    if (!publicClient) {
      return null;
    }
    try {
      const provider = createEthersProviderFromViem(publicClient);
      const signerOrProvider = walletClient
        ? createEthersSignerFromViem(walletClient, publicClient)
        : provider;
      return new AintiVirusEVM(
        config.evm.factoryAddress,
        config.evm.tokenAddress || "0x0000000000000000000000000000000000000000",
        signerOrProvider
      );
    } catch (error) {
      console.error("Failed to initialize AintiVirusEVM:", error);
      return null;
    }
  }, [
    config.evm?.factoryAddress,
    config.evm?.tokenAddress,
    walletClient,
    publicClient,
  ]);

  const isEVMReady = !!evmSDK && evmConnected;

  // Solana setup
  const solanaSDK = useMemo(() => {
    if (
      !config.solana?.factoryProgramId ||
      !config.solana?.mixerProgramId ||
      !config.solana?.stakingProgramId
    ) {
      return null;
    }
    if (!config.solanaWallet || !config.solanaConnection) {
      return null;
    }
    try {
      return new AintiVirusSolana(
        config.solanaWallet,
        config.solanaConnection,
        config.solana.tokenMint
      );
    } catch (error) {
      console.error("Failed to initialize AintiVirusSolana:", error);
      return null;
    }
  }, [
    config.solana?.factoryProgramId,
    config.solana?.mixerProgramId,
    config.solana?.stakingProgramId,
    config.solana?.tokenMint,
    config.solanaWallet,
    config.solanaConnection,
  ]);

  const isSolanaReady = !!solanaSDK && !!config.solanaWallet?.publicKey;

  // Claim function
  const claim = useCallback(
    async (
      chainType: ChainType,
      seasonId: bigint
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        return evmSDK.claimEth(seasonId);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.claimSol(seasonId);
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  // Get current season
  const getCurrentSeason = useCallback(
    async (chainType: ChainType): Promise<bigint | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.getCurrentStakeSeason();
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.getCurrentStakeSeason();
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  return {
    claim,
    getCurrentSeason,
    isEVMReady,
    isSolanaReady,
  };
}
