import { Address } from "@graphprotocol/graph-ts"

/**
 * Single place for all subgraph settings.
 * Keep in sync with networks.json for contract/network-specific addresses.
 */

// --- Payment (WETH = native ETH via gateway) ---
// Sepolia WETH – when paymentToken equals this, user paid with ETH via WETHGateway
export const WETH_ADDRESS = Address.fromString(
  "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"
)
