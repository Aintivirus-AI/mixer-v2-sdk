/**
 * Unified hook for AintiVirus Mixer
 * Supports both EVM and Solana chains with unified API
 *
 * Configure both chains at initialization, then use chain type parameter for each function call
 */

import { useCallback, useMemo } from "react";
import { ChainType, EVMHookConfig, SolanaHookConfig } from "../types";
import { Wallet } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { AintiVirusEVM } from "../evm";
import { AintiVirusSolana } from "../solana";
import { AssetMode, WithdrawalProof, TransactionResult } from "../types";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import {
  createEthersProviderFromViem,
  createEthersSignerFromViem,
} from "./utils";

/**
 * Unified hook configuration
 */
export interface UnifiedHookConfig {
  evm?: EVMHookConfig;
  solana?: SolanaHookConfig;
  solanaWallet?: Wallet;
  solanaConnection?: Connection;
}

/**
 * Unified hook return type
 */
export interface UseAintiVirusReturn {
  // Deposit functions
  deposit: (
    chainType: ChainType,
    amount: bigint,
    commitment: bigint
  ) => Promise<TransactionResult>;

  // Withdraw functions
  withdraw: (
    chainType: ChainType,
    proof: WithdrawalProof,
    amount: bigint,
    mode: AssetMode
  ) => Promise<TransactionResult>;

  // Staking functions
  stake: (chainType: ChainType, amount: bigint) => Promise<TransactionResult>;

  unstake: (chainType: ChainType) => Promise<TransactionResult>;

  // Claim functions
  claim: (chainType: ChainType, seasonId: bigint) => Promise<TransactionResult>;

  // View functions
  getCurrentSeason: (chainType: ChainType) => Promise<bigint | null>;
  getMixer: (
    chainType: ChainType,
    mode: AssetMode,
    amount: bigint
  ) => Promise<string | null>;
  mixerExists: (
    chainType: ChainType,
    mode: AssetMode,
    amount: bigint
  ) => Promise<boolean>;
  calculateDepositAmount: (
    chainType: ChainType,
    amount: bigint
  ) => Promise<bigint | null>;

  // Status
  isEVMReady: boolean;
  isSolanaReady: boolean;
  evmAddress?: string;
  solanaAddress?: string;

  // Direct SDK access (for advanced usage)
  evmSDK: AintiVirusEVM | null;
  solanaSDK: AintiVirusSolana | null;
}

/**
 * Main unified hook that supports both EVM and Solana
 *
 * @param config - Configuration object with both EVM and Solana configs
 * @returns Unified API with chain type parameter for each function
 */
export function useAintiVirus(config: UnifiedHookConfig): UseAintiVirusReturn {
  // EVM setup
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
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
  const solanaAddress = config.solanaWallet?.publicKey?.toString();

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

  // Withdraw function
  const withdraw = useCallback(
    async (
      chainType: ChainType,
      proof: WithdrawalProof,
      amount: bigint,
      mode: AssetMode
    ): Promise<TransactionResult> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) {
          throw new Error("EVM SDK not initialized");
        }
        return evmSDK.withdraw(proof, amount, mode);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) {
          throw new Error("Solana SDK not initialized");
        }
        // Solana withdraw needs instruction data and nullifier hash
        // This is a simplified version - you may need to adjust based on your Solana implementation
        const nullifierHash = proof.pubSignals[0];
        // Create empty buffer for instruction data (placeholder)
        const instructionData = new Uint8Array(0);
        return solanaSDK.withdraw(
          instructionData as any,
          nullifierHash,
          amount,
          mode
        );
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK, solanaSDK]
  );

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

  // Get mixer
  const getMixer = useCallback(
    async (
      chainType: ChainType,
      mode: AssetMode,
      amount: bigint
    ): Promise<string | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.getMixer(mode, amount);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        const mixer = await solanaSDK.getMixer(mode, amount);
        return mixer.toString();
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  // Check if mixer exists
  const mixerExists = useCallback(
    async (
      chainType: ChainType,
      mode: AssetMode,
      amount: bigint
    ): Promise<boolean> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return false;
        return evmSDK.mixerExists(mode, amount);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return false;
        return solanaSDK.mixerExists(mode, amount);
      }
      return false;
    },
    [evmSDK, solanaSDK]
  );

  // Calculate deposit amount
  const calculateDepositAmount = useCallback(
    async (chainType: ChainType, amount: bigint): Promise<bigint | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.calculateDepositAmount(amount);
      } else if (chainType === ChainType.SOLANA) {
        // Solana doesn't have fee calculation in the same way
        // Return amount as-is or implement fee calculation if needed
        return amount;
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  return {
    deposit,
    withdraw,
    stake,
    unstake,
    claim,
    getCurrentSeason,
    getMixer,
    mixerExists,
    calculateDepositAmount,
    isEVMReady,
    isSolanaReady,
    evmAddress: evmAddress,
    solanaAddress,
    evmSDK,
    solanaSDK,
  };
}
