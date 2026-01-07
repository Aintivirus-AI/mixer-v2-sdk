/**
 * Hook for depositing (EVM or Solana)
 * Use this hook when you only need deposit functionality
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
 * Hook configuration for deposit
 */
export interface DepositHookConfig {
  evm?: EVMHookConfig;
  solana?: SolanaHookConfig;
  solanaWallet?: Wallet;
  solanaConnection?: Connection;
}

/**
 * Deposit hook return type
 */
export interface UseDepositReturn {
  deposit: (
    chainType: ChainType,
    amount: bigint,
    commitment: bigint
  ) => Promise<TransactionResult>;
  isEVMReady: boolean;
  isSolanaReady: boolean;
}

/**
 * Hook for depositing funds
 * Only initializes what's needed for deposits
 */
export function useDeposit(config: DepositHookConfig): UseDepositReturn {
  // EVM setup (only if EVM config provided)
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
        config.evm.tokenAddress || "0x0000000000000000000000000000000000000000", // Default to zero address if not provided
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

  // Solana setup (only if Solana config provided)
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

  // Deposit function
  const deposit = useCallback(
    async (
      chainType: ChainType,
      amount: bigint,
      commitment: bigint
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        return evmSDK.depositEth(amount, commitment);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.depositSol(amount, commitment);
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  return {
    deposit,
    isEVMReady,
    isSolanaReady,
  };
}
