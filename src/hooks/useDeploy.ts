/**
 * Hook for deploying mixers (EVM or Solana)
 * Use this hook when you need to deploy new mixer instances
 */

import { useCallback, useMemo } from "react";
import { ChainType, EVMHookConfig, SolanaHookConfig, AssetMode } from "../types";
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
 * Hook configuration for deploy
 */
export interface DeployHookConfig {
  evm?: EVMHookConfig;
  solana?: SolanaHookConfig;
  solanaWallet?: Wallet;
  solanaConnection?: Connection;
}

/**
 * Deploy hook return type
 */
export interface UseDeployReturn {
  deployMixer: (
    chainType: ChainType,
    mode: AssetMode,
    amount: bigint
  ) => Promise<TransactionResult & { mixerAddress?: string }>;
  isEVMReady: boolean;
  isSolanaReady: boolean;
}

/**
 * Hook for deploying mixers
 * Only initializes what's needed for deployment
 */
export function useDeploy(config: DeployHookConfig): UseDeployReturn {
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
        config.solana.factoryProgramId,
        config.solana.mixerProgramId,
        config.solana.stakingProgramId,
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

  // Deploy mixer function
  const deployMixer = useCallback(
    async (
      chainType: ChainType,
      mode: AssetMode,
      amount: bigint
    ): Promise<TransactionResult & { mixerAddress?: string }> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        return evmSDK.deployMixer(mode, amount);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        const result = await solanaSDK.deployMixer(mode, amount);
        return result;
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  return {
    deployMixer,
    isEVMReady,
    isSolanaReady,
  };
}

