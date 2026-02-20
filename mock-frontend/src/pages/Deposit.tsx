import { useState, useEffect, useMemo } from "react";
import {
  useDeposit,
  useMixerConfig,
  AintiVirusEVMSubgraph,
} from "@aintivirus-ai/mixer-sdk";
import type { MixerPool, DepositData } from "@aintivirus-ai/mixer-sdk";
import { formatEther } from "ethers";

/** Shape we need from useDeposit (SDK may export a different shape from dist) */
interface DepositHook {
  deposit: (
    assetAddress: string,
    amount: bigint,
  ) => Promise<{ txHash: string; depositData?: DepositData }>;
  calculateDepositAmount?: (amount: bigint) => Promise<bigint>;
  isReady?: boolean;
}
import { useChainId, useAccount } from "wagmi";

const EXPLORER_TX = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`;

function formatAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function poolOptionLabel(pool: MixerPool, wethAddress?: string): string {
  const isEth = wethAddress ? pool.asset.toLowerCase() === wethAddress : false;
  const amountStr = isEth
    ? `${formatEther(pool.amount)} ETH`
    : `${pool.amount.toString()} (raw)`;
  const assetStr = isEth ? "ETH" : formatAddress(pool.asset);
  return `${assetStr} – ${amountStr}`;
}

/** Serialize DepositData for JSON (bigint → string). Include asset so withdraw can find the pool from JSON. */
function depositDataToJson(d: DepositData, asset: string): string {
  return JSON.stringify(
    {
      secret: d.secret.toString(),
      nullifier: d.nullifier.toString(),
      commitment: d.commitment.toString(),
      amount: d.amount.toString(),
      asset,
    },
    null,
    2,
  );
}

export default function Deposit() {
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [pools, setPools] = useState<MixerPool[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [totalWithFee, setTotalWithFee] = useState<string | null>(null);
  /** Last deposit credentials – save this for withdrawal */
  const [lastDepositData, setLastDepositData] = useState<DepositData | null>(
    null,
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();
  const evmChainConfig =
    chainId != null ? getEvmChainConfig(chainId) : undefined;
  const wethAddress = (
    evmChainConfig as { wethAddress?: string } | undefined
  )?.wethAddress?.toLowerCase();
  const subgraphUrl = evmChainConfig?.subgraphUrl;

  const subgraph = useMemo(() => {
    if (!subgraphUrl) return null;
    return new AintiVirusEVMSubgraph({ endpoint: subgraphUrl });
  }, [subgraphUrl]);

  const depositHook = (useDeposit as unknown as () => DepositHook)();
  const { deposit, calculateDepositAmount } = depositHook;
  const isReady = depositHook.isReady ?? false;

  // Fetch deployed mixer pools from The Graph
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
        if (!cancelled) {
          setPools(data ?? []);
        }
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

  const selectedPool = useMemo(
    () =>
      selectedPoolId
        ? (pools.find((p) => p.id === selectedPoolId) ?? null)
        : null,
    [pools, selectedPoolId],
  );

  const handleDeposit = async () => {
    if (!selectedPool) {
      alert("Select a mixer from the list.");
      return;
    }
    if (!isReady) {
      alert("Please connect your wallet on a supported chain (from config).");
      return;
    }
    setIsDepositing(true);
    setTxHash(null);
    setTotalWithFee(null);
    setLastDepositData(null);
    try {
      const result = await deposit(selectedPool.asset, selectedPool.amount);
      setTxHash(result.txHash);
      const data =
        (result as { depositData?: DepositData }).depositData ?? null;
      setLastDepositData(data);
      const isEth = wethAddress
        ? selectedPool.asset.toLowerCase() === wethAddress
        : false;
      if (isEth && calculateDepositAmount) {
        const total = await calculateDepositAmount(selectedPool.amount);
        setTotalWithFee(formatEther(total));
      } else {
        setTotalWithFee(null);
      }
    } catch (error: unknown) {
      console.error("Deposit error:", error);
      alert(
        `Deposit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsDepositing(false);
    }
  };

  if (!isReady) {
    const wrongNetwork =
      isConnected &&
      chainId != null &&
      evmChainIds.length > 0 &&
      !evmChainIds.includes(chainId);

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
            Please connect your wallet to deposit. Use the{" "}
            <strong>Connect Wallet</strong> button in the header above.
          </p>
        ) : wrongNetwork ? (
          <p style={{ margin: 0 }}>
            Your wallet is on an unsupported network. Switch to one of:{" "}
            {evmChainIds.join(", ")} (e.g. Sepolia) in your wallet.
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            Wallet connected but not ready. Try reconnecting your wallet or
            refreshing the page.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Deposit</h2>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
        Select a deployed mixer from the list (from The Graph), then deposit. A
        commitment is generated automatically; save the deposit data (secret,
        nullifier) to withdraw later.
      </p>
      <div
        style={{
          background: "white",
          padding: 24,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxWidth: 420,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8 }}>
            Mixer pool
          </label>
          {poolsLoading ? (
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              Loading mixer list…
            </p>
          ) : poolsError ? (
            <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>
              {poolsError}
            </p>
          ) : pools.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              No deployed mixers on this chain. Deploy one on the{" "}
              <strong>Deploy</strong> tab first.
            </p>
          ) : (
            <select
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              disabled={isDepositing}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 13,
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
        </div>

        <button
          type="button"
          onClick={handleDeposit}
          disabled={isDepositing || !selectedPool}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: selectedPool ? "#2563eb" : "#94a3b8",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: selectedPool && !isDepositing ? "pointer" : "not-allowed",
          }}
        >
          {isDepositing ? "Depositing…" : "Deposit"}
        </button>

        {txHash && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#ecfdf5",
              borderRadius: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 14 }}>
              <strong>Tx:</strong>{" "}
              <a
                href={EXPLORER_TX(txHash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-8)}
              </a>
            </p>
            {totalWithFee != null &&
              selectedPool &&
              wethAddress &&
              selectedPool.asset.toLowerCase() === wethAddress && (
                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  Total paid (amount + fee): {totalWithFee} ETH
                </p>
              )}
          </div>
        )}

        {lastDepositData && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: "#fef3c7",
              borderRadius: 8,
              border: "1px solid #f59e0b",
            }}
          >
            <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>
              Withdrawal credentials – save this to withdraw
            </p>
            <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#92400e" }}>
              Store these values securely. You need secret and nullifier to
              generate a withdrawal proof.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "#78716c",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Secret
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <code
                    style={{
                      flex: 1,
                      fontSize: 11,
                      wordBreak: "break-all",
                      background: "#fff",
                      padding: 8,
                      borderRadius: 4,
                    }}
                  >
                    {lastDepositData.secret.toString()}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        lastDepositData.secret.toString(),
                      );
                      setCopyFeedback("Secret copied");
                      setTimeout(() => setCopyFeedback(null), 2000);
                    }}
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "#78716c",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Nullifier
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <code
                    style={{
                      flex: 1,
                      fontSize: 11,
                      wordBreak: "break-all",
                      background: "#fff",
                      padding: 8,
                      borderRadius: 4,
                    }}
                  >
                    {lastDepositData.nullifier.toString()}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        lastDepositData.nullifier.toString(),
                      );
                      setCopyFeedback("Nullifier copied");
                      setTimeout(() => setCopyFeedback(null), 2000);
                    }}
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "#78716c",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Commitment
                </label>
                <code
                  style={{
                    display: "block",
                    fontSize: 11,
                    wordBreak: "break-all",
                    background: "#fff",
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  {lastDepositData.commitment.toString()}
                </code>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={async () => {
                  const json = selectedPool
                    ? depositDataToJson(lastDepositData, selectedPool.asset)
                    : "";
                  await navigator.clipboard.writeText(json);
                  setCopyFeedback("All copied as JSON");
                  setTimeout(() => setCopyFeedback(null), 2000);
                }}
                style={{ padding: "8px 12px", fontSize: 13 }}
              >
                Copy all as JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  const json = selectedPool
                    ? depositDataToJson(lastDepositData, selectedPool.asset)
                    : "{}";
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `deposit-data-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{ padding: "8px 12px", fontSize: 13 }}
              >
                Download JSON
              </button>
            </div>
            {copyFeedback && (
              <p
                style={{ margin: "8px 0 0 0", fontSize: 12, color: "#059669" }}
              >
                {copyFeedback}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
