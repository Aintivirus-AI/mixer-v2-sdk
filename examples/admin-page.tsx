/**
 * Example: Admin Page
 * 
 * This page demonstrates using the useAdmin hook for admin operations.
 * Requires OPERATOR_ROLE or ADMIN_ROLE on the contract.
 */

"use client";

import React, { useState } from "react";
import { useAdmin, ChainType } from "../src/hooks";
import { parseEther } from "ethers";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x...";

export default function AdminPage() {
  const [feeRate, setFeeRate] = useState("");
  const [seasonPeriod, setSeasonPeriod] = useState("");
  const [verifierAddress, setVerifierAddress] = useState("");
  const [hasherAddress, setHasherAddress] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    setFeeRate: updateFeeRate,
    setStakingSeasonPeriod,
    startStakeSeason,
    setVerifier,
    setHasher,
    isEVMReady,
  } = useAdmin({
    evm: {
      factoryAddress: FACTORY_ADDRESS,
    },
  });

  const handleSetFeeRate = async () => {
    if (!feeRate) {
      alert("Please enter a fee rate");
      return;
    }

    setIsLoading(true);
    try {
      // Fee rate is in basis points (e.g., 250 = 0.25%)
      const rate = BigInt(Math.floor(parseFloat(feeRate) * 100));
      const result = await updateFeeRate(ChainType.EVM, rate);
      setTxHash(result.txHash);
      alert(`Fee rate updated! TX: ${result.txHash}`);
      setFeeRate("");
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSeasonPeriod = async () => {
    if (!seasonPeriod) {
      alert("Please enter a period");
      return;
    }

    setIsLoading(true);
    try {
      const period = BigInt(seasonPeriod);
      const result = await setStakingSeasonPeriod(ChainType.EVM, period);
      setTxHash(result.txHash);
      alert(`Season period updated! TX: ${result.txHash}`);
      setSeasonPeriod("");
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSeason = async () => {
    setIsLoading(true);
    try {
      const result = await startStakeSeason(ChainType.EVM);
      setTxHash(result.txHash);
      alert(`New season started! TX: ${result.txHash}`);
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetVerifier = async () => {
    if (!verifierAddress) {
      alert("Please enter a verifier address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await setVerifier(ChainType.EVM, verifierAddress);
      setTxHash(result.txHash);
      alert(`Verifier updated! TX: ${result.txHash}`);
      setVerifierAddress("");
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetHasher = async () => {
    if (!hasherAddress) {
      alert("Please enter a hasher address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await setHasher(ChainType.EVM, hasherAddress);
      setTxHash(result.txHash);
      alert(`Hasher updated! TX: ${result.txHash}`);
      setHasherAddress("");
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEVMReady) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please connect your wallet to continue
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
        ⚠️ Admin functions require OPERATOR_ROLE or ADMIN_ROLE
      </div>

      <div className="space-y-6">
        {/* Fee Rate */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Set Fee Rate</h2>
          <div className="flex gap-4">
            <input
              type="number"
              step="0.01"
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              placeholder="0.25 (for 0.25%)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            />
            <button
              onClick={handleSetFeeRate}
              disabled={isLoading || !feeRate}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              Update
            </button>
          </div>
        </div>

        {/* Season Period */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Set Staking Season Period</h2>
          <div className="flex gap-4">
            <input
              type="number"
              value={seasonPeriod}
              onChange={(e) => setSeasonPeriod(e.target.value)}
              placeholder="Period in seconds"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            />
            <button
              onClick={handleSetSeasonPeriod}
              disabled={isLoading || !seasonPeriod}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              Update
            </button>
          </div>
        </div>

        {/* Start Season */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Start New Stake Season</h2>
          <button
            onClick={handleStartSeason}
            disabled={isLoading}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            Start Season
          </button>
        </div>

        {/* Verifier */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Set Verifier Address</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={verifierAddress}
              onChange={(e) => setVerifierAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            />
            <button
              onClick={handleSetVerifier}
              disabled={isLoading || !verifierAddress}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              Update
            </button>
          </div>
        </div>

        {/* Hasher */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Set Hasher Address</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={hasherAddress}
              onChange={(e) => setHasherAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            />
            <button
              onClick={handleSetHasher}
              disabled={isLoading || !hasherAddress}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              Update
            </button>
          </div>
        </div>

        {txHash && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>Last Transaction:</strong>{" "}
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
    </div>
  );
}

