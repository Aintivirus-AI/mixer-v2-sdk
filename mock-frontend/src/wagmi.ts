import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { mainnet, sepolia } from "viem/chains";

const sepoliaRpc = import.meta.env.VITE_RPC_URL || "https://rpc.sepolia.org";
const mainnetRpc = import.meta.env.VITE_MAINNET_RPC_URL || "https://eth.llamarpc.com";

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(mainnetRpc),
    [sepolia.id]: http(sepoliaRpc),
  },
});
