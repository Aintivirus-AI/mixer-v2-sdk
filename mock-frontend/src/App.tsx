import { useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { useMixerConfig } from "@aintivirus-ai/mixer-sdk";
import Admin from "./pages/Admin";
import Deploy from "./pages/Deploy";
import Partners from "./pages/Partners";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Payment from "./pages/Payment";
import Stake from "./pages/Stake";
import Subgraph from "./pages/Subgraph";

type Tab = "admin" | "partners" | "deploy" | "deposit" | "withdraw" | "payment" | "stake" | "subgraph";

function App() {
  const [tab, setTab] = useState<Tab>("deploy");
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const {
    switchChainAsync,
    isPending: isSwitchingChain,
    chains,
  } = useSwitchChain();
  const { evmChainIds } = useMixerConfig();
  const supportedChains = chains.filter((c) => evmChainIds.includes(c.id));

  const handleChainSelect = async (targetChainId: number) => {
    if (targetChainId === chainId) return;
    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch (e) {
      console.error("Failed to switch chain:", e);
    }
  };

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header
        style={{
          background: "#1a1a2e",
          color: "#eee",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>
          AintiVirus Mixer SDK – Deploy
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {supportedChains.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.875rem", color: "#aaa" }}>
                Chain:
              </span>
              <select
                value={
                  supportedChains.some((c) => c.id === chainId)
                    ? chainId
                    : (supportedChains[0]?.id ?? "")
                }
                onChange={(e) =>
                  handleChainSelect(
                    Number((e.target as HTMLSelectElement).value),
                  )
                }
                disabled={!isConnected || isSwitchingChain}
                style={{
                  padding: "6px 10px",
                  background: "#16213e",
                  color: "#eee",
                  border: "1px solid #444",
                  borderRadius: 6,
                  fontSize: "0.875rem",
                  cursor: isConnected ? "pointer" : "not-allowed",
                }}
              >
                {supportedChains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {chainId === c.id ? " (current)" : ""}
                  </option>
                ))}
              </select>
              {isSwitchingChain && (
                <span style={{ fontSize: "0.75rem", color: "#aaa" }}>
                  Switching…
                </span>
              )}
            </div>
          )}
          {!isConnected ? (
            <button
              type="button"
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isPending}
              style={{
                padding: "8px 16px",
                background: "#4361ee",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {isPending ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <>
              <span style={{ fontSize: "0.875rem" }}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                type="button"
                onClick={() => disconnect()}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "#ccc",
                  border: "1px solid #555",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </header>

      <nav
        style={{
          display: "flex",
          gap: 0,
          padding: "0 24px",
          background: "#16213e",
          borderBottom: "1px solid #2a2a4a",
        }}
      >
        <button
          type="button"
          onClick={() => setTab("admin")}
          style={{
            padding: "12px 20px",
            background: tab === "admin" ? "#1a1a2e" : "transparent",
            color: tab === "admin" ? "#fff" : "#aaa",
            border: "none",
            borderBottom:
              tab === "admin" ? "2px solid #4361ee" : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Admin
        </button>
        <button
          type="button"
          onClick={() => setTab("partners")}
          style={{
            padding: "12px 20px",
            background: tab === "partners" ? "#1a1a2e" : "transparent",
            color: tab === "partners" ? "#fff" : "#aaa",
            border: "none",
            borderBottom:
              tab === "partners" ? "2px solid #4361ee" : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Partners
        </button>
        <button
          type="button"
          onClick={() => setTab("deploy")}
          style={{
            padding: "12px 20px",
            background: tab === "deploy" ? "#1a1a2e" : "transparent",
            color: tab === "deploy" ? "#fff" : "#aaa",
            border: "none",
            borderBottom:
              tab === "deploy" ? "2px solid #4361ee" : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Deploy
        </button>
        <button
          type="button"
          onClick={() => setTab("deposit")}
          style={{
            padding: "12px 20px",
            background: tab === "deposit" ? "#1a1a2e" : "transparent",
            color: tab === "deposit" ? "#fff" : "#aaa",
            border: "none",
            borderBottom:
              tab === "deposit" ? "2px solid #4361ee" : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setTab("withdraw")}
          style={{
            padding: "12px 20px",
            background: tab === "withdraw" ? "#1a1a2e" : "transparent",
            color: tab === "withdraw" ? "#fff" : "#aaa",
            border: "none",
            borderBottom:
              tab === "withdraw"
                ? "2px solid #4361ee"
                : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Withdraw
        </button>
        <button
          type="button"
          onClick={() => setTab("payment")}
          style={{
            padding: "12px 20px",
            background: tab === "payment" ? "#1a1a2e" : "transparent",
            color: tab === "payment" ? "#fff" : "#aaa",
            border: "none",
            borderBottom:
              tab === "payment"
                ? "2px solid #4361ee"
                : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Payment
        </button>
        <button
          type="button"
          onClick={() => setTab("stake")}
          style={{
            padding: "12px 20px",
            background: tab === "stake" ? "#1a1a2e" : "transparent",
            color: tab === "stake" ? "#fff" : "#aaa",
            border: "none",
            borderBottom:
              tab === "stake" ? "2px solid #4361ee" : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Stake
        </button>
        <button
          type="button"
          onClick={() => setTab("subgraph")}
          style={{
            padding: "12px 20px",
            background: tab === "subgraph" ? "#1a1a2e" : "transparent",
            color: tab === "subgraph" ? "#fff" : "#aaa",
            border: "none",
            borderBottom:
              tab === "subgraph"
                ? "2px solid #4361ee"
                : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Subgraph
        </button>
      </nav>

      <main
        style={{
          flex: 1,
          padding: 24,
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {tab === "admin" && <Admin />}
        {tab === "partners" && <Partners />}
        {tab === "deploy" && <Deploy />}
        {tab === "deposit" && <Deposit />}
        {tab === "withdraw" && <Withdraw />}
        {tab === "payment" && <Payment />}
        {tab === "stake" && <Stake />}
        {tab === "subgraph" && <Subgraph />}
      </main>
    </div>
  );
}

export default App;
