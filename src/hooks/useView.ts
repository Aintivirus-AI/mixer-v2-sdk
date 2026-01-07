/**
 * Hook for view/read-only functions (EVM or Solana)
 * Use this hook when you only need to read data from contracts
 */

import { useCallback, useMemo } from "react";
import {
  ChainType,
  EVMHookConfig,
  SolanaHookConfig,
  AssetMode,
  StakeSeason,
  StakerRecord,
} from "../types";
import { Wallet } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { AintiVirusEVM } from "../evm";
import { AintiVirusSolana } from "../solana";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import {
  createEthersProviderFromViem,
  createEthersSignerFromViem,
} from "./utils";

/**
 * Hook configuration for view functions
 */
export interface ViewHookConfig {
  evm?: EVMHookConfig;
  solana?: SolanaHookConfig;
  solanaWallet?: Wallet;
  solanaConnection?: Connection;
}

/**
 * View hook return type
 */
export interface UseViewReturn {
  // Mixer functions
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
  getFeeRate: (chainType: ChainType) => Promise<bigint | null>;

  // Staking functions
  getCurrentSeason: (chainType: ChainType) => Promise<bigint | null>;
  getStakeSeason: (
    chainType: ChainType,
    seasonId: bigint
  ) => Promise<StakeSeason | null>;
  getStakerRecord: (
    chainType: ChainType,
    address: string
  ) => Promise<StakerRecord | null>;
  hasClaimedEth: (
    chainType: ChainType,
    address: string,
    seasonId: bigint
  ) => Promise<boolean | null>;
  hasClaimedToken: (
    chainType: ChainType,
    address: string,
    seasonId: bigint
  ) => Promise<boolean | null>;
  getStakingAddress: (chainType: ChainType) => Promise<string | null>;

  // Balance functions
  getTokenBalance: (
    chainType: ChainType,
    address: string
  ) => Promise<bigint | null>;
  getEthBalance: (
    chainType: ChainType,
    address: string
  ) => Promise<bigint | null>;

  // Status
  isEVMReady: boolean;
  isSolanaReady: boolean;
}

/**
 * Hook for view/read-only functions
 * Only initializes what's needed for reading data
 */
export function useView(config: ViewHookConfig): UseViewReturn {
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

  const isEVMReady = !!evmSDK;

  // Solana setup
  const solanaSDK = useMemo(() => {
    if (
      !config.solana?.factoryProgramId ||
      !config.solana?.mixerProgramId ||
      !config.solana?.stakingProgramId
    ) {
      return null;
    }
    if (!config.solanaConnection) {
      return null;
    }
    try {
      // For view functions, we don't need wallet, but SDK requires it
      // We'll create a dummy wallet or handle it gracefully
      if (!config.solanaWallet) {
        return null;
      }
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

  const isSolanaReady = !!solanaSDK;

  // View functions
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
        return solanaSDK.getMixer(mode, amount);
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

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

  const calculateDepositAmount = useCallback(
    async (
      chainType: ChainType,
      amount: bigint
    ): Promise<bigint | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.calculateDepositAmount(amount);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.calculateDepositAmount(amount);
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  const getFeeRate = useCallback(
    async (chainType: ChainType): Promise<bigint | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.getFeeRate();
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.getFeeRate();
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

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

  const getStakeSeason = useCallback(
    async (
      chainType: ChainType,
      seasonId: bigint
    ): Promise<StakeSeason | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.getStakeSeason(seasonId);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.getStakeSeason(seasonId);
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  const getStakerRecord = useCallback(
    async (
      chainType: ChainType,
      address: string
    ): Promise<StakerRecord | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.getStakerRecord(address);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.getStakerRecord(address);
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  const hasClaimedEth = useCallback(
    async (
      chainType: ChainType,
      address: string,
      seasonId: bigint
    ): Promise<boolean | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.hasClaimedEth(address, seasonId);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.hasClaimedSol(address, seasonId);
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  const hasClaimedToken = useCallback(
    async (
      chainType: ChainType,
      address: string,
      seasonId: bigint
    ): Promise<boolean | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.hasClaimedToken(address, seasonId);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.hasClaimedToken(address, seasonId);
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  const getStakingAddress = useCallback(
    async (chainType: ChainType): Promise<string | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.getStakingAddress();
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.getStakingAddress();
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  const getTokenBalance = useCallback(
    async (
      chainType: ChainType,
      address: string
    ): Promise<bigint | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.getTokenBalance(address);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.getTokenBalance(address);
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  const getEthBalance = useCallback(
    async (
      chainType: ChainType,
      address: string
    ): Promise<bigint | null> => {
      if (chainType === ChainType.EVM) {
        if (!evmSDK) return null;
        return evmSDK.getEthBalance(address);
      } else if (chainType === ChainType.SOLANA) {
        if (!solanaSDK) return null;
        return solanaSDK.getSolBalance(address);
      }
      return null;
    },
    [evmSDK, solanaSDK]
  );

  return {
    getMixer,
    mixerExists,
    calculateDepositAmount,
    getFeeRate,
    getCurrentSeason,
    getStakeSeason,
    getStakerRecord,
    hasClaimedEth,
    hasClaimedToken,
    getStakingAddress,
    getTokenBalance,
    getEthBalance,
    isEVMReady,
    isSolanaReady,
  };
}

