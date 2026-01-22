/**
 * Hook for withdrawing (EVM or Solana)
 * Use this hook when you only need withdraw functionality
 */

import { useCallback, useMemo } from "react";
import {
  ChainType,
  EVMHookConfig,
  SolanaHookConfig,
  AssetMode,
  WithdrawalProof,
} from "../types";
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
 * Hook configuration for withdraw
 */
export interface WithdrawHookConfig {
  evm?: EVMHookConfig;
  solana?: SolanaHookConfig;
  solanaWallet?: Wallet;
  solanaConnection?: Connection;
}

/**
 * Withdraw hook return type
 */
export interface UseWithdrawReturn {
  withdraw: (
    chainType: ChainType,
    proof: WithdrawalProof,
    amount: bigint,
    mode: AssetMode
  ) => Promise<TransactionResult>;
  withdrawRelayed: (
    chainType: ChainType,
    proof: WithdrawalProof,
    amount: bigint,
    mode: AssetMode
  ) => Promise<TransactionResult>;
  isEVMReady: boolean;
  isSolanaReady: boolean;
}

/**
 * Hook for withdrawing funds
 * Only initializes what's needed for withdrawals
 */
export function useWithdraw(config: WithdrawHookConfig): UseWithdrawReturn {
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
        const nullifierHash = proof.pubSignals[0];
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

  // Withdraw via relayer (EVM only)
  const withdrawRelayed = useCallback(
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
        return evmSDK.withdrawRelayed(proof, amount, mode);
      } else if (chainType === ChainType.SOLANA) {
        throw new Error("Relayed withdrawals are not supported on Solana");
      }
      throw new Error(`Unsupported chain type: ${chainType}`);
    },
    [evmSDK]
  );

  return {
    withdraw,
    withdrawRelayed,
    isEVMReady,
    isSolanaReady,
  };
}
