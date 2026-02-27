import { mainnet, sepolia } from "viem/chains";

export const FACTORY_ADDRESS =
  import.meta.env.VITE_FACTORY_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

export const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;

/** WETH and WETHGateway (for native ETH deposits/stakes; Factory is ERC20-only) */
export const WETH_ADDRESS = import.meta.env.VITE_WETH_ADDRESS;
export const WETH_GATEWAY_ADDRESS = import.meta.env.VITE_WETH_GATEWAY_ADDRESS;

/** Single-chain EVM config for use with useDeploy(config) when not using MixerProvider. */
export const evmConfig = {
  factoryAddress: FACTORY_ADDRESS,
  ...(TOKEN_ADDRESS ? { tokenAddress: TOKEN_ADDRESS } : {}),
};

const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL as string | undefined;
const SUBGRAPH_API_KEY = import.meta.env.VITE_SUBGRAPH_API_KEY as string | undefined;

/** Full SDK config for MixerProviderWithWagmi (one place, hooks use context). */
export const mixerSdkConfig = {
  chains: {
    evm: {
      [sepolia.id]: {
        factoryAddress: FACTORY_ADDRESS,
        ...(TOKEN_ADDRESS ? { tokenAddress: TOKEN_ADDRESS } : {}),
        ...(WETH_ADDRESS ? { wethAddress: WETH_ADDRESS } : {}),
        ...(WETH_GATEWAY_ADDRESS ? { wethGatewayAddress: WETH_GATEWAY_ADDRESS } : {}),
        ...(SUBGRAPH_URL ? { subgraphUrl: SUBGRAPH_URL } : {}),
        ...(SUBGRAPH_API_KEY ? { subgraphApiKey: SUBGRAPH_API_KEY } : {}),
      },
      [mainnet.id]: {
        factoryAddress: import.meta.env.VITE_MAINNET_FACTORY_ADDRESS ?? FACTORY_ADDRESS,
        ...(TOKEN_ADDRESS ? { tokenAddress: TOKEN_ADDRESS } : {}),
        ...(WETH_ADDRESS ? { wethAddress: WETH_ADDRESS } : {}),
        ...(WETH_GATEWAY_ADDRESS ? { wethGatewayAddress: WETH_GATEWAY_ADDRESS } : {}),
        ...(import.meta.env.VITE_MAINNET_SUBGRAPH_URL
          ? { subgraphUrl: import.meta.env.VITE_MAINNET_SUBGRAPH_URL }
          : {}),
        ...(import.meta.env.VITE_MAINNET_SUBGRAPH_API_KEY
          ? { subgraphApiKey: import.meta.env.VITE_MAINNET_SUBGRAPH_API_KEY }
          : {}),
      },
    },
    solana: {},
  },
};
