/**
 * React context for multi-chain SDK (EVM only for now).
 * Wrap the app with MixerProvider and pass the settings JSON; hooks read config and SDK from context.
 * Solana: config/types still present; wallet/connection integration in hooks is disabled.
 */

import React, { createContext, useMemo, useContext } from "react";
import type { MixerSDKConfig, SDKConfig, EvmChainConfig, SolanaChainConfig } from "../types";
import { normalizeConfig, getEvmChainConfig, getSolanaChainConfig, getEvmChainIds, getSolanaNetworks } from "../config";
import type { NormalizedMixerConfig } from "../config";
import { createMixerSDK } from "../createSDK";
import type { MixerSDKInstance } from "../createSDK";
import { useChainId, useWalletClient, usePublicClient } from "wagmi";
import { createEthersProviderFromViem, createEthersSignerFromViem } from "./utils";
import type { AintiVirusEVM } from "../evm";
// import type { AintiVirusSolana } from "../solana"; // Solana integration disabled

export interface MixerContextValue {
  config: NormalizedMixerConfig;
  sdkInstance: MixerSDKInstance;
  /** Current EVM chainId from wagmi (undefined if not connected or not EVM) */
  chainId: number | undefined;
  /** Get EVM SDK for current chain (requires wallet connection); null if no config for chainId or no signer */
  getActiveEVM: () => AintiVirusEVM | null;
  /** Get EVM config for a chainId */
  getEvmChainConfig: (chainId: number) => EvmChainConfig | undefined;
  /** Get Solana config for a network (config only; Solana SDK integration disabled) */
  getSolanaChainConfig: (network: string) => SolanaChainConfig | undefined;
  evmChainIds: number[];
  /** Solana network ids from config; Solana SDK integration disabled */
  solanaNetworks: string[];
}

const MixerContext = createContext<MixerContextValue | null>(null);

export interface MixerProviderProps {
  /** Settings config (full MixerSDKConfig or legacy SDKConfig). In production, pass settings JSON. */
  config: MixerSDKConfig | SDKConfig;
  children: React.ReactNode;
}

/**
 * Provider for multi-chain SDK. Pass the settings object/JSON once; hooks get config and SDK from context.
 * App must wrap with WagmiProvider (with all 5 EVM chains) so useChainId() works.
 */
export function MixerProvider({ config, children }: MixerProviderProps) {
  const value = useMemo(() => {
    const normalized = normalizeConfig(config);
    const sdkInstance = createMixerSDK(config);
    const evmChainIds = getEvmChainIds(normalized);
    const solanaNetworks = getSolanaNetworks(normalized);
    return {
      config: normalized,
      sdkInstance,
      chainId: undefined as number | undefined,
      getActiveEVM: (): AintiVirusEVM | null => null,
      getEvmChainConfig: (chainId: number) => getEvmChainConfig(normalized, chainId),
      getSolanaChainConfig: (network: string) => getSolanaChainConfig(normalized, network),
      evmChainIds,
      solanaNetworks,
    };
  }, [config]);

  return (
    <MixerContext.Provider value={value}>
      {children}
    </MixerContext.Provider>
  );
}

/**
 * Internal provider that injects chainId and getActiveEVM (depends on wagmi).
 * MixerProvider cannot use wagmi hooks (must be inside WagmiProvider), so we use a wrapper that reads chainId/signer and updates context.
 */
function MixerContextInjector({ value, children }: { value: MixerContextValue; children: React.ReactNode }) {
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const resolvedValue = useMemo((): MixerContextValue => {
    const getActiveEVM = (): AintiVirusEVM | null => {
      if (chainId == null || !value.sdkInstance) return null;
      if (!publicClient) return null;
      if (!walletClient?.account?.address) return null;
      try {
        const provider = createEthersProviderFromViem(publicClient);
        const signer = createEthersSignerFromViem(walletClient, publicClient);
        if (!signer?.provider) return null;
        return value.sdkInstance.getEVM(chainId, signer);
      } catch {
        return null;
      }
    };
    return { ...value, chainId, getActiveEVM };
  }, [value, chainId, walletClient, publicClient]);

  return (
    <MixerContext.Provider value={resolvedValue}>
      {children}
    </MixerContext.Provider>
  );
}

/**
 * MixerProvider that must be used inside WagmiProvider so active chain and signer are available.
 * Pass settings config once; hooks use useMixer() / useMixerConfig() to get SDK and config.
 */
export function MixerProviderWithWagmi({ config, children }: MixerProviderProps) {
  const baseValue = useMemo(() => {
    const normalized = normalizeConfig(config);
    const sdkInstance = createMixerSDK(config);
    return {
      config: normalized,
      sdkInstance,
      chainId: undefined as number | undefined,
      getActiveEVM: (): AintiVirusEVM | null => null,
      getEvmChainConfig: (chainId: number) => getEvmChainConfig(normalized, chainId),
      getSolanaChainConfig: (network: string) => getSolanaChainConfig(normalized, network),
      evmChainIds: getEvmChainIds(normalized),
      solanaNetworks: getSolanaNetworks(normalized),
    };
  }, [config]);

  return (
    <MixerContextInjector value={baseValue}>
      {children}
    </MixerContextInjector>
  );
}

export function useMixerConfig(): NormalizedMixerConfig & {
  getEvmChainConfig: (chainId: number) => EvmChainConfig | undefined;
  getSolanaChainConfig: (network: string) => SolanaChainConfig | undefined;
  evmChainIds: number[];
  solanaNetworks: string[];
} {
  const ctx = useContext(MixerContext);
  if (!ctx) {
    return {
      chains: { evm: {}, solana: {} },
      getEvmChainConfig: () => undefined,
      getSolanaChainConfig: () => undefined,
      evmChainIds: [],
      solanaNetworks: [],
    };
  }
  return {
    ...ctx.config,
    getEvmChainConfig: ctx.getEvmChainConfig,
    getSolanaChainConfig: ctx.getSolanaChainConfig,
    evmChainIds: ctx.evmChainIds,
    solanaNetworks: ctx.solanaNetworks,
  };
}

export function useMixer(): MixerContextValue | null {
  return useContext(MixerContext);
}

/** Reserved for future Solana support – optional wallet + connection for hooks */
// export interface SolanaConnectionOptions {
//   solanaWallet?: import("@coral-xyz/anchor").Wallet;
//   solanaConnection?: import("@solana/web3.js").Connection;
//   solanaNetwork?: string;
// }
