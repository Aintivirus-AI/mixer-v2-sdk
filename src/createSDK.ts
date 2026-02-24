/**
 * Factory for multi-chain SDK instances (EVM + Solana config).
 * EVM: built on demand per chainId. Solana: getSolana() disabled (returns null) for now.
 */

import type { Signer } from "ethers";
import type { Provider } from "ethers";
import type { MixerSDKConfig, SDKConfig } from "./types";
import {
  normalizeConfig,
  getEvmChainConfig,
  getSolanaChainConfig,
  getEvmChainIds,
  getSolanaNetworks,
} from "./config";
import type { NormalizedMixerConfig } from "./config";
import { AintiVirusEVM } from "./evm";
import { MULTICALL3_ADDRESS } from "./evm/multicall";
import type { AintiVirusSolana } from "./solana";

export type { NormalizedMixerConfig } from "./config";

export interface MixerSDKInstance {
  /** Get normalized config */
  getConfig(): NormalizedMixerConfig;
  /** EVM chain IDs present in config */
  getEvmChainIds(): number[];
  /** Solana network ids present in config (Solana SDK integration disabled) */
  getSolanaNetworks(): string[];
  /** Get EVM SDK for chainId; signerOrProvider from wagmi/ethers for that chain */
  getEVM(chainId: number, signerOrProvider: Signer | Provider): AintiVirusEVM | null;
  /** Get Solana SDK – disabled, returns null. Re-enable by uncommenting implementation in createSDK. */
  getSolana(
    network: string,
    wallet: import("@coral-xyz/anchor").Wallet,
    connection: import("@solana/web3.js").Connection
  ): AintiVirusSolana | null;
}

/**
 * Create a multi-chain SDK instance. Accepts full settings (MixerSDKConfig) or legacy SDKConfig.
 * EVM instances are created on demand via getEVM(chainId, signerOrProvider).
 * Solana: getSolana() disabled (returns null).
 */
export function createMixerSDK(config: MixerSDKConfig | SDKConfig): MixerSDKInstance {
  const normalized = normalizeConfig(config as SDKConfig);

  return {
    getConfig: () => normalized,

    getEvmChainIds: () => getEvmChainIds(normalized),

    getSolanaNetworks: () => getSolanaNetworks(normalized),

    getEVM(chainId: number, signerOrProvider: Signer | Provider): AintiVirusEVM | null {
      const chainConfig = getEvmChainConfig(normalized, chainId);
      if (!chainConfig) return null;
      const tokenAddress = chainConfig.tokenAddress ?? "0x0000000000000000000000000000000000000000";
      try {
        const useMulticall =
          chainConfig.useMulticall ?? normalized.useMulticall ?? false;
        const multicallAddress =
          chainConfig.multicallAddress ?? MULTICALL3_ADDRESS;
        return new AintiVirusEVM(
          chainConfig.factoryAddress,
          tokenAddress,
          signerOrProvider,
          chainConfig.wethGatewayAddress,
          chainConfig.wethAddress,
          useMulticall,
          multicallAddress,
        );
      } catch {
        return null;
      }
    },

    // Solana integration disabled – returns null. Uncomment below and add: import { AintiVirusSolana } from "./solana";
    getSolana(
      _network: string,
      _wallet: import("@coral-xyz/anchor").Wallet,
      _connection: import("@solana/web3.js").Connection
    ): AintiVirusSolana | null {
      return null;
      // const chainConfig = getSolanaChainConfig(normalized, network);
      // if (!chainConfig) return null;
      // try {
      //   return new AintiVirusSolana(wallet, connection, chainConfig.tokenMint);
      // } catch {
      //   return null;
      // }
    },
  };
}
