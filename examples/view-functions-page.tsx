/**
 * Example: View Functions Page
 * 
 * This page demonstrates using the useView hook for reading contract data.
 * Only view/read-only code is loaded.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useView, ChainType, AssetMode } from "../src/hooks";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "ethers";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x...";

export default function ViewFunctionsPage() {
  const { address } = useAccount();
  const [mixerAmount, setMixerAmount] = useState("1.0");
  const [mixerAddress, setMixerAddress] = useState<string | null>(null);
  const [mixerExists, setMixerExists] = useState<boolean | null>(null);
  const [feeRate, setFeeRate] = useState<bigint | null>(null);
  const [currentSeason, setCurrentSeason] = useState<bigint | null>(null);
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [stakerRecord, setStakerRecord] = useState<any>(null);

  const {
    getMixer,
    mixerExists: checkMixerExists,
    getFeeRate,
    getCurrentSeason,
    getEthBalance,
    getTokenBalance,
    getStakerRecord,
    isEVMReady,
  } = useView({
    evm: {
      factoryAddress: FACTORY_ADDRESS,
    },
  });

  useEffect(() => {
    if (isEVMReady) {
      loadData();
    }
  }, [isEVMReady, mixerAmount]);

  const loadData = async () => {
    try {
      const amount = parseEther(mixerAmount);
      
      // Load mixer info
      const mixer = await getMixer(ChainType.EVM, AssetMode.ETH, amount);
      setMixerAddress(mixer);
      
      const exists = await checkMixerExists(ChainType.EVM, AssetMode.ETH, amount);
      setMixerExists(exists);

      // Load fee rate
      const rate = await getFeeRate(ChainType.EVM);
      setFeeRate(rate);

      // Load current season
      const season = await getCurrentSeason(ChainType.EVM);
      setCurrentSeason(season);

      // Load balances if address is available
      if (address) {
        const ethBal = await getEthBalance(ChainType.EVM, address);
        setEthBalance(ethBal);

        const tokenBal = await getTokenBalance(ChainType.EVM, address);
        setTokenBalance(tokenBal);

        const record = await getStakerRecord(ChainType.EVM, address);
        setStakerRecord(record);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">View Contract Data</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mixer Info */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Mixer Information</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (ETH)
              </label>
              <input
                type="number"
                step="0.1"
                value={mixerAmount}
                onChange={(e) => setMixerAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="text-sm">
              <p><strong>Mixer Address:</strong> {mixerAddress || "Not deployed"}</p>
              <p><strong>Exists:</strong> {mixerExists ? "Yes" : "No"}</p>
            </div>
          </div>
        </div>

        {/* Fee Info */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Fee Information</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Fee Rate:</strong>{" "}
              {feeRate !== null
                ? `${(Number(feeRate) / 10000).toFixed(2)}%`
                : "Loading..."}
            </p>
            <p>
              <strong>Current Season:</strong>{" "}
              {currentSeason !== null ? currentSeason.toString() : "Loading..."}
            </p>
          </div>
        </div>

        {/* User Balances */}
        {address && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Balances</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>ETH Balance:</strong>{" "}
                {ethBalance !== null
                  ? formatEther(ethBalance)
                  : "Loading..."}
              </p>
              <p>
                <strong>Token Balance:</strong>{" "}
                {tokenBalance !== null
                  ? formatEther(tokenBalance)
                  : "Loading..."}
              </p>
            </div>
          </div>
        )}

        {/* Staker Record */}
        {address && stakerRecord && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Staking Record</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Staked ETH:</strong>{" "}
                {formatEther(stakerRecord.stakedEthAmount || 0n)}
              </p>
              <p>
                <strong>Staked Tokens:</strong>{" "}
                {formatEther(stakerRecord.stakedTokenAmount || 0n)}
              </p>
              <p>
                <strong>ETH Season:</strong>{" "}
                {stakerRecord.ethStakedSeasonId?.toString() || "N/A"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

