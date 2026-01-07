/**
 * Shared utility functions for hooks
 */

/**
 * Create ethers provider from viem public client
 */
export function createEthersProviderFromViem(publicClient: any): any {
  if (!publicClient) return null;

  return {
    getBalance: async (address: string) => {
      const balance = await publicClient.getBalance({ address });
      return BigInt(balance.toString());
    },
    getTransaction: async (hash: string) => {
      return publicClient.getTransaction({ hash });
    },
    getTransactionReceipt: async (hash: string) => {
      return publicClient.getTransactionReceipt({ hash });
    },
    waitForTransaction: async (hash: string) => {
      return publicClient.waitForTransactionReceipt({ hash });
    },
    call: async (params: any) => {
      return publicClient.call(params);
    },
    estimateGas: async (params: any) => {
      return publicClient.estimateGas(params);
    },
  };
}

/**
 * Create ethers signer from viem wallet client
 */
export function createEthersSignerFromViem(
  walletClient: any,
  publicClient: any
): any {
  if (!walletClient) return null;

  const provider = createEthersProviderFromViem(publicClient);

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
      const viemTx = {
        to: tx.to,
        value: tx.value ? BigInt(tx.value.toString()) : undefined,
        data: tx.data,
        gas: tx.gasLimit ? BigInt(tx.gasLimit.toString()) : undefined,
        gasPrice: tx.gasPrice ? BigInt(tx.gasPrice.toString()) : undefined,
      };
      const hash = await walletClient.sendTransaction(viemTx);
      return { hash };
    },
  };
}
