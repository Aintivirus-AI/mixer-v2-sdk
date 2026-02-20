/**
 * React hooks for AintiVirus Mixer SDK (EVM only for now).
 * All hooks must be used inside MixerProviderWithWagmi. SDK instances and config come from the Provider.
 * Solana integration disabled – SolanaConnectionOptions commented out in context.
 */

export {
  MixerProviderWithWagmi,
  MixerProviderWithWagmi as MixerProvider,
  useMixerConfig,
  useMixer,
} from "./context";
export type { MixerContextValue } from "./context";
// export type { SolanaConnectionOptions } from "./context"; // Reserved for future Solana

export { useDeploy } from "./useDeploy";
export type { UseDeployReturn } from "./useDeploy";

export { useDeposit } from "./useDeposit";
export type { UseDepositReturn, DepositResult } from "./useDeposit";

export { useWithdraw } from "./useWithdraw";
export type { UseWithdrawReturn, WithdrawParams } from "./useWithdraw";

export { useAdmin } from "./useAdmin";
export type { UseAdminReturn } from "./useAdmin";

export { usePayment } from "./usePayment";
export type { UsePaymentReturn, PaymentRecord } from "./usePayment";

export { ChainType, AssetMode } from "../types";
export type { EVMHookConfig } from "../types";
// export type { SolanaHookConfig } from "../types"; // Solana integration disabled
