/**
 * Hook for staking (EVM or Solana)
 * Use this hook when you only need staking functionality
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
 * Hook configuration for staking
 */
export interface StakeHookConfig {
  evm?: EVMHookConfig;
  solana?: SolanaHookConfig;
  solanaWallet?: Wallet;
  solanaConnection?: Connection;
}

/**
 * Staking hook return type
 */
export interface UseStakeReturn {
  stake: (chainType: ChainType, amount: bigint) => Promise<TransactionResult>;
  unstake: (chainType: ChainType) => Promise<TransactionResult>;
  isEVMReady: boolean;
  isSolanaReady: boolean;
}

/**
 * Hook for staking/unstaking funds
 * Only initializes what's needed for staking
 */
export function useStake(config: StakeHookConfig): UseStakeReturn {
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

  // Stake function
  const stake = useCallback(
    async (
      chainType: ChainType,
      amount: bigint
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        return evmSDK.stakeEther(amount);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.stakeSol(amount);
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  // Unstake function
  const unstake = useCallback(
    async (chainType: ChainType): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        return evmSDK.unstakeEth();
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.unstakeSol();
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  return {
    stake,
    unstake,
    isEVMReady,
    isSolanaReady,
  };
}
