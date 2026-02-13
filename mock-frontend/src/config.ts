import { mainnet, sepolia } from "viem/chains";

export const FACTORY_ADDRESS =
  import.meta.env.VITE_FACTORY_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

export const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;

/** Single-chain EVM config for use with useDeploy(config) when not using MixerProvider. */
export const evmConfig = {
  factoryAddress: FACTORY_ADDRESS,
  ...(TOKEN_ADDRESS ? { tokenAddress: TOKEN_ADDRESS } : {}),
};

const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL as string | undefined;

/** Full SDK config for MixerProviderWithWagmi (one place, hooks use context). */
export const mixerSdkConfig = {
  chains: {
    evm: {
      [sepolia.id]: {
        factoryAddress: FACTORY_ADDRESS,
        ...(TOKEN_ADDRESS ? { tokenAddress: TOKEN_ADDRESS } : {}),
        ...(SUBGRAPH_URL ? { subgraphUrl: SUBGRAPH_URL } : {}),
      },
      [mainnet.id]: {
        factoryAddress: import.meta.env.VITE_MAINNET_FACTORY_ADDRESS ?? FACTORY_ADDRESS,
        ...(TOKEN_ADDRESS ? { tokenAddress: TOKEN_ADDRESS } : {}),
        ...(import.meta.env.VITE_MAINNET_SUBGRAPH_URL
          ? { subgraphUrl: import.meta.env.VITE_MAINNET_SUBGRAPH_URL }
          : {}),
      },
    },
    solana: {},
  },
} as const;
