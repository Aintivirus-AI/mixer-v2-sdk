/** Local copies of SDK enums to avoid CJS re-export issues with Vite. */
export const ChainType = { EVM: "EVM", SOLANA: "SOLANA" } as const;
export const AssetMode = { ETH: 0, TOKEN: 1 } as const;
