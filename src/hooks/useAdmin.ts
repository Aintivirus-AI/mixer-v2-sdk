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

  // Relayer fee management (EVM only)
  setRelayerFeeRate: (
    chainType: ChainType,
    relayerFeeRate: bigint
  ) => Promise<TransactionResult>;

  // Staking management
  /**
   * EVM: maps to Factory.updateNextSeasonDuration(durationSeconds)
   * Solana: maps to the existing staking season period setter
   */
  setStakingSeasonPeriod: (
    chainType: ChainType,
    period: bigint
  ) => Promise<TransactionResult>;
  /**
   * EVM: maps to Factory.startSeason()
   * Solana: maps to starting the next season id
   */
  startStakeSeason: (chainType: ChainType) => Promise<TransactionResult>;

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
          blockTime: (await evmSDK.getProvider().getBlock(receipt.blockNumber))
            ?.timestamp,
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

  const setRelayerFeeRate = useCallback(
    async (
      chainType: ChainType,
      relayerFeeRate: bigint
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        const factory = evmSDK.getFactory();
        const tx = await factory.setRelayerFeeRate(relayerFeeRate);
        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTime: (await evmSDK.getProvider().getBlock(receipt.blockNumber))
            ?.timestamp,
        };
      } else if (chainType === ChainType.SOLANA) {
        throw new Error("Relayer fee rate is not supported on Solana");
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK]
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
        // Contract renamed: updateNextSeasonDuration(uint256 _duration)
        const tx = await factory.updateNextSeasonDuration(period);
        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTime: (await evmSDK.getProvider().getBlock(receipt.blockNumber))
            ?.timestamp,
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
        // Contract renamed: startSeason()
        const tx = await factory.startSeason();
        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTime: (await evmSDK.getProvider().getBlock(receipt.blockNumber))
            ?.timestamp,
        };
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        // Get current season and increment by 1 for next season
        const currentSeason = await solanaSDK.getCurrentStakeSeason();
        const nextSeasonId = currentSeason + 1n;
        return solanaSDK.startStakeSeason(nextSeasonId);
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

  return {
    setFeeRate,
    setRelayerFeeRate,
    setStakingSeasonPeriod,
    startStakeSeason,
    isEVMReady,
    isSolanaReady,
  };
}
