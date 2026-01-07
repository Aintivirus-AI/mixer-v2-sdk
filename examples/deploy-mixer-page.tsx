/**
 * Example: Deploy Mixer Page
 * 
 * This page demonstrates using the useDeploy hook to deploy new mixer instances.
 */

"use client";

import React, { useState } from "react";
import { useDeploy, ChainType, AssetMode } from "../src/hooks";
import { parseEther } from "ethers";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x...";

export default function DeployMixerPage() {
  const [amount, setAmount] = useState("1.0");
  const [mode, setMode] = useState<AssetMode>(AssetMode.ETH);
  const [isDeploying, setIsDeploying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mixerAddress, setMixerAddress] = useState<string | null>(null);

  const { deployMixer, isEVMReady } = useDeploy({
    evm: {
      factoryAddress: FACTORY_ADDRESS,
    },
  });

  const handleDeploy = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!isEVMReady) {
      alert("Please connect your wallet");
      return;
    }

    setIsDeploying(true);
    setTxHash(null);
    setMixerAddress(null);

    try {
      const amountBigInt = parseEther(amount);
      const result = await deployMixer(ChainType.EVM, mode, amountBigInt);
      
      setTxHash(result.txHash);
      if (result.mixerAddress) {
        setMixerAddress(result.mixerAddress);
      }
      
      alert(`Mixer deployed successfully! TX: ${result.txHash}`);
    } catch (error: any) {
      console.error("Deploy error:", error);
      alert(`Deploy failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isEVMReady) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Deploy Mixer</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please connect your wallet to continue
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Deploy New Mixer</h1>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(Number(e.target.value) as AssetMode)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            disabled={isDeploying}
          >
            <option value={AssetMode.ETH}>ETH</option>
            <option value={AssetMode.TOKEN}>Token</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fixed Amount ({mode === AssetMode.ETH ? "ETH" : "Tokens"})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.0"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isDeploying}
          />
        </div>

        <button
          onClick={handleDeploy}
          disabled={isDeploying || !amount}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isDeploying ? "Deploying..." : "Deploy Mixer"}
        </button>

        {txHash && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800 mb-2">
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
            {mixerAddress && (
              <p className="text-sm text-green-800">
                <strong>Mixer Address:</strong>{" "}
                <a
                  href={`https://etherscan.io/address/${mixerAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {mixerAddress}
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">How it works:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Deploy a new mixer instance for a specific asset mode and amount</li>
          <li>Each mixer handles deposits and withdrawals for a fixed amount</li>
          <li>Mixers are deployed on-demand when needed</li>
          <li>The mixer address is returned after deployment</li>
        </ul>
      </div>
    </div>
  );
}

