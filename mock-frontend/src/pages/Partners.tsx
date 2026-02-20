import { useState, useEffect } from "react";
import { useAdmin, useMixerConfig } from "@aintivirus-ai/mixer-sdk";
import { useChainId, useAccount } from "wagmi";

const EXPLORER_TX = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`;

export default function Partners() {
  const [partnerAddress, setPartnerAddress] = useState("");
  const [extraFeeBps, setExtraFeeBps] = useState("100");
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState<{
    isPartner: boolean;
    extraFee: string;
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSettingMine, setIsSettingMine] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const chainId = useChainId();
  const { address } = useAccount();
  const { isConnected } = useAccount();
  const { evmChainIds } = useMixerConfig();
  const {
    addWhiteLabelPartner,
    setPartnerExtraFee,
    setMyExtraFee,
    removeWhiteLabelPartner,
    isWhiteLabelPartner,
    getPartnerExtraFee,
    isReady,
  } = useAdmin();

  const wrongNetwork =
    isConnected &&
    chainId != null &&
    evmChainIds.length > 0 &&
    !evmChainIds.includes(chainId);
  const [amIPartner, setAmIPartner] = useState<boolean | null>(null);

  useEffect(() => {
    if (!address || !isReady) {
      setAmIPartner(null);
      return;
    }
    isWhiteLabelPartner(address).then(setAmIPartner).catch(() => setAmIPartner(false));
  }, [address, isReady, chainId]);

  const handleAddPartner = async () => {
    const addr = partnerAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      alert("Enter a valid 0x… partner address");
      return;
    }
    const bps = BigInt(extraFeeBps.trim());
    if (bps < 0 || bps > 10000) {
      alert("Extra fee must be 0–10000 basis points (0–100%)");
      return;
    }
    if (!isReady) return;
    setIsAdding(true);
    setLastTxHash(null);
    try {
      const result = await addWhiteLabelPartner(addr, bps);
      setLastTxHash(result.txHash);
      setPartnerAddress("");
      setExtraFeeBps("100");
    } catch (error: unknown) {
      console.error("addWhiteLabelPartner error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateFee = async () => {
    const addr = partnerAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      alert("Enter a valid 0x… partner address");
      return;
    }
    const bps = BigInt(extraFeeBps.trim());
    if (bps < 0 || bps > 10000) {
      alert("Extra fee must be 0–10000 basis points");
      return;
    }
    if (!isReady) return;
    setIsUpdating(true);
    setLastTxHash(null);
    try {
      const result = await setPartnerExtraFee(addr, bps);
      setLastTxHash(result.txHash);
    } catch (error: unknown) {
      console.error("setPartnerExtraFee error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemovePartner = async () => {
    const addr = partnerAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      alert("Enter a valid 0x… partner address");
      return;
    }
    if (!isReady) return;
    if (!confirm(`Remove partner ${addr}?`)) return;
    setIsRemoving(true);
    setLastTxHash(null);
    try {
      const result = await removeWhiteLabelPartner(addr);
      setLastTxHash(result.txHash);
      setPartnerAddress("");
    } catch (error: unknown) {
      console.error("removeWhiteLabelPartner error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSetMyFee = async () => {
    const bps = BigInt(extraFeeBps.trim());
    if (bps < 0 || bps > 10000) {
      alert("Extra fee must be 0–10000 basis points");
      return;
    }
    if (!isReady) return;
    setIsSettingMine(true);
    setLastTxHash(null);
    try {
      const result = await setMyExtraFee(bps);
      setLastTxHash(result.txHash);
    } catch (error: unknown) {
      console.error("setMyExtraFee error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingMine(false);
    }
  };

  const handleLookup = async () => {
    const addr = lookupAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      alert("Enter a valid 0x… address");
      return;
    }
    if (!isReady) return;
    setIsLookingUp(true);
    setLookupResult(null);
    try {
      const [isPartner, fee] = await Promise.all([
        isWhiteLabelPartner(addr),
        getPartnerExtraFee(addr),
      ]);
      setLookupResult({ isPartner, extraFee: fee.toString() });
    } catch (error: unknown) {
      console.error("Lookup error:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLookingUp(false);
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
            Please connect your wallet. Admin operations require OPERATOR_ROLE;
            partners can set their own fee with setMyExtraFee.
          </p>
        ) : wrongNetwork ? (
          <p style={{ margin: 0 }}>Please switch to a supported chain.</p>
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
        White-label partners receive an extra fee per deposit. Register partners
        (OPERATOR_ROLE) or update your own fee if you are a registered partner.
      </p>

      {amIPartner === true && (
        <div
          style={{
            padding: 12,
            background: "#1e3a2f",
            borderRadius: 8,
            border: "1px solid #22c55e",
            color: "#86efac",
          }}
        >
          You are a registered white-label partner. Use &quot;Set My Extra Fee&quot;
          below to update your fee.
        </div>
      )}

      {/* Lookup */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Lookup Partner
        </h3>
        <p style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}>
          Check if an address is a partner and their extra fee (wei).
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
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
            onClick={handleLookup}
            disabled={isLookingUp}
            style={{
              padding: "8px 16px",
              background: "#4361ee",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: isLookingUp ? "not-allowed" : "pointer",
            }}
          >
            {isLookingUp ? "Looking up…" : "Lookup"}
          </button>
        </div>
        {lookupResult && (
          <p style={{ margin: "12px 0 0 0", fontSize: "0.875rem" }}>
            Partner: {lookupResult.isPartner ? "Yes" : "No"}
            {lookupResult.isPartner && (
              <> · Extra fee: {lookupResult.extraFee} bps</>
            )}
          </p>
        )}
      </section>

      {/* Add / Update / Remove (Admin) */}
      <section
        style={{
          padding: 20,
          background: "#16213e",
          borderRadius: 8,
          border: "1px solid #2a2a4a",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
          Register or Update Partner (OPERATOR_ROLE)
        </h3>
        <p style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}>
          Partner address and extra fee in basis points (e.g. 100 = 1% of deposit).
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              value={partnerAddress}
              onChange={(e) => setPartnerAddress(e.target.value)}
              placeholder="Partner address 0x..."
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
            <input
              type="text"
              value={extraFeeBps}
              onChange={(e) => setExtraFeeBps(e.target.value)}
              placeholder="100"
              style={{
                padding: "8px 12px",
                background: "#1a1a2e",
                color: "#eee",
                border: "1px solid #444",
                borderRadius: 6,
                width: 100,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleAddPartner}
              disabled={isAdding}
              style={{
                padding: "8px 16px",
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: isAdding ? "not-allowed" : "pointer",
              }}
            >
              {isAdding ? "Adding…" : "Add Partner"}
            </button>
            <button
              type="button"
              onClick={handleUpdateFee}
              disabled={isUpdating}
              style={{
                padding: "8px 16px",
                background: "#4361ee",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: isUpdating ? "not-allowed" : "pointer",
              }}
            >
              {isUpdating ? "Updating…" : "Update Fee"}
            </button>
            <button
              type="button"
              onClick={handleRemovePartner}
              disabled={isRemoving}
              style={{
                padding: "8px 16px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: isRemoving ? "not-allowed" : "pointer",
              }}
            >
              {isRemoving ? "Removing…" : "Remove Partner"}
            </button>
          </div>
        </div>
      </section>

      {/* Set My Fee (Partner) */}
      {amIPartner === true && (
        <section
          style={{
            padding: 20,
            background: "#16213e",
            borderRadius: 8,
            border: "1px solid #2a2a4a",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
            Set My Extra Fee (Partner)
          </h3>
          <p style={{ color: "#aaa", margin: "0 0 12px 0", fontSize: "0.875rem" }}>
            As a registered partner, set your own extra fee in basis points (e.g. 100 = 1%).
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              value={extraFeeBps}
              onChange={(e) => setExtraFeeBps(e.target.value)}
              placeholder="100"
              style={{
                padding: "8px 12px",
                background: "#1a1a2e",
                color: "#eee",
                border: "1px solid #444",
                borderRadius: 6,
                width: 100,
              }}
            />
            <button
              type="button"
              onClick={handleSetMyFee}
              disabled={isSettingMine}
              style={{
                padding: "8px 16px",
                background: "#4361ee",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: isSettingMine ? "not-allowed" : "pointer",
              }}
            >
              {isSettingMine ? "Setting…" : "Set My Fee"}
            </button>
          </div>
        </section>
      )}

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
