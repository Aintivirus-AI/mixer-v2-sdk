// Backwards-compatible entrypoint.
//
// IMPORTANT:
// This file intentionally co-exists with the `./subgraph/` directory.
// Always re-export using an explicit path like `./subgraph/client` or
// `./subgraph/index` to avoid Node resolving `./subgraph` back to this file
// (which would create a circular import and result in missing exports).

export { AintiVirusEVMSubgraph } from "./subgraph/client";
export * from "./subgraph/types";

