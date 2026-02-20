import { useState } from "react";
import { useDeploy, useMixerConfig, useMixer } from "@aintivirus-ai/mixer-sdk";
import { parseEther, parseUnits } from "ethers";
import { useChainId, useAccount } from "wagmi";

const EXPLORER_TX = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`;

type AssetKind = "ETH" | "token";

export default function Deploy() {
  const [amount, setAmount] = useState("1.0");
  const [assetKind, setAssetKind] = useState<AssetKind>("ETH");
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mixerAddress, setMixerAddress] = useState<string | null>(null);

  const chainId = useChainId();

  const { isConnected } = useAccount();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();
  const evmChainConfig =
    chainId != null ? getEvmChainConfig(chainId) : undefined;
  const wethAddress = (evmChainConfig as { wethAddress?: string } | undefined)
    ?.wethAddress;

  const mixer = useMixer();
  const { deployMixer, isReady: isReadyFromHook } = useDeploy();
  const isReady = isReadyFromHook ?? false;
  const defaultTokenAddress = evmChainConfig?.tokenAddress ?? "";
  const tokenAddress = customTokenAddress.trim() || defaultTokenAddress;
  const evmSDK = mixer?.getActiveEVM?.() ?? null;

  const handleDeploy = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (assetKind === "token" && !tokenAddress) {
      alert("Please enter a token address or set VITE_TOKEN_ADDRESS in .env");
      return;
    }
    if (assetKind === "token" && !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      alert("Token address must be a valid 0x… address");
      return;
    }
    if (assetKind === "ETH" && !wethAddress) {
      alert(
        "WETH address not configured. Set VITE_WETH_ADDRESS in .env for ETH pools.",
      );
      return;
    }
    if (!isReady) {
      alert("Please connect your wallet on a supported chain (from config).");
      return;
    }
    setIsDeploying(true);
    setTxHash(null);
    setMixerAddress(null);
    try {
      const assetAddress = assetKind === "ETH" ? wethAddress! : tokenAddress;
      let amountBigInt: bigint;
      if (assetKind === "ETH") {
        amountBigInt = parseEther(amount);
      } else {
        if (!evmSDK) throw new Error("EVM SDK not ready");
        const decimals = await evmSDK.getAssetDecimals(assetAddress);
        amountBigInt = parseUnits(amount, decimals);
      }
      const result = await deployMixer(assetAddress, amountBigInt);
      setTxHash(result.txHash);
      if (result.mixerAddress) setMixerAddress(result.mixerAddress);
    } catch (error: unknown) {
      console.error("Deploy error:", error);
      alert(
        `Deploy failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsDeploying(false);
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
            Please connect your wallet to deploy a mixer. Use the{" "}
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
      <h2 style={{ marginTop: 0 }}>Deploy New Mixer</h2>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
        Choose native ETH or any ERC20 token by address. The protocol supports
        multiple tokens.
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
            Asset
          </label>
          <select
            value={assetKind}
            onChange={(e) => setAssetKind(e.target.value as AssetKind)}
            disabled={isDeploying}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          >
            <option value="ETH">ETH (native)</option>
            <option value="token">Token (ERC20)</option>
          </select>
        </div>

        {assetKind === "token" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, marginBottom: 8 }}>
              Token contract address
            </label>
            <input
              type="text"
              value={customTokenAddress}
              onChange={(e) => setCustomTokenAddress(e.target.value)}
              placeholder={defaultTokenAddress || "0x…"}
              disabled={isDeploying}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 13,
              }}
            />
            {defaultTokenAddress && !customTokenAddress && (
              <p
                style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b" }}
              >
                Using default from .env (VITE_TOKEN_ADDRESS)
              </p>
            )}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 8 }}>
            Fixed amount per deposit (
            {assetKind === "ETH"
              ? "ETH"
              : "human amount; decimals read from token contract"}
            )
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={isDeploying}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleDeploy}
          disabled={isDeploying}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {isDeploying ? "Deploying…" : "Deploy Mixer"}
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
            {mixerAddress && (
              <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
                <strong>Mixer:</strong>{" "}
                <span style={{ wordBreak: "break-all" }}>{mixerAddress}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
