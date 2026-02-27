/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FACTORY_ADDRESS: string;
  readonly VITE_TOKEN_ADDRESS?: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_SUBGRAPH_URL?: string;
  readonly VITE_SUBGRAPH_API_KEY?: string;
  readonly VITE_MAINNET_SUBGRAPH_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
