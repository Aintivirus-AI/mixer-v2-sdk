import { useState, useEffect, useMemo } from "react";
import {
  useAdmin,
  useMixerConfig,
  AintiVirusEVMSubgraph,
} from "@aintivirus-ai/mixer-sdk";
import type { MixerPool } from "@aintivirus-ai/mixer-sdk";
import { formatEther } from "ethers";
import { useChainId, useAccount } from "wagmi";

const EXPLORER_TX = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`;

function formatAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function poolOptionLabel(pool: MixerPool, wethAddress?: string): string {
  const isEth = wethAddress
    ? pool.asset.toLowerCase() === wethAddress.toLowerCase()
    : false;
  const amountStr = isEth
    ? `${formatEther(pool.amount)} ETH`
    : `${pool.amount.toString()} (raw)`;
  const assetStr = isEth ? "ETH" : formatAddress(pool.asset);
  return `${assetStr} – ${amountStr}`;
}

export default function Admin() {
  const [feeRateBps, setFeeRateBps] = useState("25");
  const [seasonPeriodSec, setSeasonPeriodSec] = useState("86400");
  const [feeCollector, setFeeCollector] = useState("");
  const [rewardPoolShareBps, setRewardPoolShareBps] = useState("5000");
  const [currentFeeCollector, setCurrentFeeCollector] = useState<string | null>(
    null,
  );
  const [currentRewardPoolBps, setCurrentRewardPoolBps] = useState<
    string | null
  >(null);
  const [paymentAddress, setPaymentAddress] = useState("");
  const [currentPaymentAddress, setCurrentPaymentAddress] = useState<
    string | null
  >(null);
  const [giftCardPoolId, setGiftCardPoolId] = useState("");
  const [giftCardEnabled, setGiftCardEnabled] = useState(true);
  const [pools, setPools] = useState<MixerPool[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [isSettingFee, setIsSettingFee] = useState(false);
  const [isSettingPeriod, setIsSettingPeriod] = useState(false);
  const [isStartingSeason, setIsStartingSeason] = useState(false);
  const [isSettingFeeCollector, setIsSettingFeeCollector] = useState(false);
  const [isSettingRewardPool, setIsSettingRewardPool] = useState(false);
  const [isSettingPayment, setIsSettingPayment] = useState(false);
  const [isSettingGiftCard, setIsSettingGiftCard] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();
  const evmChainConfig =
    chainId != null ? getEvmChainConfig(chainId) : undefined;
  const subgraphUrl = evmChainConfig?.subgraphUrl;
  const subgraphApiKey = evmChainConfig?.subgraphApiKey;
  const wethAddress = evmChainConfig?.wethAddress;
  const subgraph = useMemo(() => {
    if (!subgraphUrl) return null;
    const headers = subgraphApiKey
      ? { Authorization: `Bearer ${subgraphApiKey}` }
      : undefined;
    return new AintiVirusEVMSubgraph({ endpoint: subgraphUrl, headers });
  }, [subgraphUrl, subgraphApiKey]);

  useEffect(() => {
    if (!subgraph) {
      setPools([]);
      setPoolsLoading(false);
      setPoolsError(null);
      return;
    }
    let cancelled = false;
    setPoolsLoading(true);
    setPoolsError(null);
    subgraph
      .getMixerPools({
        first: 100,
        orderBy: "deployedBlockTimestamp",
        orderDirection: "desc",
      })
      .then((data) => {
        if (!cancelled) setPools(data ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setPoolsError(
            e instanceof Error ? e.message : "Failed to load mixers",
          );
          setPools([]);
        }
      })
      .finally(() => {
        if (!cancelled) setPoolsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subgraph]);

  const {
    setFeeRate,
    setStakingSeasonPeriod,
    startStakeSeason,
    setFeeCollector: setFeeCollectorTx,
    setRewardPoolShareBps: setRewardPoolShareBpsTx,
    setPayment: setPaymentTx,
    setMixerGiftCardEnabled: setMixerGiftCardEnabledTx,
    getFeeCollector,
    getRewardPoolShareBps,
    getPaymentAddress,
    isReady,
  } = useAdmin();

  const wrongNetwork =
    isConnected &&
    chainId != null &&
    evmChainIds.length > 0 &&
    !evmChainIds.includes(chainId);

  const handleSetFeeRate = async () => {
    const bps = BigInt(feeRateBps.trim());
    if (bps < 0 || bps > 500) {
      alert("Fee rate must be 0–500 basis points (0–5%)");
      return;
    }
    if (!isReady) {
      alert("Please connect your wallet on a supported chain.");
      return;
    }
    setIsSettingFee(true);
    setLastTxHash(null);
    try {
      const result = await setFeeRate(bps);
      setLastTxHash(result.txHash);
    } catch (error: unknown) {
      console.error("setFeeRate error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingFee(false);
    }
  };

  const handleSetStakingPeriod = async () => {
    const sec = BigInt(seasonPeriodSec.trim());
    if (sec <= 0n) {
      alert("Period must be positive seconds");
      return;
    }
    if (!isReady) {
      alert("Please connect your wallet on a supported chain.");
      return;
    }
    setIsSettingPeriod(true);
    setLastTxHash(null);
    try {
      const result = await setStakingSeasonPeriod(sec);
      setLastTxHash(result.txHash);
    } catch (error: unknown) {
      console.error("setStakingSeasonPeriod error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingPeriod(false);
    }
  };

  const handleLoadCurrent = async () => {
    if (!isReady) return;
    try {
      const [collector, bps, payment] = await Promise.all([
        getFeeCollector(),
        getRewardPoolShareBps(),
        getPaymentAddress(),
      ]);
      setCurrentFeeCollector(collector);
      setCurrentRewardPoolBps(bps.toString());
      setCurrentPaymentAddress(
        payment && payment !== "0x0000000000000000000000000000000000000000"
          ? payment
          : null,
      );
    } catch (e) {
      console.error("Load current:", e);
    }
  };

  const handleSetFeeCollector = async () => {
    const addr = feeCollector.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      alert("Enter a valid 0x… address");
      return;
    }
    if (!isReady) return;
    setIsSettingFeeCollector(true);
    setLastTxHash(null);
    try {
      const result = await setFeeCollectorTx(addr);
      setLastTxHash(result.txHash);
      setCurrentFeeCollector(addr);
    } catch (error: unknown) {
      console.error("setFeeCollector error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingFeeCollector(false);
    }
  };

  const handleSetRewardPoolShare = async () => {
    const bps = BigInt(rewardPoolShareBps.trim());
    if (bps < 0 || bps > 10000) {
      alert("Reward pool share must be 0–10000 basis points (0–100%)");
      return;
    }
    if (!isReady) return;
    setIsSettingRewardPool(true);
    setLastTxHash(null);
    try {
      const result = await setRewardPoolShareBpsTx(bps);
      setLastTxHash(result.txHash);
      setCurrentRewardPoolBps(bps.toString());
    } catch (error: unknown) {
      console.error("setRewardPoolShareBps error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingRewardPool(false);
    }
  };

  const handleStartSeason = async () => {
    if (!isReady) {
      alert("Please connect your wallet on a supported chain.");
      return;
    }
    setIsStartingSeason(true);
    setLastTxHash(null);
    try {
      const result = await startStakeSeason();
      setLastTxHash(result.txHash);
    } catch (error: unknown) {
      console.error("startStakeSeason error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsStartingSeason(false);
    }
  };

  const handleSetPayment = async () => {
    const addr = paymentAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      alert("Enter a valid 0x… address");
      return;
    }
    if (!isReady) return;
    setIsSettingPayment(true);
    setLastTxHash(null);
    try {
      const result = await setPaymentTx(addr);
      setLastTxHash(result.txHash);
      setCurrentPaymentAddress(addr);
    } catch (error: unknown) {
      console.error("setPayment error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingPayment(false);
    }
  };

  const handleSetGiftCard = async () => {
    const pool = pools.find((p) => p.id === giftCardPoolId);
    if (!pool) {
      alert("Select a mixer from the list.");
      return;
    }
    if (!isReady) return;
    setIsSettingGiftCard(true);
    setLastTxHash(null);
    try {
      const result = await setMixerGiftCardEnabledTx(
        pool.asset,
        pool.amount,
        giftCardEnabled,
      );
      setLastTxHash(result.txHash);
    } catch (error: unknown) {
      console.error("setMixerGiftCardEnabled error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingGiftCard(false);
    }
  };

  if (!isReady) {
    return (
      <div
        style={{
          padding: 24,
          background: "#fef3c7",
          borderRadius: 8,
          border: "1px solid #f59e0b",
        }}
      >
        {!isConnected ? (
          <p style={{ margin: 0 }}>
            Please connect your wallet to perform admin operations. Requires
            OPERATOR_ROLE on the factory contract.
          </p>
        ) : wrongNetwork ? (
          <p style={{ margin: 0 }}>
            Please switch to a supported chain (from config).
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            Waiting for wallet connection on a supported chain.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <p style={{ color: "#aaa", margin: 0 }}>
        Admin functions require OPERATOR_ROLE or DEFAULT_ADMIN_ROLE on the
        factory.
      </p>

      {/* Load current values */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Current factory config
        </h3>
        <p
          style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}
        >
          Load and view fee collector, reward pool share, and payment contract.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={handleLoadCurrent}
            style={{
              padding: "8px 16px",
              background: "#4361ee",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            Load current values
          </button>
          {currentFeeCollector != null && (
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#aaa" }}>
              Fee collector: {currentFeeCollector.slice(0, 10)}…
              {currentFeeCollector.slice(-8)}
            </p>
          )}
          {currentRewardPoolBps != null && (
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#aaa" }}>
              Reward pool share: {currentRewardPoolBps} bps (
              {Number(currentRewardPoolBps) / 100}%)
            </p>
          )}
          {currentPaymentAddress != null && (
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#aaa" }}>
              Payment: {currentPaymentAddress.slice(0, 10)}…
              {currentPaymentAddress.slice(-8)}
            </p>
          )}
        </div>
      </section>

      {/* Set Payment */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Set Payment Contract
        </h3>
        <p
          style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}
        >
          AintiVirusPayment contract address for gift card withdrawals. Requires
          OPERATOR_ROLE.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={paymentAddress}
            onChange={(e) => setPaymentAddress(e.target.value)}
            placeholder="0x..."
            style={{
              padding: "8px 12px",
              background: "#1a1a2e",
              color: "#eee",
              border: "1px solid #444",
              borderRadius: 6,
              minWidth: 320,
              fontFamily: "monospace",
            }}
          />
          <button
            type="button"
            onClick={handleSetPayment}
            disabled={isSettingPayment}
            style={{
              padding: "8px 16px",
              background: "#4361ee",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: isSettingPayment ? "not-allowed" : "pointer",
            }}
          >
            {isSettingPayment ? "Setting…" : "Set Payment"}
          </button>
        </div>
      </section>

      {/* Gift Card per mixer */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Gift Card Withdrawals (per mixer)
        </h3>
        <p
          style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}
        >
          Enable or disable gift card withdrawals for a deployed mixer. Select a
          mixer from the list, then toggle and save. Requires OPERATOR_ROLE.
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {poolsLoading ? (
            <span style={{ color: "#aaa", fontSize: "0.875rem" }}>
              Loading mixer list…
            </span>
          ) : poolsError ? (
            <span style={{ color: "#f87171", fontSize: "0.875rem" }}>
              {poolsError}
            </span>
          ) : pools.length === 0 ? (
            <span style={{ color: "#aaa", fontSize: "0.875rem" }}>
              No deployed mixers on this chain.
            </span>
          ) : (
            <select
              value={giftCardPoolId}
              onChange={(e) => setGiftCardPoolId(e.target.value)}
              disabled={isSettingGiftCard}
              style={{
                padding: "8px 12px",
                background: "#1a1a2e",
                color: "#eee",
                border: "1px solid #444",
                borderRadius: 6,
                minWidth: 260,
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            >
              <option value="">Select a mixer…</option>
              {pools.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {poolOptionLabel(pool, wethAddress)}
                </option>
              ))}
            </select>
          )}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#aaa",
            }}
          >
            <input
              type="checkbox"
              checked={giftCardEnabled}
              onChange={(e) => setGiftCardEnabled(e.target.checked)}
            />
            Enable
          </label>
          <button
            type="button"
            onClick={handleSetGiftCard}
            disabled={isSettingGiftCard || !giftCardPoolId}
            style={{
              padding: "8px 16px",
              background:
                giftCardPoolId && !isSettingGiftCard ? "#4361ee" : "#444",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor:
                isSettingGiftCard || !giftCardPoolId
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isSettingGiftCard ? "Setting…" : "Set Gift Card"}
          </button>
        </div>
      </section>

      {/* Fee Collector */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Set Fee Collector
        </h3>
        <p
          style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}
        >
          Address that receives the fee collector share of deposit fees.
          Requires DEFAULT_ADMIN_ROLE.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={feeCollector}
            onChange={(e) => setFeeCollector(e.target.value)}
            placeholder="0x..."
            style={{
              padding: "8px 12px",
              background: "#1a1a2e",
              color: "#eee",
              border: "1px solid #444",
              borderRadius: 6,
              minWidth: 320,
              fontFamily: "monospace",
            }}
          />
          <button
            type="button"
            onClick={handleSetFeeCollector}
            disabled={isSettingFeeCollector}
            style={{
              padding: "8px 16px",
              background: "#4361ee",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: isSettingFeeCollector ? "not-allowed" : "pointer",
            }}
          >
            {isSettingFeeCollector ? "Setting…" : "Set Fee Collector"}
          </button>
        </div>
      </section>

      {/* Reward Pool Share */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Set Reward Pool Share
        </h3>
        <p
          style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}
        >
          Share of deposit fees to the reward pool (rest goes to admin wallet).
          Basis points 0–10000 (e.g., 5000 = 50%).
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={rewardPoolShareBps}
            onChange={(e) => setRewardPoolShareBps(e.target.value)}
            placeholder="5000"
            style={{
              padding: "8px 12px",
              background: "#1a1a2e",
              color: "#eee",
              border: "1px solid #444",
              borderRadius: 6,
              width: 120,
            }}
          />
          <button
            type="button"
            onClick={handleSetRewardPoolShare}
            disabled={isSettingRewardPool}
            style={{
              padding: "8px 16px",
              background: "#4361ee",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: isSettingRewardPool ? "not-allowed" : "pointer",
            }}
          >
            {isSettingRewardPool ? "Setting…" : "Set Reward Pool Share"}
          </button>
        </div>
      </section>

      {/* Fee Rate */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>Set Fee Rate</h3>
        <p
          style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}
        >
          Fee in basis points (e.g., 25 = 0.25%). Max 500 (5%).
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={feeRateBps}
            onChange={(e) => setFeeRateBps(e.target.value)}
            placeholder="25"
            style={{
              padding: "8px 12px",
              background: "#1a1a2e",
              color: "#eee",
              border: "1px solid #444",
              borderRadius: 6,
              width: 120,
            }}
          />
          <button
            type="button"
            onClick={handleSetFeeRate}
            disabled={isSettingFee}
            style={{
              padding: "8px 16px",
              background: "#4361ee",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: isSettingFee ? "not-allowed" : "pointer",
            }}
          >
            {isSettingFee ? "Setting…" : "Set Fee Rate"}
          </button>
        </div>
      </section>

      {/* Staking Season Period */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Set Staking Season Period
        </h3>
        <p
          style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}
        >
          Duration in seconds for the next season (e.g., 86400 = 1 day).
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={seasonPeriodSec}
            onChange={(e) => setSeasonPeriodSec(e.target.value)}
            placeholder="86400"
            style={{
              padding: "8px 12px",
              background: "#1a1a2e",
              color: "#eee",
              border: "1px solid #444",
              borderRadius: 6,
              width: 140,
            }}
          />
          <button
            type="button"
            onClick={handleSetStakingPeriod}
            disabled={isSettingPeriod}
            style={{
              padding: "8px 16px",
              background: "#4361ee",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: isSettingPeriod ? "not-allowed" : "pointer",
            }}
          >
            {isSettingPeriod ? "Setting…" : "Set Period"}
          </button>
        </div>
      </section>

      {/* Start New Season */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Start New Stake Season
        </h3>
        <p
          style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}
        >
          Start a new staking season with the configured period.
        </p>
        <button
          type="button"
          onClick={handleStartSeason}
          disabled={isStartingSeason}
          style={{
            padding: "8px 16px",
            background: "#4361ee",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: isStartingSeason ? "not-allowed" : "pointer",
          }}
        >
          {isStartingSeason ? "Starting…" : "Start New Season"}
        </button>
      </section>

      {lastTxHash && (
        <p style={{ margin: 0, fontSize: "0.875rem" }}>
          Last tx:{" "}
          <a
            href={EXPLORER_TX(lastTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#60a5fa" }}
          >
            {lastTxHash.slice(0, 10)}…
          </a>
        </p>
      )}
    </div>
  );
}
