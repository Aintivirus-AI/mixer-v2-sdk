/**
 * AintiVirus Mixer SDK
 * Easy-to-use TypeScript SDK for privacy-preserving transactions on EVM and Solana
 */

// Export types
export * from "./types";

// Export EVM SDK
export { AintiVirusEVM } from "./evm";

// Export Solana SDK
export { AintiVirusSolana } from "./solana";

// Export utilities
export * from "./utils/crypto";
export * from "./utils/proof";

// Re-export commonly used types for convenience
export { AssetMode } from "./types";
export type { DepositData, WithdrawalProof, TransactionResult } from "./types";
export type { SDKConfig } from "./types";

/**
 * Main SDK class that provides a unified interface
 * Can be initialized for either EVM or Solana (or both)
 */
export class AintiVirusSDK {
  public evm?: import("./evm").AintiVirusEVM;
  public solana?: import("./solana").AintiVirusSolana;

  /**
   * Initialize SDK with configuration
   */
  constructor(config: SDKConfig) {
    if (config.evm) {
      // Import ethers dynamically to avoid issues if not using EVM
      try {
        const ethers = require("ethers");
        const provider =
          config.evm.provider ||
          (config.evm.rpcUrl
            ? new ethers.JsonRpcProvider(config.evm.rpcUrl)
            : null);

        if (!provider) {
          throw new Error("EVM provider or rpcUrl required");
        }

        const signer = provider instanceof ethers.Signer ? provider : null;
        const { AintiVirusEVM } = require("./evm");
        this.evm = new AintiVirusEVM(
          config.evm.factoryAddress,
          config.evm.tokenAddress,
          signer || provider
        );
      } catch (error) {
        throw new Error(`Failed to initialize EVM SDK: ${error}`);
      }
    }

    if (config.solana) {
      // Import Solana dependencies dynamically
      try {
        const { Connection } = require("@solana/web3.js");

        const connection =
          config.solana.connection ||
          (config.solana.rpcUrl ? new Connection(config.solana.rpcUrl) : null);

        if (!connection) {
          throw new Error("Solana connection or rpcUrl required");
        }

        // Note: Wallet must be provided when creating AintiVirusSolana instance
        // This unified SDK class is mainly for convenience - use individual SDKs directly for better control
        throw new Error(
          "Solana SDK should be initialized directly. Use AintiVirusSolana class."
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Solana SDK should be initialized")
        ) {
          throw error;
        }
        throw new Error(`Failed to initialize Solana SDK: ${error}`);
      }
    }
  }

  /**
   * Set Solana wallet (required for Solana transactions)
   */
  setSolanaWallet(wallet: any) {
    if (!this.solana) {
      throw new Error("Solana SDK not initialized");
    }
    // Note: This would require modifying AintiVirusSolana to accept wallet updates
    // For now, wallet should be provided during initialization
  }
}

// Default export
export default AintiVirusSDK;
