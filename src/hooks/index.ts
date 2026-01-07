/**
 * React hooks for AintiVirus Mixer SDK
 * Optimized for Next.js integration with EVM and Solana support
 *
 * Use individual hooks for better code splitting:
 * - useDeposit: Only for deposits
 * - useStake: Only for staking/unstaking
 * - useClaim: Only for claiming rewards
 * - useWithdraw: Only for withdrawals
 * - useAintiVirus: All-in-one hook (if you need everything)
 */

// Individual hooks (recommended for code splitting)
export { useDeposit } from "./useDeposit";
export type { DepositHookConfig, UseDepositReturn } from "./useDeposit";

export { useStake } from "./useStake";
export type { StakeHookConfig, UseStakeReturn } from "./useStake";

export { useClaim } from "./useClaim";
export type { ClaimHookConfig, UseClaimReturn } from "./useClaim";

export { useWithdraw } from "./useWithdraw";
export type { WithdrawHookConfig, UseWithdrawReturn } from "./useWithdraw";

export { useView } from "./useView";
export type { ViewHookConfig, UseViewReturn } from "./useView";

export { useDeploy } from "./useDeploy";
export type { DeployHookConfig, UseDeployReturn } from "./useDeploy";

export { useAdmin } from "./useAdmin";
export type { AdminHookConfig, UseAdminReturn } from "./useAdmin";

// Unified hook (supports both EVM and Solana - use if you need all functions)
export { useAintiVirus } from "./useAintiVirus";
export type { UnifiedHookConfig, UseAintiVirusReturn } from "./useAintiVirus";

// Re-export types
export { ChainType, AssetMode } from "../types";
export type { EVMHookConfig, SolanaHookConfig } from "../types";
