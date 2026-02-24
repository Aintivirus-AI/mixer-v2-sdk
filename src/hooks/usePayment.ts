/**
 * Hook for payment operations (EVM only).
 * Pay with recipient, get payment records, check allowed tokens.
 * Must be used inside MixerProviderWithWagmi.
 */

import { useCallback } from "react";
import { useEVMReady } from "./useEVMReady";
import type { TransactionResult } from "../types";

export interface PaymentRecord {
  orderId: string;
  buyer: string;
  token: string;
  amount: bigint;
  paidAt: bigint;
}

export interface UsePaymentReturn {
  /** Process payment via payment contract (ERC20, including WETH). Caller must approve payment contract. */
  payWithRecipient: (
    orderId: string,
    token: string,
    buyer: string,
    amount: bigint
  ) => Promise<TransactionResult>;
  /** Pay with native ETH via WETH Gateway (wrap → pay). Amount in wei. */
  payWithRecipientViaGateway: (
    orderId: string,
    buyer: string,
    amountWei: bigint
  ) => Promise<TransactionResult>;
  /** Get payment contract address (from factory). */
  getPaymentAddress: () => Promise<string>;
  /** Get a single payment by order ID. */
  getPayment: (orderId: string) => Promise<PaymentRecord>;
  /** Get all payment records for a user (buyer). */
  getPaymentDetailsOf: (user: string) => Promise<PaymentRecord[]>;
  /** Check if token is allowed for payments. */
  isAllowedToken: (token: string) => Promise<boolean>;
  /** Get payment contract treasury address. */
  getPaymentTreasury: () => Promise<string>;
  /** Add or remove token from allowed list (DEFAULT_ADMIN_ROLE on payment contract). */
  updateAllowedToken: (token: string, allowed: boolean) => Promise<TransactionResult>;
  isReady: boolean;
  isEVMReady: boolean;
}

/**
 * Payment hook. Must be used inside MixerProviderWithWagmi.
 */
export function usePayment(): UsePaymentReturn {
  const { evmSDK, isEVMReady, isReady } = useEVMReady();

  const payWithRecipient = useCallback(
    async (
      orderId: string,
      token: string,
      buyer: string,
      amount: bigint
    ): Promise<TransactionResult> => {
      if (!evmSDK) throw new Error("No active chain. Connect wallet on a supported EVM chain.");
      return evmSDK.payWithRecipient(orderId, token, buyer, amount);
    },
    [evmSDK]
  );

  const payWithRecipientViaGateway = useCallback(
    async (
      orderId: string,
      buyer: string,
      amountWei: bigint
    ): Promise<TransactionResult> => {
      if (!evmSDK) throw new Error("No active chain. Connect wallet on a supported EVM chain.");
      return evmSDK.payWithRecipientViaGateway(orderId, buyer, amountWei);
    },
    [evmSDK]
  );

  const getPaymentAddress = useCallback(async (): Promise<string> => {
    if (!evmSDK) return "0x0000000000000000000000000000000000000000";
    return evmSDK.getPaymentAddress();
  }, [evmSDK]);

  const getPayment = useCallback(
    async (orderId: string): Promise<PaymentRecord> => {
      if (!evmSDK) {
        return {
          orderId: "0x" + "0".repeat(64),
          buyer: "0x0000000000000000000000000000000000000000",
          token: "0x0000000000000000000000000000000000000000",
          amount: 0n,
          paidAt: 0n,
        };
      }
      return evmSDK.getPayment(orderId);
    },
    [evmSDK]
  );

  const getPaymentDetailsOf = useCallback(
    async (user: string): Promise<PaymentRecord[]> => {
      if (!evmSDK) return [];
      return evmSDK.getPaymentDetailsOf(user);
    },
    [evmSDK]
  );

  const isAllowedToken = useCallback(
    async (token: string): Promise<boolean> => {
      if (!evmSDK) return false;
      return evmSDK.isAllowedToken(token);
    },
    [evmSDK]
  );

  const getPaymentTreasury = useCallback(async (): Promise<string> => {
    if (!evmSDK) return "0x0000000000000000000000000000000000000000";
    return evmSDK.getPaymentTreasury();
  }, [evmSDK]);

  const updateAllowedToken = useCallback(
    async (token: string, allowed: boolean): Promise<TransactionResult> => {
      if (!evmSDK) throw new Error("No active chain. Connect wallet on a supported EVM chain.");
      return evmSDK.updateAllowedToken(token, allowed);
    },
    [evmSDK]
  );

  return {
    payWithRecipient,
    payWithRecipientViaGateway,
    getPaymentAddress,
    getPayment,
    getPaymentDetailsOf,
    isAllowedToken,
    getPaymentTreasury,
    updateAllowedToken,
    isReady,
    isEVMReady,
  };
}
