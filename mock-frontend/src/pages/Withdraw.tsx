import { useState, useEffect, useMemo, useRef } from "react";
import {
  useMixerConfig,
  AintiVirusEVMSubgraph,
  useWithdraw,
  useWithdrawByGiftCard,
} from "@aintivirus-ai/mixer-sdk";
import type { MixerPool } from "@aintivirus-ai/mixer-sdk";
import { formatEther } from "ethers";
import { useChainId, useAccount } from "wagmi";

const EXPLORER_TX = (hash: string, chainId?: number) => {
  if (chainId === 1) return `https://etherscan.io/tx/${hash}`;
  return `https://sepolia.etherscan.io/tx/${hash}`;
};

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

/** Parse pasted JSON (secret, nullifier, optional amount, asset for pool lookup) */
function parseDepositJson(jsonStr: string): {
  secret: bigint;
  nullifier: bigint;
  amount?: bigint;
  asset?: string;
} | null {
  try {
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    const secret = BigInt(String(o.secret ?? ""));
    const nullifier = BigInt(String(o.nullifier ?? ""));
    if (secret === 0n || nullifier === 0n) return null;
    const asset =
      typeof o.asset === "string" && o.asset.length > 0
        ? String(o.asset)
        : undefined;
    return {
      secret,
      nullifier,
      amount: o.amount != null ? BigInt(String(o.amount)) : undefined,
      asset,
    };
  } catch {
    return null;
  }
}

