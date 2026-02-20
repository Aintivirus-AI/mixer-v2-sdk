import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  usePayment,
  useMixerConfig,
  AintiVirusEVMSubgraph,
} from "@aintivirus-ai/mixer-sdk";
import type {
  PaymentRecord,
  PaymentProcessedEntity,
  TokenUpdatedEntity,
} from "@aintivirus-ai/mixer-sdk";
import { useChainId, useAccount } from "wagmi";
import { id as ethersId, parseEther } from "ethers";

const EXPLORER_TX = (hash: string, chainId?: number) => {
  if (chainId === 1) return `https://etherscan.io/tx/${hash}`;
  return `https://sepolia.etherscan.io/tx/${hash}`;
};

function formatAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Normalize order ID to bytes32: if 0x + 64 hex use as-is, else hash string with ethers.id (keccak256). */
function toOrderIdBytes32(input: string): string {
  const trimmed = input.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return trimmed;
  return ethersId(trimmed || "0");
}

/** Special value for "pay with native ETH" (via Gateway). */
const NATIVE_ETH_OPTION_VALUE = "__NATIVE_ETH__";

/** From TokenUpdated events (desc = newest first), derive current allowed set: first occurrence per token wins. */
function allowedTokensFromEvents(events: TokenUpdatedEntity[]): string[] {
  const byToken = new Map<string, boolean>();
  for (const e of events) {
    const t = e.token.toLowerCase();
    if (!byToken.has(t)) byToken.set(t, e.allowed);
  }
  return [...byToken.entries()].filter(([, a]) => a).map(([t]) => t);
}

