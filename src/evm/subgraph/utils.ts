import type { AssetMode, GraphFetch } from "./types";

/** Factory.ETH_ADDRESS - used for pool id when asset is native ETH */
export const ETH_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export function requireFetch(customFetch?: GraphFetch): GraphFetch {
  const f = customFetch ?? (globalThis as any).fetch;
  if (!f) {
    throw new Error(
      "No fetch() available. Provide config.fetch (or use Node.js >= 18)."
    );
  }
  return f.bind(globalThis);
}

/** Normalize address to lowercase for stable pool id (subgraph uses hex addresses). */
export function normalizeAsset(asset: string): string {
  return asset.toLowerCase().startsWith("0x") ? asset.toLowerCase() : asset;
}

/** Pool id format in subgraph: <asset>-<amount> */
export function getPoolId(asset: string, amount: bigint): string {
  return `${normalizeAsset(asset)}-${amount.toString()}`;
}

/** Resolve asset address from AssetMode. For TOKEN (1), tokenAddress is required. */
export function assetFromMode(
  mode: AssetMode,
  tokenAddress?: string
): string {
  if (mode === 0) return ETH_ADDRESS;
  if (mode === 1 && tokenAddress) return normalizeAsset(tokenAddress);
  throw new Error(
    "assetFromMode: TOKEN mode requires tokenAddress (asset contract address)"
  );
}

export function asBigint(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  throw new Error(`Expected BigInt-like value, got: ${String(value)}`);
}
