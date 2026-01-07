/**
 * Hook for admin functions (EVM or Solana)
 * Use this hook when you need to perform admin operations
 * Requires OPERATOR_ROLE or ADMIN_ROLE
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
 * Hook configuration for admin functions
 */
export interface AdminHookConfig {
  evm?: EVMHookConfig;
  solana?: SolanaHookConfig;
  solanaWallet?: Wallet;
  solanaConnection?: Connection;
}

/**
 * Admin hook return type
 */
export interface UseAdminReturn {
  // Fee management
  setFeeRate: (
    chainType: ChainType,
    feeRate: bigint
  ) => Promise<TransactionResult>;

  // Staking management
  setStakingSeasonPeriod: (
    chainType: ChainType,
    period: bigint
  ) => Promise<TransactionResult>;
  startStakeSeason: (chainType: ChainType) => Promise<TransactionResult>;

  // Verifier/Hasher management (EVM only, inherited from CoreFactory)
  setVerifier: (
    chainType: ChainType,
    verifierAddress: string
  ) => Promise<TransactionResult>;
  setHasher: (
    chainType: ChainType,
    hasherAddress: string
  ) => Promise<TransactionResult>;

  isEVMReady: boolean;
  isSolanaReady: boolean;
}

/**
 * Hook for admin functions
 * Only initializes what's needed for admin operations
 */
export function useAdmin(config: AdminHookConfig): UseAdminReturn {
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

  // Admin functions
  const setFeeRate = useCallback(
    async (
      chainType: ChainType,
      feeRate: bigint
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        const factory = evmSDK.getFactory();
        const tx = await factory.setFeeRate(feeRate);
        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTime: (
            await evmSDK.getFactory().provider.getBlock(receipt.blockNumber)
          )?.timestamp,
        };
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.setFeeRate(feeRate);
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  const setStakingSeasonPeriod = useCallback(
    async (
      chainType: ChainType,
      period: bigint
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        const factory = evmSDK.getFactory();
        const tx = await factory.setStakingSeasonPeriod(period);
        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTime: (
            await evmSDK.getFactory().provider.getBlock(receipt.blockNumber)
          )?.timestamp,
        };
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.setStakingSeasonPeriod(period);
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  const startStakeSeason = useCallback(
    async (chainType: ChainType): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        const factory = evmSDK.getFactory();
        const tx = await factory.startStakeSeason();
        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTime: (
            await evmSDK.getFactory().provider.getBlock(receipt.blockNumber)
          )?.timestamp,
        };
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.startStakeSeason();
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  const setVerifier = useCallback(
    async (
      chainType: ChainType,
      verifierAddress: string
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        const factory = evmSDK.getFactory();
        const tx = await factory.setVerifier(verifierAddress);
        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTime: (
            await evmSDK.getFactory().provider.getBlock(receipt.blockNumber)
          )?.timestamp,
        };
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.setVerifier(verifierAddress);
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  const setHasher = useCallback(
    async (
      chainType: ChainType,
      hasherAddress: string
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        const factory = evmSDK.getFactory();
        const tx = await factory.setHasher(hasherAddress);
        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTime: (
            await evmSDK.getFactory().provider.getBlock(receipt.blockNumber)
          )?.timestamp,
        };
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        return solanaSDK.setHasher(hasherAddress);
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  return {
    setFeeRate,
    setStakingSeasonPeriod,
    startStakeSeason,
    setVerifier,
    setHasher,
    isEVMReady,
    isSolanaReady,
  };
}
