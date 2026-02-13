/**
 * AintiVirus Mixer SDK
 * EVM-only integration in hooks/provider; Solana config and class kept for types / future use.
 */

import { JsonRpcProvider } from "ethers";
import { SDKConfig } from "./types";
import { AintiVirusEVM } from "./evm";
import { AintiVirusSolana } from "./solana";

// Export types
export * from "./types";

// Export config and multi-chain factory
export {
  normalizeConfig,
  getEvmChainConfig,
  getSolanaChainConfig,
  getEvmChainIds,
  getSolanaNetworks,
} from "./config";
export type { NormalizedMixerConfig } from "./config";
export { createMixerSDK } from "./createSDK";
export type { MixerSDKInstance } from "./createSDK";

// Export EVM SDK and constants
export { AintiVirusEVM, ETH_ADDRESS } from "./evm";

// Export Solana SDK (class only; hooks/provider Solana integration disabled)
export { AintiVirusSolana } from "./solana";

// Export The Graph (EVM-only) client
export * from "./evm/subgraph";

// Export utilities
export * from "./utils/crypto";
export * from "./utils/proof";

// Re-export commonly used types
export { AssetMode } from "./types";
export type { DepositData, WithdrawalProof, TransactionResult, MixerSDKConfig, EvmChainConfig, SolanaChainConfig } from "./types";
export type { SDKConfig } from "./types";

// React integration – provider and useDeploy (use "@aintivirus-ai/mixer-sdk" only)
export {
  MixerProviderWithWagmi,
  MixerProviderWithWagmi as MixerProvider,
  useMixerConfig,
  useMixer,
  useDeploy,
  useDeposit,
} from "./hooks";
export type {
  MixerContextValue,
  UseDeployReturn,
  UseDepositReturn,
  DepositResult,
} from "./hooks";

/**
 * Main SDK class (legacy single-chain). For multi-chain use createMixerSDK() or MixerProvider.
 */
export class AintiVirusSDK {
  public evm?: AintiVirusEVM;
  public solana?: AintiVirusSolana;

  constructor(config: SDKConfig) {
    if (config.evm) {
      try {
        const provider =
          (config.evm as { provider?: unknown }).provider ||
          (config.evm.rpcUrl ? new JsonRpcProvider(config.evm.rpcUrl) : null);
        if (!provider) throw new Error("EVM provider or rpcUrl required");
        const signer =
          provider && typeof (provider as { signTransaction?: unknown }).signTransaction === "function"
            ? (provider as unknown as import("ethers").Signer)
            : null;
        this.evm = new AintiVirusEVM(
          config.evm.factoryAddress,
          config.evm.tokenAddress ?? "0x0000000000000000000000000000000000000000",
          signer ?? (provider as import("ethers").Provider)
        );
      } catch (err) {
        throw new Error(`Failed to initialize EVM SDK: ${err}`);
      }
    }
    if (config.solana) {
      // Solana integration disabled in hooks; legacy SDK does not support Solana
      throw new Error(
        "Solana in AintiVirusSDK requires connection and wallet; use createMixerSDK().getSolana(network, wallet, connection) or hooks (when Solana re-enabled)."
      );
    }
  }
}

// No default export – use named: import { AintiVirusSDK, MixerProvider } from "@aintivirus-ai/mixer-sdk"
