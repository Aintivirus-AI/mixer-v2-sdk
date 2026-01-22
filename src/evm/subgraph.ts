// Backwards-compatible entrypoint: keep `src/evm/subgraph.ts` but move the
// implementation into `src/evm/subgraph/*` to avoid a single huge file.
export * from "./subgraph";