export default function Withdraw() {
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  /** Pool resolved from pasted deposit JSON (asset + amount); used when user doesn't select a pool */
  const [poolFromJson, setPoolFromJson] = useState<MixerPool | null>(null);
  const [pools, setPools] = useState<MixerPool[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [nullifierInput, setNullifierInput] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [pasteJson, setPasteJson] = useState("");
  const [applyJsonError, setApplyJsonError] = useState<string | null>(null);
  const [isApplyingJson, setIsApplyingJson] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [giftCardEnabled, setGiftCardEnabled] = useState<boolean | null>(null);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [isWithdrawingGiftCard, setIsWithdrawingGiftCard] = useState(false);
  const [giftCardTxHash, setGiftCardTxHash] = useState<string | null>(null);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);

  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();
  const { withdraw: doWithdraw, isReady: withdrawReady } = useWithdraw();
  const {
    withdrawByGiftCard: doWithdrawByGiftCard,
    isReady: giftCardWithdrawReady,
    isGiftCardEnabledForPool,
  } = useWithdrawByGiftCard();
  const isGiftCardEnabledForPoolRef = useRef(isGiftCardEnabledForPool);
  isGiftCardEnabledForPoolRef.current = isGiftCardEnabledForPool;
  const evmChainConfig =
    chainId != null ? getEvmChainConfig(chainId) : undefined;
  const subgraphUrl = evmChainConfig?.subgraphUrl;
  const wethAddress = evmChainConfig?.wethAddress;

  const subgraph = useMemo(() => {
    if (!subgraphUrl) return null;
    return new AintiVirusEVMSubgraph({ endpoint: subgraphUrl });
  }, [subgraphUrl]);

  const selectedPoolFromList = useMemo(
    () =>
      selectedPoolId
        ? (pools.find((p) => p.id === selectedPoolId) ?? null)
        : null,
    [pools, selectedPoolId],
  );
  /** Pool to use for withdrawal: from pasted JSON or from dropdown */
  const selectedPool = poolFromJson ?? selectedPoolFromList;

  const recipient = recipientInput.trim() || address || "";

  // Default recipient to connected wallet
  useEffect(() => {
    if (address && !recipientInput.trim()) {
      setRecipientInput(address);
    }
  }, [address]);

  // Check if gift card withdraw is enabled for the selected pool (stable deps to avoid flicker)
  useEffect(() => {
    if (!selectedPool || !giftCardWithdrawReady) {
      setGiftCardEnabled(null);
      return;
    }
    let cancelled = false;
    setGiftCardEnabled(null);
    const asset = selectedPool.asset;
    const amount = selectedPool.amount;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setGiftCardEnabled(false);
    }, 15000);
    isGiftCardEnabledForPoolRef.current(asset, amount)
      .then((enabled: boolean) => {
        if (!cancelled) setGiftCardEnabled(enabled);
      })
      .catch(() => {
        if (!cancelled) setGiftCardEnabled(false);
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [selectedPool?.id, selectedPool?.asset, selectedPool?.amount, giftCardWithdrawReady]);

  // Fetch pools
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

  const applyPastedJson = async () => {
    const parsed = parseDepositJson(pasteJson);
    if (!parsed) {
      setApplyJsonError(
        "Invalid JSON. Expected object with secret, nullifier, and optionally asset + amount.",
      );
      return;
    }
    setApplyJsonError(null);
    setSecretInput(parsed.secret.toString());
    setNullifierInput(parsed.nullifier.toString());
    setPasteJson("");
    setPoolFromJson(null);
    if (parsed.asset != null && parsed.amount != null && subgraph) {
      setIsApplyingJson(true);
      try {
        const poolId = subgraph.getPoolId(parsed.asset, parsed.amount);
        const pool = await subgraph.getMixerPoolById(poolId);
        if (pool) {
          setPoolFromJson(pool);
          setSelectedPoolId("");
        } else {
          setApplyJsonError(
            "No mixer pool found for this asset and amount on this chain. Check network.",
          );
        }
      } catch (e) {
        setApplyJsonError(
          e instanceof Error
            ? e.message
            : "Failed to fetch mixer pool from deposit data.",
        );
      } finally {
        setIsApplyingJson(false);
      }
    }
  };

  const handleWithdraw = async () => {
    if (!selectedPool) {
      alert("Select a mixer pool.");
      return;
    }
    const secret = secretInput.trim() ? BigInt(secretInput.trim()) : 0n;
    const nullifier = nullifierInput.trim()
      ? BigInt(nullifierInput.trim())
      : 0n;
    if (secret === 0n || nullifier === 0n) {
      alert("Enter secret and nullifier (from your deposit data).");
      return;
    }
    if (!recipient || recipient.length < 20) {
      alert("Enter a valid recipient address.");
      return;
    }
    if (!withdrawReady) {
      alert(
        "Wallet not ready or subgraph not configured. Connect wallet on a supported chain.",
      );
      return;
    }

    setIsWithdrawing(true);
    setTxHash(null);
    setWithdrawError(null);
    try {
      const result = await doWithdraw({
        pool: selectedPool,
        secret,
        nullifier,
        recipient,
      });
      setTxHash(result.txHash);
    } catch (error: unknown) {
      console.error("Withdraw error:", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      setWithdrawError(msg);
      alert(`Withdraw failed: ${msg}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleWithdrawByGiftCard = async () => {
    if (!selectedPool) {
      alert("Select a mixer pool.");
      return;
    }
    const secret = secretInput.trim() ? BigInt(secretInput.trim()) : 0n;
    const nullifier = nullifierInput.trim()
      ? BigInt(nullifierInput.trim())
      : 0n;
    if (secret === 0n || nullifier === 0n) {
      alert("Enter secret and nullifier (from your deposit data).");
      return;
    }
    if (!recipient || recipient.length < 20) {
      alert("Enter a valid recipient address.");
      return;
    }
    const orderId = orderIdInput.trim();
    if (!orderId) {
      alert("Enter a gift card order ID.");
      return;
    }
    if (!giftCardWithdrawReady) {
      alert(
        "Wallet not ready or subgraph not configured. Connect wallet on a supported chain.",
      );
      return;
    }

    setIsWithdrawingGiftCard(true);
    setGiftCardTxHash(null);
    setGiftCardError(null);
    try {
      const result = await doWithdrawByGiftCard({
        pool: selectedPool,
        secret,
        nullifier,
        recipient,
        orderId,
      });
      setGiftCardTxHash(result.txHash);
    } catch (error: unknown) {
      console.error("Withdraw by gift card error:", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      setGiftCardError(msg);
      alert(`Withdraw by gift card failed: ${msg}`);
    } finally {
      setIsWithdrawingGiftCard(false);
    }
  };

  const isReady = withdrawReady;

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
            Please connect your wallet to withdraw. Use the{" "}
            <strong>Connect Wallet</strong> button in the header.
          </p>
        ) : wrongNetwork ? (
          <p style={{ margin: 0 }}>
            Your wallet is on an unsupported network. Switch to one of:{" "}
            {evmChainIds.join(", ")} (e.g. Sepolia).
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            Wallet connected but not ready. Try reconnecting or refreshing.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        color: "#111",
        padding: 24,
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        maxWidth: 560,
      }}
    >
      <h2 style={{ marginTop: 0, color: "#111" }}>Withdraw</h2>
      <p style={{ fontSize: 14, color: "#444", marginBottom: 16 }}>
        Paste your deposit JSON (with secret, nullifier, asset, amount) to
        identify the mixer you deposited to—no need to select a pool. Or enter
        secret/nullifier and select a pool manually. A zero-knowledge proof is
        generated and submitted to withdraw.
      </p>
      <div style={{ marginTop: 16 }}>
        {poolFromJson && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#ecfdf5",
              borderRadius: 6,
              fontSize: 14,
              color: "#111",
            }}
          >
            <strong>Mixer from deposit data:</strong>{" "}
            {poolOptionLabel(poolFromJson, wethAddress)}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, color: "#111" }}>
            Mixer pool (optional if you paste deposit JSON with asset + amount)
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
              No deployed mixers on this chain.
            </p>
          ) : (
            <select
              value={selectedPoolId}
              onChange={(e) => {
                setSelectedPoolId(e.target.value);
                setPoolFromJson(null);
              }}
              disabled={isWithdrawing}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 13,
                background: "#fff",
                color: "#111",
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

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, color: "#111" }}>
            Paste deposit JSON (optional)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder='{"secret":"...","nullifier":"...","asset":"0x...","amount":"..."}'
              value={pasteJson}
              onChange={(e) => setPasteJson(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 12,
                background: "#fff",
                color: "#111",
              }}
            />
            <button
              type="button"
              onClick={() => void applyPastedJson()}
              disabled={isApplyingJson}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              {isApplyingJson ? "Applying…" : "Apply"}
            </button>
          </div>
          {applyJsonError && (
            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#b91c1c" }}>
              {applyJsonError}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, color: "#111" }}>
            Secret
          </label>
          <input
            type="text"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="From deposit data"
            disabled={isWithdrawing}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 6,
              fontFamily: "monospace",
              fontSize: 13,
              background: "#fff",
              color: "#111",
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, color: "#111" }}>
            Nullifier
          </label>
          <input
            type="text"
            value={nullifierInput}
            onChange={(e) => setNullifierInput(e.target.value)}
            placeholder="From deposit data"
            disabled={isWithdrawing}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 6,
              fontFamily: "monospace",
              fontSize: 13,
              background: "#fff",
              color: "#111",
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8, color: "#111" }}>
            Recipient address
          </label>
          <input
            type="text"
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            placeholder={address ?? "0x…"}
            disabled={isWithdrawing}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 6,
              fontFamily: "monospace",
              fontSize: 13,
              background: "#fff",
              color: "#111",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleWithdraw}
          disabled={
            isWithdrawing ||
            !selectedPool ||
            !secretInput.trim() ||
            !nullifierInput.trim() ||
            !recipient
          }
          style={{
            width: "100%",
            padding: "10px 16px",
            background:
              selectedPool &&
              secretInput.trim() &&
              nullifierInput.trim() &&
              recipient
                ? "#2563eb"
                : "#94a3b8",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor:
              selectedPool &&
              secretInput.trim() &&
              nullifierInput.trim() &&
              recipient &&
              !isWithdrawing
                ? "pointer"
                : "not-allowed",
          }}
        >
          {isWithdrawing ? "Withdrawing…" : "Withdraw"}
        </button>

        {withdrawError && (
          <p style={{ marginTop: 12, fontSize: 14, color: "#b91c1c" }}>
            {withdrawError}
          </p>
        )}

        {selectedPool && giftCardEnabled === null && (
          <p
            style={{
              marginTop: 16,
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Checking if gift card withdrawals are enabled for this mixer…
          </p>
        )}

        {selectedPool && giftCardEnabled === true && (
          <div
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#111" }}>
              Withdraw by gift card
            </h3>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>
              This mixer allows gift card withdrawals. Enter the order ID (bytes32 hex or any string; it will be hashed if not 0x+64 hex).
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 14, marginBottom: 6, color: "#111" }}>
                Order ID
              </label>
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="0x… or any string"
                disabled={isWithdrawingGiftCard}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  fontFamily: "monospace",
                  fontSize: 13,
                  background: "#fff",
                  color: "#111",
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleWithdrawByGiftCard}
              disabled={
                isWithdrawingGiftCard ||
                !orderIdInput.trim() ||
                !secretInput.trim() ||
                !nullifierInput.trim() ||
                !recipient
              }
              style={{
                width: "100%",
                padding: "10px 16px",
                background:
                  orderIdInput.trim() &&
                  secretInput.trim() &&
                  nullifierInput.trim() &&
                  recipient &&
                  !isWithdrawingGiftCard
                    ? "#059669"
                    : "#94a3b8",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor:
                  orderIdInput.trim() &&
                  secretInput.trim() &&
                  nullifierInput.trim() &&
                  recipient &&
                  !isWithdrawingGiftCard
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {isWithdrawingGiftCard ? "Withdrawing…" : "Withdraw by gift card"}
            </button>
            {giftCardError && (
              <p style={{ marginTop: 8, fontSize: 14, color: "#b91c1c" }}>
                {giftCardError}
              </p>
            )}
            {giftCardTxHash && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#ecfdf5",
                  borderRadius: 6,
                }}
              >
                <p style={{ margin: 0, fontSize: 14 }}>
                  <strong>Gift card tx:</strong>{" "}
                  <a
                    href={EXPLORER_TX(giftCardTxHash, chainId ?? undefined)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {giftCardTxHash.slice(0, 10)}…{giftCardTxHash.slice(-8)}
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {selectedPool && giftCardEnabled === false && (
          <p
            style={{
              marginTop: 16,
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Gift card withdrawals are not enabled for this mixer. An admin can enable it in the Admin tab (Set Gift Card).
          </p>
        )}

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
                href={EXPLORER_TX(txHash, chainId ?? undefined)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-8)}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