export default function Payment() {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentAddress, setPaymentAddress] = useState<string | null>(null);
  const [treasury, setTreasury] = useState<string | null>(null);
  const [tokenAllowed, setTokenAllowed] = useState<boolean | null>(null);
  const [myPayments, setMyPayments] = useState<PaymentRecord[]>([]);
  const [myPaymentsLoading, setMyPaymentsLoading] = useState(false);
  const [allowedTokensList, setAllowedTokensList] = useState<string[]>([]);
  const [allowedTokensLoading, setAllowedTokensLoading] = useState(false);
  const [addTokenInput, setAddTokenInput] = useState("");
  const [orderList, setOrderList] = useState<PaymentProcessedEntity[]>([]);
  const [orderListLoading, setOrderListLoading] = useState(false);
  const [updateTokenLoading, setUpdateTokenLoading] = useState<string | null>(
    null,
  );
  const [tokenError, setTokenError] = useState<string | null>(null);

  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { getEvmChainConfig, evmChainIds } = useMixerConfig();
  const {
    payWithRecipient,
    payWithRecipientViaGateway,
    getPaymentAddress,
    getPaymentDetailsOf,
    isAllowedToken,
    getPaymentTreasury,
    updateAllowedToken,
    isReady,
  } = usePayment();

  const evmChainConfig =
    chainId != null ? getEvmChainConfig(chainId) : undefined;
  const subgraphUrl = evmChainConfig?.subgraphUrl;
  const wethAddress = (
    evmChainConfig as { wethAddress?: string } | undefined
  )?.wethAddress?.toLowerCase();
  const hasGateway = !!(
    evmChainConfig as { wethGatewayAddress?: string } | undefined
  )?.wethGatewayAddress;

  const subgraph = useMemo(() => {
    if (!subgraphUrl) return null;
    return new AintiVirusEVMSubgraph({ endpoint: subgraphUrl });
  }, [subgraphUrl]);

  const getPaymentDetailsOfRef = useRef(getPaymentDetailsOf);
  getPaymentDetailsOfRef.current = getPaymentDetailsOf;

  const fetchPaymentInfo = useCallback(async () => {
    if (!isReady) return;
    try {
      const [addr, treas] = await Promise.all([
        getPaymentAddress(),
        getPaymentTreasury(),
      ]);
      setPaymentAddress(addr);
      setTreasury(treas);
    } catch {
      setPaymentAddress(null);
      setTreasury(null);
    }
  }, [isReady, getPaymentAddress, getPaymentTreasury]);

  useEffect(() => {
    fetchPaymentInfo();
  }, [fetchPaymentInfo]);

  useEffect(() => {
    if (
      !tokenAddress.trim() ||
      tokenAddress === NATIVE_ETH_OPTION_VALUE ||
      !isReady
    ) {
      setTokenAllowed(null);
      return;
    }
    let cancelled = false;
    isAllowedToken(tokenAddress.trim())
      .then((allowed: boolean) => {
        if (!cancelled) setTokenAllowed(allowed);
      })
      .catch(() => {
        if (!cancelled) setTokenAllowed(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tokenAddress, isReady, isAllowedToken]);

  // My Payments: only load when we have a valid payment address; use ref to avoid effect loop
  const hasValidPayment =
    paymentAddress &&
    paymentAddress !== "0x0000000000000000000000000000000000000000";
  useEffect(() => {
    if (!address || !isReady || !hasValidPayment) {
      setMyPayments([]);
      setMyPaymentsLoading(false);
      return;
    }
    let cancelled = false;
    setMyPaymentsLoading(true);
    getPaymentDetailsOfRef
      .current(address)
      .then((list: PaymentRecord[]) => {
        if (!cancelled) setMyPayments(list ?? []);
      })
      .catch(() => {
        if (!cancelled) setMyPayments([]);
      })
      .finally(() => {
        if (!cancelled) setMyPaymentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, isReady, hasValidPayment]);

  // Allowed tokens from subgraph (TokenUpdated events, reduce to current state)
  useEffect(() => {
    if (!subgraph) {
      setAllowedTokensList([]);
      setAllowedTokensLoading(false);
      return;
    }
    let cancelled = false;
    setAllowedTokensLoading(true);
    const sg = subgraph as unknown as {
      getTokenUpdatedList: (p?: {
        first?: number;
        orderDirection?: string;
      }) => Promise<TokenUpdatedEntity[]>;
    };
    sg.getTokenUpdatedList({
      first: 500,
      orderDirection: "desc",
    })
      .then((events) => {
        if (!cancelled) setAllowedTokensList(allowedTokensFromEvents(events));
      })
      .catch(() => {
        if (!cancelled) setAllowedTokensList([]);
      })
      .finally(() => {
        if (!cancelled) setAllowedTokensLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subgraph]);

  // Order list from subgraph
  useEffect(() => {
    if (!subgraph) {
      setOrderList([]);
      setOrderListLoading(false);
      return;
    }
    let cancelled = false;
    setOrderListLoading(true);
    const sg = subgraph as unknown as {
      getPaymentProcessedList: (p?: {
        first?: number;
      }) => Promise<PaymentProcessedEntity[]>;
    };
    sg.getPaymentProcessedList({ first: 30 })
      .then((list) => {
        if (!cancelled) setOrderList(list ?? []);
      })
      .catch(() => {
        if (!cancelled) setOrderList([]);
      })
      .finally(() => {
        if (!cancelled) setOrderListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subgraph]);

  const isPayingWithNativeEth = tokenAddress === NATIVE_ETH_OPTION_VALUE;

  const handlePay = async () => {
    const orderId = toOrderIdBytes32(orderIdInput);
    const buyer = buyerAddress.trim();
    if (!buyer) {
      setPayError("Buyer address is required.");
      return;
    }
    let amount: bigint;
    if (isPayingWithNativeEth) {
      try {
        amount = parseEther(amountInput.trim() || "0");
      } catch {
        setPayError("Invalid amount for ETH (e.g. 0.01).");
        return;
      }
    } else {
      try {
        amount = BigInt(amountInput.trim());
      } catch {
        setPayError(
          "Invalid amount (use integer wei/smallest unit for token).",
        );
        return;
      }
    }
    if (amount <= 0n) {
      setPayError("Amount must be positive.");
      return;
    }
    if (!isReady) {
      setPayError("Wallet not ready. Connect on a supported chain.");
      return;
    }
    if (isPayingWithNativeEth && !hasGateway) {
      setPayError("ETH payment requires WETH Gateway in config.");
      return;
    }
    if (!isPayingWithNativeEth && !tokenAddress.trim()) {
      setPayError("Select a token.");
      return;
    }
    setPayError(null);
    setTxHash(null);
    setIsPaying(true);
    try {
      if (isPayingWithNativeEth) {
        const result = await payWithRecipientViaGateway(orderId, buyer, amount);
        setTxHash(result.txHash);
      } else {
        const result = await payWithRecipient(
          orderId,
          tokenAddress.trim(),
          buyer,
          amount,
        );
        setTxHash(result.txHash);
      }
      await fetchPaymentInfo();
      setMyPayments(await getPaymentDetailsOfRef.current(address!));
    } catch (e) {
      const err = e as Error & {
        reason?: string;
        error?: { message?: string };
      };
      const message = err?.message ?? String(e);
      const reason = err?.reason ?? err?.error?.message;
      setPayError(reason || message || "Payment failed");
    } finally {
      setIsPaying(false);
    }
  };

  const handleAddToken = async () => {
    const token = addTokenInput.trim();
    if (!token) return;
    setTokenError(null);
    setUpdateTokenLoading(token);
    try {
      await updateAllowedToken(token, true);
      setAddTokenInput("");
      const events = await (
        subgraph as unknown as {
          getTokenUpdatedList: (p?: object) => Promise<TokenUpdatedEntity[]>;
        }
      ).getTokenUpdatedList({ first: 500, orderDirection: "desc" });
      setAllowedTokensList(allowedTokensFromEvents(events));
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : "Failed to add token");
    } finally {
      setUpdateTokenLoading(null);
    }
  };

  const handleRemoveToken = async (token: string) => {
    setTokenError(null);
    setUpdateTokenLoading(token);
    try {
      await updateAllowedToken(token, false);
      const events = await (
        subgraph as unknown as {
          getTokenUpdatedList: (p?: object) => Promise<TokenUpdatedEntity[]>;
        }
      ).getTokenUpdatedList({ first: 500, orderDirection: "desc" });
      setAllowedTokensList(allowedTokensFromEvents(events));
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : "Failed to remove token");
    } finally {
      setUpdateTokenLoading(null);
    }
  };

  const wrongNetwork =
    isConnected &&
    chainId != null &&
    evmChainIds.length > 0 &&
    !evmChainIds.includes(chainId);

  if (!isConnected) {
    return (
      <div
        style={{
          padding: 24,
          background: "#fef3c7",
          borderRadius: 8,
          border: "1px solid #f59e0b",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Payment</h2>
        <p style={{ margin: 0 }}>
          Connect your wallet to use payment. You pay with ERC20 tokens (approve
          the payment contract first if needed).
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
        <h2 style={{ marginTop: 0 }}>Payment</h2>
        <p style={{ margin: 0 }}>
          Switch to a supported chain (e.g. Sepolia) to use payment.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Payment</h2>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
        Select a token, then enter order ID, buyer, and amount.{" "}
        <strong>ETH</strong>: only via Gateway (native ETH).{" "}
        <strong>WETH / ERC20</strong>: payment contract (allowance is applied
        automatically if needed; first Pay may send approve then pay).
      </p>

      {(paymentAddress == null ||
        paymentAddress === "0x0000000000000000000000000000000000000000") && (
        <div
          style={{
            padding: 12,
            background: "#fef3c7",
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          No payment contract set on the factory for this chain. Admin must set
          it on the Admin tab.
        </div>
      )}

      <div
        style={{
          background: "white",
          padding: 24,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxWidth: 480,
          marginBottom: 24,
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>
          Pay with recipient
        </h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
            Order ID (bytes32 hex or any string to hash)
          </label>
          <input
            type="text"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            placeholder="0x... or e.g. order-123"
            style={{
              width: "100%",
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: 13,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
            Token
          </label>
          <select
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: 13,
              border: "1px solid #ccc",
              borderRadius: 6,
              background: "white",
            }}
          >
            <option value="">Select token</option>
            {hasGateway && (
              <option value={NATIVE_ETH_OPTION_VALUE}>ETH (via Gateway)</option>
            )}
            {allowedTokensList.map((t) => (
              <option key={t} value={t}>
                {wethAddress && t.toLowerCase() === wethAddress
                  ? `WETH (${formatAddress(t)})`
                  : formatAddress(t)}
              </option>
            ))}
          </select>
          {isPayingWithNativeEth && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#059669" }}>
              Paying with native ETH via Gateway. Enter amount in ETH (e.g.
              0.01).
            </p>
          )}
          {!isPayingWithNativeEth && tokenAddress && tokenAllowed !== null && (
            <span
              style={{
                fontSize: 12,
                color: tokenAllowed ? "#059669" : "#b91c1c",
                marginLeft: 8,
              }}
            >
              {tokenAllowed ? "Allowed" : "Not allowed"}
            </span>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
            Buyer / recipient address
          </label>
          <input
            type="text"
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
            placeholder="0x..."
            style={{
              width: "100%",
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: 13,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
            {isPayingWithNativeEth
              ? "Amount (ETH, e.g. 0.01)"
              : "Amount (smallest unit / wei)"}
          </label>
          <input
            type="text"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder={
              isPayingWithNativeEth ? "0.01" : "e.g. 1000000000000000000"
            }
            style={{
              width: "100%",
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: 13,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
        </div>
        {payError && (
          <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 12 }}>
            {payError}
          </p>
        )}
        {txHash && (
          <p style={{ fontSize: 14, marginBottom: 12 }}>
            <a
              href={EXPLORER_TX(txHash, chainId ?? undefined)}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          </p>
        )}
        <button
          type="button"
          onClick={handlePay}
          disabled={
            isPaying ||
            !isReady ||
            !paymentAddress ||
            paymentAddress === "0x0000000000000000000000000000000000000000" ||
            !tokenAddress ||
            (isPayingWithNativeEth && !hasGateway)
          }
          style={{
            padding: "10px 20px",
            background: "#4361ee",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: isPaying ? "wait" : "pointer",
          }}
        >
          {isPaying ? "Processing…" : "Pay"}
        </button>
      </div>

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
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>Allowed tokens</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px 0" }}>
          Tokens allowed for payment (from subgraph). Add/remove requires
          DEFAULT_ADMIN_ROLE on the payment contract.
        </p>
        {tokenError && (
          <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 8 }}>
            {tokenError}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={addTokenInput}
            onChange={(e) => setAddTokenInput(e.target.value)}
            placeholder="Token address to add"
            style={{
              flex: "1",
              minWidth: 200,
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: 13,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
          <button
            type="button"
            onClick={handleAddToken}
            disabled={!addTokenInput.trim() || !!updateTokenLoading || !isReady}
            style={{
              padding: "8px 16px",
              background: "#059669",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Add token
          </button>
        </div>
        {allowedTokensLoading ? (
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
            Loading allowed tokens…
          </p>
        ) : allowedTokensList.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
            No allowed tokens indexed yet. Add one above (admin).
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            {allowedTokensList.map((t) => (
              <li
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontFamily: "monospace" }}>
                  {formatAddress(t)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveToken(t)}
                  disabled={updateTokenLoading !== null}
                  style={{
                    padding: "4px 10px",
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {updateTokenLoading === t ? "…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
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
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>Order list</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px 0" }}>
          Recent payments (from subgraph).
        </p>
        {orderListLoading ? (
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
            Loading orders…
          </p>
        ) : orderList.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
            No orders yet.
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
                  Order ID
                </th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>
                  Buyer
                </th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>
                  Token
                </th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>
                  Amount
                </th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>
                  Block
                </th>
              </tr>
            </thead>
            <tbody>
              {orderList.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                    {formatAddress(o.orderId)}
                  </td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                    {formatAddress(o.buyer)}
                  </td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                    {formatAddress(o.token)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    {o.amount.toString()}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    {o.blockNumber.toString()}
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
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>
            Payment contract info
          </h3>
          {paymentAddress && (
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Contract: </span>
                <span style={{ fontFamily: "monospace" }}>
                  {formatAddress(paymentAddress)}
                </span>
              </div>
              {treasury && (
                <div>
                  <span style={{ color: "#64748b" }}>Treasury: </span>
                  <span style={{ fontFamily: "monospace" }}>
                    {formatAddress(treasury)}
                  </span>
                </div>
              )}
            </div>
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
            My payments (as buyer)
          </h3>
          {!hasValidPayment ? (
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              No payment contract set.
            </p>
          ) : myPaymentsLoading ? (
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              Loading…
            </p>
          ) : myPayments.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              No payments for your address.
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
                  <th style={{ textAlign: "left", padding: "8px 8px 8px 0" }}>
                    Order ID
                  </th>
                  <th style={{ textAlign: "right", padding: "8px" }}>Amount</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Token</th>
                </tr>
              </thead>
              <tbody>
                {myPayments.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td
                      style={{
                        padding: "8px 8px 8px 0",
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                    >
                      {formatAddress(p.orderId)}
                    </td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      {p.amount.toString()}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatAddress(p.token)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
