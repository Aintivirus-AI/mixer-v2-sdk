/**
 * Config normalization and chain resolution for multi-chain (EVM + Solana) and legacy single-chain.
 * Solana config is still normalized and exposed; SDK/hooks Solana integration is disabled elsewhere.
 */

import type {
  SDKConfig,
  MixerSDKConfig,
  EvmChainConfig,
  SolanaChainConfig,
} from "./types";

/** Normalized config: always has chains.evm and chains.solana as records */
export interface NormalizedMixerConfig {
  chains: {
    evm: Record<number, EvmChainConfig>;
    solana: Record<string, SolanaChainConfig>;
  };
  useMulticall?: boolean;
}

const DEFAULT_EVM_CHAIN_ID = 1;
const DEFAULT_SOLANA_NETWORK = "mainnet";

/**
 * Normalize SDK config to canonical shape (chains.evm / chains.solana).
 * Legacy flat evm/solana are converted to single-entry chains so one code path handles both.
 */
export function normalizeConfig(config: SDKConfig | MixerSDKConfig): NormalizedMixerConfig {
  const hasChains = "chains" in config && config.chains != null;
  const evmRecord: Record<number, EvmChainConfig> = hasChains && config.chains?.evm
    ? { ...config.chains.evm }
    : {};
  const solanaRecord: Record<string, SolanaChainConfig> = hasChains && config.chains?.solana
    ? { ...config.chains.solana }
    : {};

  if (!hasChains || Object.keys(evmRecord).length === 0) {
    const legacy = config as SDKConfig;
    if (legacy.evm) {
      evmRecord[DEFAULT_EVM_CHAIN_ID] = {
        factoryAddress: legacy.evm.factoryAddress,
        tokenAddress: legacy.evm.tokenAddress,
        wethAddress: legacy.evm.wethAddress,
        wethGatewayAddress: legacy.evm.wethGatewayAddress,
        rpcUrl: legacy.evm.rpcUrl,
      };
    }
  }
  if (!hasChains || Object.keys(solanaRecord).length === 0) {
    const legacy = config as SDKConfig;
    if (legacy.solana) {
      solanaRecord[DEFAULT_SOLANA_NETWORK] = {
        factoryProgramId: legacy.solana.factoryProgramId,
        mixerProgramId: legacy.solana.mixerProgramId,
        stakingProgramId: legacy.solana.stakingProgramId,
        tokenMint: legacy.solana.tokenMint,
        rpcUrl: legacy.solana.rpcUrl,
      };
    }
  }

  return {
    chains: { evm: evmRecord, solana: solanaRecord },
    useMulticall: "useMulticall" in config ? config.useMulticall : undefined,
  };
}

/**
 * Get EVM chain config for the given chainId.
 * For legacy single-chain config, returns the single evm config for any chainId.
 */
export function getEvmChainConfig(
  config: SDKConfig | MixerSDKConfig | NormalizedMixerConfig,
  chainId: number
): EvmChainConfig | undefined {
  const normalized = "chains" in config && config.chains ? (config as NormalizedMixerConfig) : normalizeConfig(config as SDKConfig);
  const evm = normalized.chains?.evm?.[chainId];
  if (evm) return evm;
  const legacy = config as SDKConfig;
  if (legacy.evm) return legacy.evm as EvmChainConfig;
  return undefined;
}

/**
 * Get Solana chain config for the given network id (e.g. "mainnet", "devnet").
 * For legacy single-chain config, returns the single solana config for any network.
 */
export function getSolanaChainConfig(
  config: SDKConfig | MixerSDKConfig | NormalizedMixerConfig,
  network: string
): SolanaChainConfig | undefined {
  const normalized = "chains" in config && config.chains ? (config as NormalizedMixerConfig) : normalizeConfig(config as SDKConfig);
  const solana = normalized.chains?.solana?.[network];
  if (solana) return solana;
  const legacy = config as SDKConfig;
  if (legacy.solana) return legacy.solana as SolanaChainConfig;
  return undefined;
}

/**
 * Return all EVM chain IDs present in the config.
 */
export function getEvmChainIds(config: NormalizedMixerConfig): number[] {
  return Object.keys(config.chains?.evm ?? {}).map(Number);
}

/**
 * Return all Solana network ids present in the config.
 */
export function getSolanaNetworks(config: NormalizedMixerConfig): string[] {
  return Object.keys(config.chains?.solana ?? {});
}
