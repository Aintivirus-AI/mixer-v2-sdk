/**
 * Hook for admin operations (EVM only).
 * Admin operations require OPERATOR_ROLE or DEFAULT_ADMIN_ROLE on the factory.
 * Partner operations require OPERATOR_ROLE; setMyExtraFee can be called by registered partners.
 * Must be used inside MixerProviderWithWagmi.
 */

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { useMixer } from "./context";
import type { TransactionResult } from "../types";

export interface UseAdminReturn {
  /** Set fee rate in basis points (e.g., 250 for 0.25%) */
  setFeeRate: (feeRate: bigint) => Promise<TransactionResult>;
  /** Set staking season period for the next season (duration in seconds) */
  setStakingSeasonPeriod: (duration: bigint) => Promise<TransactionResult>;
  /** Start a new stake season */
  startStakeSeason: () => Promise<TransactionResult>;
  /** Set fee collector (requires DEFAULT_ADMIN_ROLE) */
  setFeeCollector: (feeCollector: string) => Promise<TransactionResult>;
  /** Set reward pool share in basis points (e.g., 5000 = 50%), max 10000 */
  setRewardPoolShareBps: (bps: bigint) => Promise<TransactionResult>;
  /** Add partner and set their extra fee */
  addPartner: (partner: string, extraFee: bigint) => Promise<TransactionResult>;
  /** Alias for addPartner (backward compat) */
  addWhiteLabelPartner: (partner: string, extraFee: bigint) => Promise<TransactionResult>;
  /** Update a registered partner's extra fee */
  setPartnerExtraFee: (partner: string, extraFee: bigint) => Promise<TransactionResult>;
  /** Partner sets their own extra fee (caller must be registered) */
  setMyExtraFee: (extraFee: bigint) => Promise<TransactionResult>;
  /** Remove a partner */
  removePartner: (partner: string) => Promise<TransactionResult>;
  /** Alias for removePartner (backward compat) */
  removeWhiteLabelPartner: (partner: string) => Promise<TransactionResult>;
  /** Get fee collector address */
  getFeeCollector: () => Promise<string>;
  /** Get reward pool share in basis points */
  getRewardPoolShareBps: () => Promise<bigint>;
  /** Get payment contract address */
  getPaymentAddress: () => Promise<string>;
  /** Set payment contract (OPERATOR_ROLE) */
  setPayment: (paymentAddress: string) => Promise<TransactionResult>;
  /** Enable/disable gift card withdrawals for a mixer (OPERATOR_ROLE) */
  setMixerGiftCardEnabled: (asset: string, amount: bigint, enabled: boolean) => Promise<TransactionResult>;
  /** Check if address is a registered partner */
  isPartner: (partner: string) => Promise<boolean>;
  /** Alias for isPartner (backward compat) */
  isWhiteLabelPartner: (partner: string) => Promise<boolean>;
  /** Get partner extra fee in basis points */
  getPartnersFee: (partner: string) => Promise<bigint>;
  /** Alias for getPartnersFee (backward compat) */
  getPartnerExtraFee: (partner: string) => Promise<bigint>;
  /** True when connected on a supported EVM chain */
  isReady: boolean;
  isEVMReady: boolean;
}

/**
 * Admin hook. Must be used inside MixerProviderWithWagmi.
 */
