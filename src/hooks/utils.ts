/**
 * Shared utility functions for hooks
 */

/**
 * Create ethers provider from viem public client.
 * Implements getFeeData so ethers (and our signer) get correct gas fees instead of overpaying.
 */
export function createEthersProviderFromViem(publicClient: any): any {
  if (!publicClient) return null;

  return {
    getBalance: async (address: string) => {
      const balance = await publicClient.getBalance({ address });
      return BigInt(balance.toString());
    },
    getBlock: async (blockTag: string | number) => {
      const block = await publicClient.getBlock({
        blockNumber:
          typeof blockTag === "string" && blockTag.startsWith("0x")
            ? BigInt(blockTag)
            : BigInt(Number(blockTag)),
      });
      return block
        ? { number: block.number, timestamp: block.timestamp }
        : null;
    },
    getTransaction: async (hash: string) => {
      return publicClient.getTransaction({ hash });
    },
    getTransactionReceipt: async (hash: string) => {
      try {
        return await publicClient.getTransactionReceipt({ hash });
      } catch (err: any) {
        if (err?.name === "TransactionReceiptNotFoundError" || err?.message?.includes("could not be found")) {
          return null;
        }
        throw err;
      }
    },
    waitForTransaction: async (hash: string) => {
      return publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 90_000,
        retryCount: 24,
        retryDelay: 2000,
      });
    },
    /** Ethers expects a hex string; viem returns { data?: Hex }. Return only data so contract view calls decode correctly. */
    call: async (params: any) => {
      const result = await publicClient.call(params);
      return result?.data ?? "0x";
    },
    estimateGas: async (params: any) => {
      return publicClient.estimateGas(params);
    },
    /** Fee data for tx gas; uses viem's estimateFeesPerGas (EIP-1559 or legacy). */
    getFeeData: async () => {
      const fees = await publicClient.estimateFeesPerGas().catch(() => null);
      if (!fees) return { gasPrice: null, maxFeePerGas: null, maxPriorityFeePerGas: null };
      return {
        gasPrice: fees.gasPrice ?? null,
        maxFeePerGas: fees.maxFeePerGas ?? null,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas ?? null,
      };
    },
  };
}

/**
 * Create ethers signer from viem wallet client.
 * Populates gas and fee data when missing so we don't overpay (e.g. 0.1 ETH fee).
 */
export function createEthersSignerFromViem(
  walletClient: any,
  publicClient: any,
): any {
  if (!walletClient || !publicClient) return null;

  const provider = createEthersProviderFromViem(publicClient);
  if (!provider) return null;

  return {
    ...walletClient,
    provider,
    getAddress: async () => walletClient.account.address,
    signMessage: async (message: string | Uint8Array) => {
      const msg =
        typeof message === "string"
          ? message
          : new TextDecoder().decode(message);
      return walletClient.signMessage({ message: msg });
    },
    sendTransaction: async (tx: any) => {
      const viemRequest: Record<string, unknown> = {
        to: tx.to,
        value: tx.value ? BigInt(tx.value.toString()) : undefined,
        data: tx.data,
      };

      let gasLimit = tx.gasLimit
        ? BigInt(tx.gasLimit.toString())
        : undefined;
      if (gasLimit == null && provider.estimateGas) {
        try {
          gasLimit = await provider.estimateGas({
            to: tx.to,
            data: tx.data,
            value: tx.value,
          });
          if (gasLimit != null) gasLimit = (gasLimit as bigint) * 110n / 100n;
        } catch {
          // leave undefined; wallet will estimate
        }
      }
      if (gasLimit != null) viemRequest.gas = gasLimit;

      if (tx.maxFeePerGas != null) viemRequest.maxFeePerGas = BigInt(tx.maxFeePerGas.toString());
      if (tx.maxPriorityFeePerGas != null) viemRequest.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas.toString());
      if (tx.gasPrice != null) viemRequest.gasPrice = BigInt(tx.gasPrice.toString());
      if (!viemRequest.maxFeePerGas && !viemRequest.gasPrice && provider.getFeeData) {
        const fd = await provider.getFeeData();
        if (fd?.maxFeePerGas != null) viemRequest.maxFeePerGas = fd.maxFeePerGas;
        if (fd?.maxPriorityFeePerGas != null) viemRequest.maxPriorityFeePerGas = fd.maxPriorityFeePerGas;
        if (fd?.gasPrice != null) viemRequest.gasPrice = fd.gasPrice;
      }

      const hash = await walletClient.sendTransaction(viemRequest);
      return { hash };
    },
  };
}
