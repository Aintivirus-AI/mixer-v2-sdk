/**
 * Example: Stake Page
 * 
 * This page demonstrates using the useStake hook for staking/unstaking only.
 * Only staking-related code is loaded, improving page load performance.
 */

"use client";

import React, { useState } from "react";
import { useStake, ChainType } from "../src/hooks";
import { parseEther, formatEther } from "ethers";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x...";

export default function StakePage() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Only import useStake - no deposit/withdraw/claim code loaded!
  const { stake, unstake, isEVMReady } = useStake({
    evm: {
      factoryAddress: FACTORY_ADDRESS,
      // tokenAddress is optional - only needed for token staking
    },
  });

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!isEVMReady) {
      alert("Please connect your wallet");
      return;
    }

    setIsStaking(true);
    setTxHash(null);

    try {
      const amount = parseEther(stakeAmount);
      const result = await stake(ChainType.EVM, amount);
      setTxHash(result.txHash);
      alert(`Stake successful! TX: ${result.txHash}`);
      setStakeAmount(""); // Clear input
    } catch (error: any) {
      console.error("Stake error:", error);
      alert(`Stake failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!isEVMReady) {
      alert("Please connect your wallet");
      return;
    }

    setIsUnstaking(true);
    setTxHash(null);

    try {
      const result = await unstake(ChainType.EVM);
      setTxHash(result.txHash);
      alert(`Unstake successful! TX: ${result.txHash}`);
    } catch (error: any) {
      console.error("Unstake error:", error);
      alert(`Unstake failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsUnstaking(false);
    }
  };

  if (!isEVMReady) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Stake</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please connect your wallet to continue
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Stake & Unstake</h1>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Stake (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isStaking || isUnstaking}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleStake}
            disabled={isStaking || isUnstaking || !stakeAmount}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isStaking ? "Staking..." : "Stake"}
          </button>

          <button
            onClick={handleUnstake}
            disabled={isStaking || isUnstaking}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isUnstaking ? "Unstaking..." : "Unstake All"}
          </button>
        </div>

        {txHash && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>Transaction Hash:</strong>{" "}
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {txHash}
              </a>
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">How it works:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Stake your ETH to earn rewards</li>
          <li>Rewards are distributed based on staking duration and amount</li>
          <li>You can unstake at any time</li>
          <li>Claim rewards separately using the claim page</li>
        </ul>
      </div>
    </div>
  );
}

