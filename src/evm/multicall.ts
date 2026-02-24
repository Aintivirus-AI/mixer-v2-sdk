/**
 * Multicall3 aggregate for batch read calls. Uses standard Multicall3 address.
 * When a call fails (success: false), returnData is still returned (e.g. revert reason).
 */

import type { Provider } from "ethers";
import { Contract } from "ethers";
import { MulticallError } from "../errors";

/** Standard Multicall3 address (same on many EVM chains) */
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)",
];

export interface MulticallCall {
  target: string;
  callData: string;
}

export interface MulticallResult {
  success: boolean;
  returnData: string;
}

/**
 * Execute multiple view calls in one RPC via Multicall3.
 * @param provider Ethers provider
 * @param calls Array of { target, callData }
 * @param multicallAddress Optional; defaults to MULTICALL3_ADDRESS
 * @returns Array of { success, returnData } in same order as calls
 * @throws MulticallError on aggregate failure (e.g. contract not deployed on chain)
 */
export async function multicall(
  provider: Provider,
  calls: MulticallCall[],
  multicallAddress: string = MULTICALL3_ADDRESS,
): Promise<MulticallResult[]> {
  if (calls.length === 0) return [];

  try {
    const contract = new Contract(
      multicallAddress,
      MULTICALL3_ABI,
      provider,
    );
    const structCalls = calls.map((c) => ({
      target: c.target,
      allowFailure: true,
      callData: c.callData,
    }));
    const returnData = await contract.aggregate3(structCalls);
    return returnData.map((r: { success: boolean; returnData: string }) => ({
      success: r.success,
      returnData: typeof r.returnData === "string" ? r.returnData : r.returnData,
    }));
  } catch (err) {
    throw new MulticallError(
      "Multicall aggregate failed",
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}
