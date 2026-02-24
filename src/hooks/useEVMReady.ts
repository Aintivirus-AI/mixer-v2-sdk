/**
 * Shared hook for EVM-ready state and optional subgraph.
 * Use in useDeposit, useWithdraw, useWithdrawByGiftCard, useAdmin, usePayment, useDeploy to avoid duplicated boilerplate.
 */

import { useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { useMixer, useMixerConfig } from "./context";
import { AintiVirusEVMSubgraph } from "../evm/subgraph";
import type { EvmChainConfig } from "../types";

export interface UseEVMReadyReturn {
  evmSDK: import("../evm").AintiVirusEVM | null;
  evmChainConfig: EvmChainConfig | undefined;
  subgraphUrl: string | undefined;
  subgraph: AintiVirusEVMSubgraph | null;
  isEVMReady: boolean;
  isReady: boolean;
}

/**
 * Returns EVM SDK, chain config, optional subgraph client, and ready flags.
 * Must be used inside MixerProviderWithWagmi.
 */
export function useEVMReady(): UseEVMReadyReturn {
  const mixer = useMixer();
  const chainId = useChainId();
  const { isConnected: evmConnected } = useAccount();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();

  const evmSDK = mixer?.getActiveEVM?.() ?? null;
  const evmChainConfig =
    chainId != null ? getEvmChainConfig(chainId) : undefined;
  const subgraphUrl = evmChainConfig?.subgraphUrl;

  const subgraph = useMemo(() => {
    if (!subgraphUrl) return null;
    return new AintiVirusEVMSubgraph({ endpoint: subgraphUrl });
  }, [subgraphUrl]);

  const isSupportedEVMChain =
    chainId != null &&
    evmChainIds.length > 0 &&
    evmChainIds.includes(chainId);
  const isEVMReady =
    !!evmSDK && evmConnected && isSupportedEVMChain;
  const isReady = isEVMReady;

  return {
    evmSDK,
    evmChainConfig,
    subgraphUrl,
    subgraph,
    isEVMReady,
    isReady,
  };
}
