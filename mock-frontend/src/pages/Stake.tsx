import { useState, useCallback } from "react";
import { useMixerConfig, useMixer } from "@aintivirus-ai/mixer-sdk";
import type { EVMStakeSeason, EVMStakerRecord } from "@aintivirus-ai/mixer-sdk";
import { formatEther, parseEther, parseUnits } from "ethers";
import { useChainId, useAccount } from "wagmi";

const EXPLORER_TX = (hash: string) =>
  `https://sepolia.etherscan.io/tx/${hash}`;

function formatBigInt(v: bigint): string {
  return v.toString();
}

const cardStyle = {
  padding: 20,
  background: "#16213e",
  borderRadius: 8,
  border: "1px solid #2a2a4a",
};

const inputStyle = {
  width: "100%" as const,
  padding: "10px 12px",
  border: "1px solid #444",
  borderRadius: 6,
  background: "#1a1a2e",
  color: "#eee",
  fontFamily: "monospace",
  fontSize: 13,
};

const labelStyle = { display: "block" as const, fontSize: 14, marginBottom: 8, color: "#ccc" };
const buttonStyle = {
  padding: "10px 16px",
  background: "#4361ee",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer" as const,
  fontSize: 14,
};

export default function Stake() {
  const [stakeEthAmount, setStakeEthAmount] = useState("0.1");
  const [stakeTokenAmount, setStakeTokenAmount] = useState("0");
  const [seasonIdInput, setSeasonIdInput] = useState("1");
  const [stakerAddressInput, setStakerAddressInput] = useState("");
  const [currentSeason, setCurrentSeason] = useState<bigint | null>(null);
  const [seasonInfo, setSeasonInfo] = useState<EVMStakeSeason | null>(null);
  const [stakerRecord, setStakerRecord] = useState<EVMStakerRecord | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [isStakingEth, setIsStakingEth] = useState(false);
  const [isStakingToken, setIsStakingToken] = useState(false);
  const [isUnstakingEth, setIsUnstakingEth] = useState(false);
  const [isUnstakingToken, setIsUnstakingToken] = useState(false);
  const [isClaimingEth, setIsClaimingEth] = useState(false);
  const [isClaimingToken, setIsClaimingToken] = useState(false);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chainId = useChainId();
  const { isConnected, address: walletAddress } = useAccount();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();
  const evmChainConfig =
    chainId != null ? getEvmChainConfig(chainId) : undefined;
  const tokenAddress = (evmChainConfig as { tokenAddress?: string } | undefined)
    ?.tokenAddress;
  const wethGateway = (evmChainConfig as { wethGatewayAddress?: string } | undefined)
    ?.wethGatewayAddress;

  const mixer = useMixer();
  const evmSDK = mixer?.getActiveEVM?.() ?? null;

  const isReady = Boolean(isConnected && evmSDK);
  const wrongNetwork =
    isConnected &&
    chainId != null &&
    evmChainIds.length > 0 &&
    !evmChainIds.includes(chainId);

  const effectiveStakerAddress = stakerAddressInput.trim() || (walletAddress ?? "");

  const fetchCurrentSeason = useCallback(async () => {
    if (!evmSDK) return;
    setError(null);
    try {
      const season = await evmSDK.getCurrentStakeSeason();
      setCurrentSeason(season);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get current season");
      setCurrentSeason(null);
    }
  }, [evmSDK]);

  const fetchSeasonInfo = useCallback(async () => {
    if (!evmSDK) return;
    setError(null);
    setIsLoadingSeason(true);
    try {
      const id = BigInt(seasonIdInput.trim() || "0");
      const info = await evmSDK.getStakeSeason(id);
      setSeasonInfo(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get season info");
      setSeasonInfo(null);
    } finally {
      setIsLoadingSeason(false);
    }
  }, [evmSDK, seasonIdInput]);

  const fetchStakerRecord = useCallback(async () => {
    if (!evmSDK || !effectiveStakerAddress) return;
    if (!/^0x[a-fA-F0-9]{40}$/i.test(effectiveStakerAddress)) {
      setError("Enter a valid 0x… address");
      return;
    }
    setError(null);
    setIsLoadingRecord(true);
    try {
      const record = await evmSDK.getStakerRecord(effectiveStakerAddress);
      setStakerRecord(record);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get staker record");
      setStakerRecord(null);
    } finally {
      setIsLoadingRecord(false);
    }
  }, [evmSDK, effectiveStakerAddress]);

  const handleStakeEth = async () => {
    if (!evmSDK) return;
    const amount = parseEther(stakeEthAmount.trim() || "0");
    if (amount <= 0n) {
      alert("Enter a positive ETH amount.");
      return;
    }
    setError(null);
    setIsStakingEth(true);
    setLastTxHash(null);
    try {
      const result = await evmSDK.stakeEther(amount);
      setLastTxHash(result.txHash);
      fetchCurrentSeason();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stake ETH failed");
    } finally {
      setIsStakingEth(false);
    }
  };

  const handleStakeToken = async () => {
    if (!evmSDK || !tokenAddress) {
      alert("Token not configured for this chain.");
      return;
    }
    const raw = stakeTokenAmount.trim() || "0";
    if (parseFloat(raw) <= 0) {
      alert("Enter a positive token amount.");
      return;
    }
    setError(null);
    setIsStakingToken(true);
    setLastTxHash(null);
    try {
      const decimals = await evmSDK.getAssetDecimals(tokenAddress);
      const amount = parseUnits(raw, decimals);
      const result = await evmSDK.stakeToken(amount);
      setLastTxHash(result.txHash);
      fetchCurrentSeason();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stake token failed");
    } finally {
      setIsStakingToken(false);
    }
  };

  const handleUnstakeEth = async () => {
    if (!evmSDK) return;
    setError(null);
    setIsUnstakingEth(true);
    setLastTxHash(null);
    try {
      const result = await evmSDK.unstakeEth();
      setLastTxHash(result.txHash);
      fetchCurrentSeason();
      if (effectiveStakerAddress) fetchStakerRecord();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unstake ETH failed");
    } finally {
      setIsUnstakingEth(false);
    }
  };

  const handleUnstakeToken = async () => {
    if (!evmSDK) return;
    setError(null);
    setIsUnstakingToken(true);
    setLastTxHash(null);
    try {
      const result = await evmSDK.unstakeToken();
      setLastTxHash(result.txHash);
      fetchCurrentSeason();
      if (effectiveStakerAddress) fetchStakerRecord();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unstake token failed");
    } finally {
      setIsUnstakingToken(false);
    }
  };

  const handleClaimEth = async () => {
    if (!evmSDK) return;
    const seasonId = BigInt(seasonIdInput.trim() || "0");
    setError(null);
    setIsClaimingEth(true);
    setLastTxHash(null);
    try {
      const result = await evmSDK.claimEth(seasonId);
      setLastTxHash(result.txHash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim ETH failed");
    } finally {
      setIsClaimingEth(false);
    }
  };

  const handleClaimToken = async () => {
    if (!evmSDK) return;
    const seasonId = BigInt(seasonIdInput.trim() || "0");
    setError(null);
    setIsClaimingToken(true);
    setLastTxHash(null);
    try {
      const result = await evmSDK.claimToken(seasonId);
      setLastTxHash(result.txHash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim token failed");
    } finally {
      setIsClaimingToken(false);
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
            Please connect your wallet to stake. Use the{" "}
            <strong>Connect Wallet</strong> button in the header.
          </p>
        ) : wrongNetwork ? (
          <p style={{ margin: 0 }}>
            Your wallet is on an unsupported network. Switch to one of:{" "}
            {evmChainIds.join(", ")}.
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            Wallet connected but SDK not ready. Ensure chain config has factory
            and try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ marginTop: 0 }}>Stake</h2>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 0 }}>
        Stake ETH (via WETH gateway) or config token, view season and staker
        data, and claim rewards.
      </p>

      {error && (
        <div
          style={{
            padding: 12,
            background: "#7f1d1d",
            color: "#fecaca",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {lastTxHash && (
        <p style={{ margin: 0, fontSize: 14 }}>
          Last tx:{" "}
          <a href={EXPLORER_TX(lastTxHash)} target="_blank" rel="noreferrer">
            {lastTxHash.slice(0, 10)}…
          </a>
        </p>
      )}

      {/* Stake ETH */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Stake ETH
        </h3>
        <p style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}>
          {wethGateway
            ? "Uses WETH gateway; native ETH is wrapped and staked."
            : "No WETH gateway in config; use Stake token with WETH address."}
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Amount (ETH)</label>
          <input
            type="text"
            value={stakeEthAmount}
            onChange={(e) => setStakeEthAmount(e.target.value)}
            placeholder="0.1"
            disabled={!wethGateway}
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          onClick={handleStakeEth}
          disabled={!wethGateway || isStakingEth}
          style={buttonStyle}
        >
          {isStakingEth ? "Staking…" : "Stake ETH"}
        </button>
      </section>

      {/* Stake token */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Stake token
        </h3>
        <p style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}>
          Stake the configured token for this chain.
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Amount</label>
          <input
            type="text"
            value={stakeTokenAmount}
            onChange={(e) => setStakeTokenAmount(e.target.value)}
            placeholder="0"
            disabled={!tokenAddress}
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          onClick={handleStakeToken}
          disabled={!tokenAddress || isStakingToken}
          style={buttonStyle}
        >
          {isStakingToken ? "Staking…" : "Stake token"}
        </button>
      </section>

      {/* Unstake */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Unstake
        </h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleUnstakeEth}
            disabled={isUnstakingEth}
            style={buttonStyle}
          >
            {isUnstakingEth ? "Unstaking…" : "Unstake ETH"}
          </button>
          <button
            type="button"
            onClick={handleUnstakeToken}
            disabled={isUnstakingToken}
            style={buttonStyle}
          >
            {isUnstakingToken ? "Unstaking…" : "Unstake token"}
          </button>
        </div>
      </section>

      {/* Claim rewards */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Claim rewards
        </h3>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Season ID</label>
          <input
            type="text"
            value={seasonIdInput}
            onChange={(e) => setSeasonIdInput(e.target.value)}
            placeholder="1"
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleClaimEth}
            disabled={isClaimingEth}
            style={buttonStyle}
          >
            {isClaimingEth ? "Claiming…" : "Claim ETH rewards"}
          </button>
          <button
            type="button"
            onClick={handleClaimToken}
            disabled={isClaimingToken}
            style={buttonStyle}
          >
            {isClaimingToken ? "Claiming…" : "Claim token rewards"}
          </button>
        </div>
      </section>

      {/* Current season */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Current stake season
        </h3>
        <div style={{ marginBottom: 12 }}>
          {currentSeason !== null ? (
            <p style={{ margin: 0, color: "#e2e8f0" }}>
              Season ID: <strong>{formatBigInt(currentSeason)}</strong>
            </p>
          ) : (
            <p style={{ margin: 0, color: "#94a3b8" }}>Not loaded.</p>
          )}
        </div>
        <button type="button" onClick={fetchCurrentSeason} style={buttonStyle}>
          Refresh current season
        </button>
      </section>

      {/* Season info */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Season info
        </h3>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Season ID</label>
          <input
            type="text"
            value={seasonIdInput}
            onChange={(e) => setSeasonIdInput(e.target.value)}
            placeholder="1"
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          onClick={fetchSeasonInfo}
          disabled={isLoadingSeason}
          style={buttonStyle}
        >
          {isLoadingSeason ? "Loading…" : "Get season info"}
        </button>
        {seasonInfo && (
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: "#1a1a2e",
              borderRadius: 6,
              fontSize: 12,
              color: "#94a3b8",
              overflow: "auto",
            }}
          >
            {JSON.stringify(
              {
                seasonId: formatBigInt(seasonInfo.seasonId),
                startTimestamp: formatBigInt(seasonInfo.startTimestamp),
                endTimestamp: formatBigInt(seasonInfo.endTimestamp),
                totalStakedEthAmount: formatBigInt(seasonInfo.totalStakedEthAmount),
                totalStakedTokenAmount: formatBigInt(
                  seasonInfo.totalStakedTokenAmount,
                ),
                totalRewardEthAmount: formatBigInt(seasonInfo.totalRewardEthAmount),
                totalRewardTokenAmount: formatBigInt(
                  seasonInfo.totalRewardTokenAmount,
                ),
                totalEthWeightValue: formatBigInt(seasonInfo.totalEthWeightValue),
                totalTokenWeightValue: formatBigInt(
                  seasonInfo.totalTokenWeightValue,
                ),
              },
              null,
              2,
            )}
          </pre>
        )}
      </section>

      {/* Staker record */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Staker record
        </h3>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Address (default: connected wallet)</label>
          <input
            type="text"
            value={stakerAddressInput}
            onChange={(e) => setStakerAddressInput(e.target.value)}
            placeholder={walletAddress ?? "0x…"}
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          onClick={fetchStakerRecord}
          disabled={!effectiveStakerAddress || isLoadingRecord}
          style={buttonStyle}
        >
          {isLoadingRecord ? "Loading…" : "Get staker record"}
        </button>
        {stakerRecord && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#1a1a2e",
              borderRadius: 6,
              fontSize: 13,
              color: "#94a3b8",
            }}
          >
            <p style={{ margin: "0 0 4px 0" }}>
              Staked ETH: {formatEther(stakerRecord.stakedEthAmount)} ETH
            </p>
            <p style={{ margin: "0 0 4px 0" }}>
              Staked token: {formatBigInt(stakerRecord.stakedTokenAmount)} (raw)
            </p>
            <p style={{ margin: "0 0 4px 0" }}>
              ETH season: {formatBigInt(stakerRecord.ethStakedSeasonId)} | Token
              season: {formatBigInt(stakerRecord.tokenStakedSeasonId)}
            </p>
            <p style={{ margin: 0 }}>
              ETH weight: {formatBigInt(stakerRecord.ethWeightValue)} | Token
              weight: {formatBigInt(stakerRecord.tokenWeightValue)}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
