import { useEffect, useMemo, useState } from "react";
import { useChainId } from "wagmi";
import {
  useMixerConfig,
  AintiVirusEVMSubgraph,
} from "@aintivirus-ai/mixer-sdk";
import type { ProtocolState, MixerPool, DepositEntity, WithdrawalEntity } from "@aintivirus-ai/mixer-sdk";

function formatBigInt(v: bigint): string {
  return v.toString();
}

function formatAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Subgraph() {
  const chainId = useChainId();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();
  const evmConfig = chainId != null ? getEvmChainConfig(chainId) : undefined;
  const subgraphUrl = evmConfig?.subgraphUrl;

  const [protocol, setProtocol] = useState<ProtocolState | null>(null);
  const [pools, setPools] = useState<MixerPool[]>([]);
  const [deposits, setDeposits] = useState<DepositEntity[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subgraph = useMemo(() => {
    if (!subgraphUrl) return null;
    return new AintiVirusEVMSubgraph({ endpoint: subgraphUrl });
  }, [subgraphUrl]);

  useEffect(() => {
    if (!subgraph) {
      setLoading(false);
      setProtocol(null);
      setPools([]);
      setDeposits([]);
      setWithdrawals([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [protocolData, poolsData, depositsData, withdrawalsData] =
          await Promise.all([
            subgraph.getProtocolData(),
            subgraph.getMixerPools({ first: 20 }),
            subgraph.getDeposits({ first: 15 }),
            subgraph.getWithdrawals({ first: 15 }),
          ]);

        if (cancelled) return;
        setProtocol(protocolData ?? null);
        setPools(poolsData ?? []);
        setDeposits(depositsData ?? []);
        setWithdrawals(withdrawalsData ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Subgraph request failed");
          setProtocol(null);
          setPools([]);
          setDeposits([]);
          setWithdrawals([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subgraph]);

  const wrongNetwork =
    chainId != null &&
    evmChainIds.length > 0 &&
    !evmChainIds.includes(chainId);

  if (!subgraphUrl) {
    return (
      <div
        style={{
          padding: 24,
          background: "#fef3c7",
          borderRadius: 8,
          border: "1px solid #f59e0b",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Subgraph</h2>
        <p style={{ margin: 0 }}>
          No subgraph URL configured for this chain. Set{" "}
          <strong>VITE_SUBGRAPH_URL</strong> in <code>.env</code> and ensure
          your chain config includes <code>subgraphUrl</code>.
        </p>
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <div
        style={{
          padding: 24,
          background: "#fef3c7",
          borderRadius: 8,
          border: "1px solid #f59e0b",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Subgraph</h2>
        <p style={{ margin: 0 }}>
          Switch to a supported chain (e.g. Sepolia) to load subgraph data.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Subgraph</h2>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
        Protocol stats, mixer pools, and recent deposits/withdrawals from the
        subgraph.
      </p>

      {loading && (
        <p style={{ color: "#64748b" }}>Loading subgraph data…</p>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            background: "#fef2f2",
            borderRadius: 6,
            marginBottom: 16,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && protocol && (
        <>
          <section
            style={{
              background: "white",
              padding: 20,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>Protocol</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 12,
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>Fee rate</span>
                <div>{formatBigInt(protocol.feeRate)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Current season</span>
                <div>{formatBigInt(protocol.currentSeasonId)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Total deposited</span>
                <div>{formatBigInt(protocol.totalDeposited)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Total withdrawn</span>
                <div>{formatBigInt(protocol.totalWithdrawn)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Deposits #</span>
                <div>{formatBigInt(protocol.depositCount)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Withdrawals #</span>
                <div>{formatBigInt(protocol.withdrawalCount)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Total staked</span>
                <div>{formatBigInt(protocol.totalStaked)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Total claimed</span>
                <div>{formatBigInt(protocol.totalClaimed)}</div>
              </div>
            </div>
          </section>

          <section
            style={{
              background: "white",
              padding: 20,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: 24,
              overflowX: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>
              Mixer pools ({pools.length})
            </h3>
            {pools.length === 0 ? (
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                No pools yet.
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>
                      Pool id
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>
                      Asset
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px" }}>
                      Amount
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>
                      Address
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px" }}>
                      Deposits
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 12px" }}>
                      Withdrawals
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((p) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                        {p.id.slice(0, 20)}…
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                        {formatAddress(p.asset)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        {formatBigInt(p.amount)}
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                        {formatAddress(p.address)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        {formatBigInt(p.depositCount)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        {formatBigInt(p.withdrawalCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
          >
            <section
              style={{
                background: "white",
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                overflowX: "auto",
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>
                Recent deposits ({deposits.length})
              </h3>
              {deposits.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                  No deposits yet.
                </p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        Pool
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        Commitment
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 12px" }}>
                        Block
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((d) => (
                      <tr
                        key={d.id}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                          {d.pool?.id?.slice(0, 16)}…
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                          {formatAddress(d.commitment)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          {formatBigInt(d.blockNumber)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section
              style={{
                background: "white",
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                overflowX: "auto",
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>
                Recent withdrawals ({withdrawals.length})
              </h3>
              {withdrawals.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                  No withdrawals yet.
                </p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        To
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        Nullifier
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 12px" }}>
                        Block
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr
                        key={w.id}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                          {formatAddress(w.to)}
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                          {formatAddress(w.nullifierHash)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          {formatBigInt(w.blockNumber)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