export function useAdmin(): UseAdminReturn {
  const mixer = useMixer();
  const { isConnected: evmConnected } = useAccount();

  const evmSDK = mixer?.getActiveEVM?.() ?? null;
  const chainId = mixer?.chainId;
  const evmChainIds = mixer?.evmChainIds ?? [];
  const isSupportedEVMChain =
    chainId != null && evmChainIds.length > 0 && evmChainIds.includes(chainId);
  const isEVMReady = !!evmSDK && evmConnected && isSupportedEVMChain;
  const isReady = isEVMReady;

  const throwIfNotReady = useCallback(() => {
    if (!isEVMReady || !evmSDK) {
      throw new Error("No active chain. Connect wallet on a supported EVM chain.");
    }
  }, [isEVMReady, evmSDK]);

  const setFeeRate = useCallback(
    async (feeRate: bigint) => {
      throwIfNotReady();
      return evmSDK!.setFeeRate(feeRate);
    },
    [evmSDK, throwIfNotReady]
  );

  const setStakingSeasonPeriod = useCallback(
    async (duration: bigint) => {
      throwIfNotReady();
      return evmSDK!.updateNextSeasonDuration(duration);
    },
    [evmSDK, throwIfNotReady]
  );

  const startStakeSeason = useCallback(
    async () => {
      throwIfNotReady();
      return evmSDK!.startStakeSeason();
    },
    [evmSDK, throwIfNotReady]
  );

  const setFeeCollector = useCallback(
    async (feeCollector: string) => {
      throwIfNotReady();
      return evmSDK!.setFeeCollector(feeCollector);
    },
    [evmSDK, throwIfNotReady]
  );

  const setRewardPoolShareBps = useCallback(
    async (bps: bigint) => {
      throwIfNotReady();
      return evmSDK!.setRewardPoolShareBps(bps);
    },
    [evmSDK, throwIfNotReady]
  );

  const addPartner = useCallback(
    async (partner: string, extraFee: bigint) => {
      throwIfNotReady();
      return evmSDK!.addPartner(partner, extraFee);
    },
    [evmSDK, throwIfNotReady]
  );

  const addWhiteLabelPartner = addPartner;

  const setPartnerExtraFee = useCallback(
    async (partner: string, extraFee: bigint) => {
      throwIfNotReady();
      return evmSDK!.setPartnerExtraFee(partner, extraFee);
    },
    [evmSDK, throwIfNotReady]
  );

  const setMyExtraFee = useCallback(
    async (extraFee: bigint) => {
      throwIfNotReady();
      return evmSDK!.setMyExtraFee(extraFee);
    },
    [evmSDK, throwIfNotReady]
  );

  const removePartner = useCallback(
    async (partner: string) => {
      throwIfNotReady();
      return evmSDK!.removePartner(partner);
    },
    [evmSDK, throwIfNotReady]
  );

  const removeWhiteLabelPartner = removePartner;

  const getFeeCollector = useCallback(
    async () => {
      throwIfNotReady();
      return evmSDK!.getFeeCollector();
    },
    [evmSDK, throwIfNotReady]
  );

  const getRewardPoolShareBps = useCallback(
    async () => {
      throwIfNotReady();
      return evmSDK!.getRewardPoolShareBps();
    },
    [evmSDK, throwIfNotReady]
  );

  const getPaymentAddress = useCallback(
    async () => {
      throwIfNotReady();
      return evmSDK!.getPaymentAddress();
    },
    [evmSDK, throwIfNotReady]
  );

  const setPayment = useCallback(
    async (paymentAddress: string) => {
      throwIfNotReady();
      return evmSDK!.setPayment(paymentAddress);
    },
    [evmSDK, throwIfNotReady]
  );

  const setMixerGiftCardEnabled = useCallback(
    async (asset: string, amount: bigint, enabled: boolean) => {
      throwIfNotReady();
      return evmSDK!.setMixerGiftCardEnabled(asset, amount, enabled);
    },
    [evmSDK, throwIfNotReady]
  );

  const isPartner = useCallback(
    async (partner: string) => {
      throwIfNotReady();
      return evmSDK!.isPartner(partner);
    },
    [evmSDK, throwIfNotReady]
  );

  const isWhiteLabelPartner = isPartner;

  const getPartnersFee = useCallback(
    async (partner: string) => {
      throwIfNotReady();
      return evmSDK!.getPartnersFee(partner);
    },
    [evmSDK, throwIfNotReady]
  );

  const getPartnerExtraFee = getPartnersFee;

  return {
    setFeeRate,
    setStakingSeasonPeriod,
    startStakeSeason,
    setFeeCollector,
    setRewardPoolShareBps,
    addPartner,
    addWhiteLabelPartner,
    setPartnerExtraFee,
    setMyExtraFee,
    removePartner,
    removeWhiteLabelPartner,
    getFeeCollector,
    getRewardPoolShareBps,
    getPaymentAddress,
    setPayment,
    setMixerGiftCardEnabled,
    isPartner,
    isWhiteLabelPartner,
    getPartnersFee,
    getPartnerExtraFee,
    isReady,
    isEVMReady,
  };
}
