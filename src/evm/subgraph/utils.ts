import type { AssetMode, GraphFetch, SubgraphMode } from "./types";

export function requireFetch(customFetch?: GraphFetch): GraphFetch {
  const f = customFetch ?? (globalThis as any).fetch;
  if (!f) {
    throw new Error(
      "No fetch() available. Provide config.fetch (or use Node.js >= 18)."
    );
  }
  return f.bind(globalThis);
}

export function toSubgraphMode(mode: AssetMode): SubgraphMode {
  // AssetMode.ETH = 0, AssetMode.TOKEN = 1
  return mode === 0 ? "ETH" : "AINTI";
}

export function asBigint(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  throw new Error(`Expected BigInt-like value, got: ${String(value)}`);
}

