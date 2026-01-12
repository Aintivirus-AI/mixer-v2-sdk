#!/usr/bin/env ts-node

/**
 * Test script for AintiVirus Mixer SDK on devnet
 *
 * Usage:
 *   1. Start a local devnet node (Hardhat, Anvil, etc.)
 *   2. Deploy contracts to the devnet
 *   3. Create a .env file with your configuration (see .env.example)
 *   4. Run: npm run test:devnet
 *
 * Or use with a public testnet:
 *   - Update RPC_URL in .env file to a testnet RPC endpoint
 *   - Update contract addresses in .env file
 */

import { ethers } from "ethers";
import {
  AintiVirusEVM,
  AintiVirusSolana,
  AssetMode,
  generateSecretAndNullifier,
  computeCommitment,
} from "./src";
import { config } from "dotenv";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";

config();
// ============================================
// Configuration - Update these for your devnet
// ============================================

// Devnet RPC URL (default: local Hardhat/Anvil)
const RPC_URL = process.env.RPC_URL || "http://localhost:8545";

// Contract addresses
const FACTORY_ADDRESS =
  process.env.FACTORY_ADDRESS || "0xcC0a05eC339BDE293686AE3856253Ea2cA0db10c";
const TOKEN_ADDRESS =
  process.env.TOKEN_ADDRESS || "0x17A53880B82f3535646B85D62Eb805BceCF433d6"; // AINTI Token
const STAKING_ADDRESS =
  process.env.STAKING_ADDRESS || "0xA4A994D091012A64a96bD90E93AA5D9E1aeD4D66";
const POSEIDON_ADDRESS =
  process.env.POSEIDON_ADDRESS || "0xd7D831eaa532142541B56c7ae94464E904426FDc";
const VERIFIER_ADDRESS =
  process.env.VERIFIER_ADDRESS || "0xEf29b4549F80cd285D324F5411312a68fc292Da4";

// Expected fee rate (250 = 0.25%)
const EXPECTED_FEE_RATE = process.env.EXPECTED_FEE_RATE
  ? BigInt(process.env.EXPECTED_FEE_RATE)
  : 250n;

// Test account private key (use a funded account on your devnet)
// For local devnet, use the default Hardhat account #0
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Enable/disable EVM tests (set to "false" to disable)
const ENABLE_EVM_TESTS = process.env.ENABLE_EVM_TESTS !== "false";

// ============================================
// Solana Configuration
// ============================================

// Solana RPC URL (default: Solana devnet)
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Solana Program IDs
const SOLANA_FACTORY_PROGRAM_ID =
  process.env.SOLANA_FACTORY_PROGRAM_ID ||
  "4LXpWrr1BFYkffdxYNnV7LhMT4ETYt38amAGRQZg2WoJ";
const SOLANA_MIXER_PROGRAM_ID =
  process.env.SOLANA_MIXER_PROGRAM_ID ||
  "CGZ8t3ZgSnEkN5zbVsAJ21d5bu9vrsBvBh7xxnZZcrVu";
const SOLANA_STAKING_PROGRAM_ID =
  process.env.SOLANA_STAKING_PROGRAM_ID ||
  "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ";

// Solana wallet private key (base58 encoded or array format)
// If not provided, will generate a new keypair (needs to be funded)
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;

// ============================================
// Test Functions
// ============================================

async function testViewFunctions(sdk: AintiVirusEVM, userAddress: string) {
  console.log("\n=== Testing View Functions ===");

  try {
    // Test fee rate
    const feeRate = await sdk.getFeeRate();
    const feeRatePercent = Number(feeRate) / 10000;
    console.log(`✓ Fee Rate: ${feeRate.toString()} (${feeRatePercent}%)`);

    // Verify expected fee rate
    if (feeRate === EXPECTED_FEE_RATE) {
      console.log(`  ✓ Fee rate matches expected value (${EXPECTED_FEE_RATE})`);
    } else {
      console.log(
        `  ⚠ Fee rate differs from expected (expected: ${EXPECTED_FEE_RATE}, got: ${feeRate})`
      );
    }

    // Test mixer existence for 0.05 ETH
    const amount = ethers.parseEther("0.05");
    const mixerExists = await sdk.mixerExists(AssetMode.ETH, amount);
    console.log(`✓ Mixer exists for 0.05 ETH: ${mixerExists}`);

    if (mixerExists) {
      const mixerAddress = await sdk.getMixer(AssetMode.ETH, amount);
      console.log(`✓ Mixer address: ${mixerAddress}`);
    }

    // Test deposit amount calculation
    const depositAmount = await sdk.calculateDepositAmount(amount);
    console.log(
      `✓ Deposit amount (0.05 ETH + fees): ${ethers.formatEther(
        depositAmount
      )} ETH`
    );

    // Test staking address
    const stakingAddress = await sdk.getStakingAddress();
    console.log(`✓ Staking contract: ${stakingAddress}`);

    // Verify staking address matches expected
    if (stakingAddress.toLowerCase() === STAKING_ADDRESS.toLowerCase()) {
      console.log(`  ✓ Staking address matches expected value`);
    } else {
      console.log(
        `  ⚠ Staking address differs (expected: ${STAKING_ADDRESS}, got: ${stakingAddress})`
      );
    }

    // Test current season
    try {
      const currentSeason = await sdk.getCurrentStakeSeason();
      console.log(`✓ Current stake season: ${currentSeason.toString()}`);
    } catch (error: any) {
      console.log(`⚠ Could not get current season: ${error.message}`);
    }

    // Test balances
    const ethBalance = await sdk.getEthBalance(userAddress);
    console.log(`✓ ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

    try {
      const tokenBalance = await sdk.getTokenBalance(userAddress);
      console.log(
        `✓ Token Balance: ${ethers.formatEther(tokenBalance)} tokens`
      );
    } catch (error: any) {
      console.log(`⚠ Could not get token balance: ${error.message}`);
    }

    // Test staker record
    try {
      const stakerRecord = await sdk.getStakerRecord(userAddress);
      console.log(`✓ Staker record found:`);
      console.log(
        `  - Staked ETH: ${ethers.formatEther(
          stakerRecord.stakedEthAmount
        )} ETH`
      );
      console.log(`  - ETH Weight: ${stakerRecord.ethWeightValue.toString()}`);
    } catch (error: any) {
      console.log(`⚠ No staker record found: ${error.message}`);
    }
  } catch (error: any) {
    console.error(`✗ View function error: ${error.message}`);
    throw error;
  }
}

async function testDeposit(sdk: AintiVirusEVM, amount: bigint) {
  console.log("\n=== Testing Deposit ===");

  try {
    // Check if mixer exists
    const exists = await sdk.mixerExists(AssetMode.ETH, amount);
    if (!exists) {
      console.log(
        "⚠ Mixer not deployed for this amount. Skipping deposit test."
      );
      return;
    }

    // Generate commitment
    const { secret, nullifier } = generateSecretAndNullifier();
    const commitment = computeCommitment(secret, nullifier);

    console.log(`Generating deposit for ${ethers.formatEther(amount)} ETH...`);
    console.log(`Commitment: ${commitment.toString()}`);
    console.log(`Secret: ${secret.toString()}`);
    console.log(`Nullifier: ${nullifier.toString()}`);

    // Calculate total amount with fees
    const totalAmount = await sdk.calculateDepositAmount(amount);
    console.log(
      `Total amount (with fees): ${ethers.formatEther(totalAmount)} ETH`
    );

    // Perform deposit
    console.log("Sending deposit transaction...");
    const result = await sdk.depositEth(amount, commitment);

    console.log(`✓ Deposit successful!`);
    console.log(`  Transaction Hash: ${result.txHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);
    if (result.blockTime) {
      console.log(
        `  Block Time: ${new Date(
          Number(result.blockTime) * 1000
        ).toISOString()}`
      );
    }

    // Store secret and nullifier for withdrawal (in a real app, store securely)
    console.log("\n⚠ IMPORTANT: Store these values securely for withdrawal:");
    console.log(`  Secret: ${secret.toString()}`);
    console.log(`  Nullifier: ${nullifier.toString()}`);

    return { secret, nullifier, commitment };
  } catch (error: any) {
    console.error(`✗ Deposit error: ${error.message}`);
    if (error.data) {
      console.error(`  Error data: ${error.data}`);
    }
    throw error;
  }
}

async function testStaking(sdk: AintiVirusEVM, amount: bigint) {
  console.log("\n=== Testing Staking ===");

  try {
    console.log(`Staking ${ethers.formatEther(amount)} ETH...`);

    const result = await sdk.stakeEther(amount);

    console.log(`✓ Staking successful!`);
    console.log(`  Transaction Hash: ${result.txHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);

    // Get updated staker record
    const signer = (sdk as any).signer;
    if (signer) {
      const userAddress = await signer.getAddress();
      const stakerRecord = await sdk.getStakerRecord(userAddress);
      console.log(`✓ Updated staker record:`);
      console.log(
        `  - Staked ETH: ${ethers.formatEther(
          stakerRecord.stakedEthAmount
        )} ETH`
      );
      console.log(`  - ETH Weight: ${stakerRecord.ethWeightValue.toString()}`);
    }
  } catch (error: any) {
    console.error(`✗ Staking error: ${error.message}`);
    if (error.data) {
      console.error(`  Error data: ${error.data}`);
    }
    throw error;
  }
}

async function testDeployMixer(
  sdk: AintiVirusEVM,
  mode: AssetMode,
  amount: bigint
) {
  console.log("\n=== Testing Deploy Mixer ===");

  try {
    // Check if mixer already exists
    const exists = await sdk.mixerExists(mode, amount);
    if (exists) {
      const mixerAddress = await sdk.getMixer(mode, amount);
      console.log(`⚠ Mixer already exists at: ${mixerAddress}`);
      return mixerAddress;
    }

    console.log(
      `Deploying mixer for ${
        mode === AssetMode.ETH ? "ETH" : "TOKEN"
      } mode, amount: ${ethers.formatEther(amount)}...`
    );

    const result = await sdk.deployMixer(mode, amount);

    console.log(`✓ Mixer deployed successfully!`);
    console.log(`  Mixer Address: ${result.mixerAddress}`);
    console.log(`  Transaction Hash: ${result.txHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);

    return result.mixerAddress;
  } catch (error: any) {
    console.error(`✗ Deploy mixer error: ${error.message}`);
    if (error.data) {
      console.error(`  Error data: ${error.data}`);
    }
    throw error;
  }
}

async function testClaimRewards(sdk: AintiVirusEVM) {
  console.log("\n=== Testing Claim Rewards ===");

  try {
    const currentSeason = await sdk.getCurrentStakeSeason();
    console.log(`Current season: ${currentSeason.toString()}`);

    if (currentSeason === 0n) {
      console.log("⚠ No active season. Skipping claim test.");
      return;
    }

    const signer = (sdk as any).signer;
    if (!signer) {
      console.log("⚠ No signer available. Skipping claim test.");
      return;
    }

    const userAddress = await signer.getAddress();
    const hasClaimed = await sdk.hasClaimedEth(userAddress, currentSeason);

    if (hasClaimed) {
      console.log(
        `⚠ Already claimed rewards for season ${currentSeason.toString()}`
      );
      return;
    }

    console.log(
      `Claiming ETH rewards for season ${currentSeason.toString()}...`
    );
    const result = await sdk.claimEth(currentSeason);

    console.log(`✓ Claim successful!`);
    console.log(`  Transaction Hash: ${result.txHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);
  } catch (error: any) {
    console.error(`✗ Claim error: ${error.message}`);
    if (error.data) {
      console.error(`  Error data: ${error.data}`);
    }
    // Don't throw - claiming might fail if no rewards available
    console.log("  (This is expected if no rewards are available)");
  }
}

// ============================================
// Solana Test Functions
// ============================================

async function testSolanaViewFunctions(
  sdk: AintiVirusSolana,
  userAddress: PublicKey
) {
  console.log("\n=== Testing Solana View Functions ===");

  try {
    // Test fee rate
    const feeRate = await sdk.getFeeRate();
    const feeRatePercent = Number(feeRate) / 10000;
    console.log(`✓ Fee Rate: ${feeRate.toString()} (${feeRatePercent}%)`);

    // Verify expected fee rate
    if (feeRate === EXPECTED_FEE_RATE) {
      console.log(`  ✓ Fee rate matches expected value (${EXPECTED_FEE_RATE})`);
    } else {
      console.log(
        `  ⚠ Fee rate differs from expected (expected: ${EXPECTED_FEE_RATE}, got: ${feeRate})`
      );
    }

    // Test mixer existence for 0.05 SOL
    const amount = 50_000_000n; // 0.05 SOL in lamports
    const mixerExists = await sdk.mixerExists(AssetMode.ETH, amount);
    console.log(`✓ Mixer exists for 0.05 SOL: ${mixerExists}`);

    if (mixerExists) {
      const mixerAddress = await sdk.getMixer(AssetMode.ETH, amount);
      console.log(`✓ Mixer address: ${mixerAddress.toString()}`);
    }

    // Test deposit amount calculation
    const depositAmount = await sdk.calculateDepositAmount(amount);
    console.log(
      `✓ Deposit amount (0.05 SOL + fees): ${
        depositAmount / 1_000_000_000n
      } SOL`
    );

    // Test staking address
    try {
      const stakingAddress = await sdk.getStakingAddress();
      console.log(`✓ Staking contract: ${stakingAddress.toString()}`);
    } catch (error: any) {
      console.log(`⚠ Could not get staking address: ${error.message}`);
    }

    // Test current season
    try {
      const currentSeason = await sdk.getCurrentStakeSeason();
      console.log(`✓ Current stake season: ${currentSeason.toString()}`);
    } catch (error: any) {
      console.log(`⚠ Could not get current season: ${error.message}`);
    }

    // Test balances
    const solBalance = await sdk.getSolBalance(userAddress);
    console.log(`✓ SOL Balance: ${solBalance / 1_000_000_000n} SOL`);

    // Test staker record
    try {
      const stakerRecord = await sdk.getStakerRecord(userAddress.toString());
      console.log(`✓ Staker record found:`);
      console.log(
        `  - Staked SOL: ${stakerRecord.stakedEthAmount / 1_000_000_000n} SOL`
      );
      console.log(`  - SOL Weight: ${stakerRecord.ethWeightValue.toString()}`);
    } catch (error: any) {
      console.log(`⚠ No staker record found: ${error.message}`);
    }
  } catch (error: any) {
    console.error(`✗ Solana view function error: ${error.message}`);
    throw error;
  }
}

async function testSolanaDeposit(sdk: AintiVirusSolana, amount: bigint) {
  console.log("\n=== Testing Solana Deposit ===");

  try {
    // Check if mixer exists
    const exists = await sdk.mixerExists(AssetMode.ETH, amount);
    if (!exists) {
      console.log(
        "⚠ Mixer not deployed for this amount. Skipping deposit test."
      );
      return;
    }

    // Generate commitment
    const { secret, nullifier } = generateSecretAndNullifier();
    const commitment = computeCommitment(secret, nullifier);

    console.log(`Generating deposit for ${amount / 1_000_000_000n} SOL...`);
    console.log(`Commitment: ${commitment.toString()}`);
    console.log(`Secret: ${secret.toString()}`);
    console.log(`Nullifier: ${nullifier.toString()}`);

    // Calculate total amount with fees
    const totalAmount = await sdk.calculateDepositAmount(amount);
    console.log(
      `Total amount (with fees): ${totalAmount / 1_000_000_000n} SOL`
    );

    // Perform deposit
    console.log("Sending deposit transaction...");
    const result = await sdk.depositSol(amount, commitment);

    console.log(`✓ Deposit successful!`);
    console.log(`  Transaction Signature: ${result.txHash}`);
    if (result.blockTime) {
      console.log(
        `  Block Time: ${new Date(
          Number(result.blockTime) * 1000
        ).toISOString()}`
      );
    }

    // Store secret and nullifier for withdrawal
    console.log("\n⚠ IMPORTANT: Store these values securely for withdrawal:");
    console.log(`  Secret: ${secret.toString()}`);
    console.log(`  Nullifier: ${nullifier.toString()}`);

    return { secret, nullifier, commitment };
  } catch (error: any) {
    console.error(`✗ Solana deposit error: ${error.message}`);
    if (error.logs) {
      console.error(`  Logs:`, error.logs);
    }
    throw error;
  }
}

async function testSolanaStaking(sdk: AintiVirusSolana, amount: bigint) {
  console.log("\n=== Testing Solana Staking ===");

  try {
    console.log(`Staking ${amount / 1_000_000_000n} SOL...`);

    const result = await sdk.stakeSol(amount);

    console.log(`✓ Staking successful!`);
    console.log(`  Transaction Signature: ${result.txHash}`);

    // Get updated staker record
    const userAddress = sdk["wallet"].publicKey;
    const stakerRecord = await sdk.getStakerRecord(userAddress.toString());
    console.log(`✓ Updated staker record:`);
    console.log(
      `  - Staked SOL: ${stakerRecord.stakedEthAmount / 1_000_000_000n} SOL`
    );
    console.log(`  - SOL Weight: ${stakerRecord.ethWeightValue.toString()}`);
  } catch (error: any) {
    console.error(`✗ Solana staking error: ${error.message}`);
    if (error.logs) {
      console.error(`  Logs:`, error.logs);
    }
    throw error;
  }
}

async function testSolanaDeployMixer(
  sdk: AintiVirusSolana,
  mode: AssetMode,
  amount: bigint
) {
  console.log("\n=== Testing Solana Deploy Mixer ===");

  try {
    // Check if mixer already exists
    const exists = await sdk.mixerExists(mode, amount);
    if (exists) {
      const mixerAddress = await sdk.getMixer(mode, amount);
      console.log(`⚠ Mixer already exists at: ${mixerAddress.toString()}`);
      return mixerAddress;
    }

    console.log(
      `Deploying mixer for ${
        mode === AssetMode.ETH ? "SOL" : "TOKEN"
      } mode, amount: ${amount / 1_000_000_000n} SOL...`
    );

    const result = await sdk.deployMixer(mode, amount);

    console.log(`✓ Mixer deployed successfully!`);
    console.log(`  Transaction Signature: ${result.txHash}`);
    if (result.blockTime) {
      console.log(
        `  Block Time: ${new Date(
          Number(result.blockTime) * 1000
        ).toISOString()}`
      );
    }

    // Get the mixer address
    const mixerAddress = await sdk.getMixer(mode, amount);
    console.log(`  Mixer Address: ${mixerAddress.toString()}`);

    return mixerAddress;
  } catch (error: any) {
    console.error(`✗ Solana deploy mixer error: ${error.message}`);
    if (error.logs) {
      console.error(`  Logs:`, error.logs);
    }
    throw error;
  }
}

async function testSolanaClaimRewards(sdk: AintiVirusSolana) {
  console.log("\n=== Testing Solana Claim Rewards ===");

  try {
    const currentSeason = await sdk.getCurrentStakeSeason();
    console.log(`Current season: ${currentSeason.toString()}`);

    if (currentSeason === 0n) {
      console.log("⚠ No active season. Skipping claim test.");
      return;
    }

    const userAddress = sdk["wallet"].publicKey;
    const hasClaimed = await sdk.hasClaimedSol(
      userAddress.toString(),
      currentSeason
    );

    if (hasClaimed) {
      console.log(
        `⚠ Already claimed rewards for season ${currentSeason.toString()}`
      );
      return;
    }

    console.log(
      `Claiming SOL rewards for season ${currentSeason.toString()}...`
    );
    const result = await sdk.claimSol(currentSeason);

    console.log(`✓ Claim successful!`);
    console.log(`  Transaction Signature: ${result.txHash}`);
  } catch (error: any) {
    console.error(`✗ Solana claim error: ${error.message}`);
    if (error.logs) {
      console.error(`  Logs:`, error.logs);
    }
    // Don't throw - claiming might fail if no rewards available
    console.log("  (This is expected if no rewards are available)");
  }
}

// ============================================
// Main Test Runner
// ============================================

async function main() {
  console.log("=========================================");
  console.log("AintiVirus Mixer SDK - Devnet Test");
  console.log("=========================================");
  console.log("\n=== EVM Configuration ===");
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Factory Address: ${FACTORY_ADDRESS}`);
  console.log(`Token Address (AINTI): ${TOKEN_ADDRESS}`);
  console.log(`Staking Address: ${STAKING_ADDRESS}`);
  console.log(`Poseidon Address: ${POSEIDON_ADDRESS}`);
  console.log(`Verifier Address: ${VERIFIER_ADDRESS}`);
  console.log(
    `Expected Fee Rate: ${EXPECTED_FEE_RATE} (${
      Number(EXPECTED_FEE_RATE) / 10000
    }%)`
  );
  console.log("\n=== Solana Configuration ===");
  console.log(`Solana RPC URL: ${SOLANA_RPC_URL}`);
  console.log(`Factory Program ID: ${SOLANA_FACTORY_PROGRAM_ID}`);
  console.log(`Mixer Program ID: ${SOLANA_MIXER_PROGRAM_ID}`);
  console.log(`Staking Program ID: ${SOLANA_STAKING_PROGRAM_ID}`);
  console.log("=========================================\n");

  try {
    const allResults: Array<{
      chain: string;
      name: string;
      success: boolean;
      error?: string;
    }> = [];

    // ============================================
    // EVM Tests
    // ============================================
    if (ENABLE_EVM_TESTS && RPC_URL && FACTORY_ADDRESS && TOKEN_ADDRESS) {
      console.log("\n🔷 Running EVM Tests");
      console.log("=========================================\n");

      try {
        // Connect to devnet
        console.log("Connecting to EVM devnet...");
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        // Check connection
        const blockNumber = await provider.getBlockNumber();
        console.log(`✓ Connected to EVM devnet (Block: ${blockNumber})\n`);

        // Create wallet
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const userAddress = await wallet.getAddress();
        console.log(`Using EVM account: ${userAddress}`);

        // Check balance
        const balance = await provider.getBalance(userAddress);
        console.log(`Account balance: ${ethers.formatEther(balance)} ETH\n`);

        if (balance === 0n) {
          console.warn(
            "⚠ WARNING: Account has zero balance. Some tests may fail."
          );
          console.warn("  Please fund this account on your devnet.\n");
        } else {
          const estimatedCost = ethers.parseEther("0.15");
          if (balance < estimatedCost) {
            console.warn(
              `⚠ WARNING: Account balance (${ethers.formatEther(
                balance
              )} ETH) may be low for all tests.`
            );
            console.warn(
              `  Estimated cost: ~${ethers.formatEther(
                estimatedCost
              )} ETH (including gas fees)\n`
            );
          } else {
            console.log(
              `✓ Account balance sufficient for testing (~${ethers.formatEther(
                estimatedCost
              )} ETH estimated cost)\n`
            );
          }
        }

        // Initialize SDK
        console.log("Initializing EVM SDK...");
        const sdk = new AintiVirusEVM(FACTORY_ADDRESS, TOKEN_ADDRESS, wallet);
        console.log("✓ EVM SDK initialized\n");

        // Run EVM tests
        const evmTests: Array<{ name: string; fn: () => Promise<any> }> = [
          {
            name: "View Functions",
            fn: () => testViewFunctions(sdk, userAddress),
          },
          {
            name: "Deploy Mixer (0.05 ETH)",
            fn: () =>
              testDeployMixer(sdk, AssetMode.ETH, ethers.parseEther("0.05")),
          },
          {
            name: "Deposit (0.05 ETH)",
            fn: () => testDeposit(sdk, ethers.parseEther("0.05")),
          },
          {
            name: "Staking (0.05 ETH)",
            fn: () => testStaking(sdk, ethers.parseEther("0.05")),
          },
          {
            name: "Claim Rewards",
            fn: () => testClaimRewards(sdk),
          },
        ];

        for (const test of evmTests) {
          try {
            console.log(`\n[EVM - ${test.name}]`);
            await test.fn();
            allResults.push({ chain: "EVM", name: test.name, success: true });
          } catch (error: any) {
            console.error(
              `\n✗ EVM Test "${test.name}" failed: ${error.message}`
            );
            allResults.push({
              chain: "EVM",
              name: test.name,
              success: false,
              error: error.message,
            });
          }
        }
      } catch (error: any) {
        console.error(`\n✗ EVM setup error: ${error.message}`);
        allResults.push({
          chain: "EVM",
          name: "Setup",
          success: false,
          error: error.message,
        });
      }
    } else {
      if (!ENABLE_EVM_TESTS) {
        console.log("\n⚠ EVM tests disabled (ENABLE_EVM_TESTS=false)");
      } else {
        console.log("\n⚠ Skipping EVM tests (missing configuration)");
      }
    }

    // ============================================
    // Solana Tests
    // ============================================
    console.log("\n\n🔷 Running Solana Tests");
    console.log("=========================================\n");

    try {
      // Connect to Solana devnet
      console.log("Connecting to Solana devnet...");
      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      try {
        const version = await connection.getVersion();
        const versionStr =
          version["solana-core"] || version["version"] || "unknown";
        console.log(`✓ Connected to Solana devnet (Version: ${versionStr})\n`);
      } catch (versionError) {
        // Version check is optional, continue anyway
        console.log(`✓ Connected to Solana devnet\n`);
      }

      // Create or load wallet
      let keypair: Keypair;
      if (SOLANA_PRIVATE_KEY) {
        // Try to parse as JSON array first
        try {
          const keyBytes = JSON.parse(SOLANA_PRIVATE_KEY);
          keypair = Keypair.fromSecretKey(Uint8Array.from(keyBytes));
        } catch {
          // Try as base64
          try {
            keypair = Keypair.fromSecretKey(
              Buffer.from(SOLANA_PRIVATE_KEY, "base64")
            );
          } catch {
            throw new Error(
              "Invalid SOLANA_PRIVATE_KEY format. Use JSON array or base64."
            );
          }
        }
      } else {
        // Generate new keypair (needs to be funded)
        keypair = Keypair.generate();
        console.warn(
          "⚠ Generated new keypair. Please fund this account on Solana devnet:"
        );
        console.warn(`  Address: ${keypair.publicKey.toString()}`);
        console.warn(
          "  You can get devnet SOL from: https://faucet.solana.com/\n"
        );
      }

      const wallet = new Wallet(keypair);
      const userAddress = keypair.publicKey;
      console.log(`Using Solana account: ${userAddress.toString()}`);

      // Check balance
      const solBalance = await connection.getBalance(userAddress);
      const solBalanceBigInt = BigInt(solBalance);
      console.log(
        `Account balance: ${solBalanceBigInt / 1_000_000_000n} SOL\n`
      );

      if (solBalance === 0) {
        console.warn(
          "⚠ WARNING: Account has zero balance. Some tests may fail."
        );
        console.warn(
          "  Please fund this account on Solana devnet: https://faucet.solana.com/\n"
        );
      } else {
        // Estimate: ~0.15 SOL total
        const estimatedCost = 150_000_000n; // 0.15 SOL
        if (solBalanceBigInt < estimatedCost) {
          console.warn(
            `⚠ WARNING: Account balance (${
              solBalanceBigInt / 1_000_000_000n
            } SOL) may be low for all tests.`
          );
          console.warn(
            `  Estimated cost: ~${
              estimatedCost / 1_000_000_000n
            } SOL (including fees)\n`
          );
        } else {
          console.log(
            `✓ Account balance sufficient for testing (~${
              estimatedCost / 1_000_000_000n
            } SOL estimated cost)\n`
          );
        }
      }

      // Initialize Solana SDK
      console.log("Initializing Solana SDK...");
      const solanaSdk = new AintiVirusSolana(
        SOLANA_FACTORY_PROGRAM_ID,
        SOLANA_MIXER_PROGRAM_ID,
        SOLANA_STAKING_PROGRAM_ID,
        wallet,
        connection
      );
      console.log("✓ Solana SDK initialized\n");

      // Run Solana tests
      const solAmount = 50_000_000n; // 0.05 SOL in lamports
      const solanaTests: Array<{ name: string; fn: () => Promise<any> }> = [
        {
          name: "View Functions",
          fn: () => testSolanaViewFunctions(solanaSdk, userAddress),
        },
        {
          name: "Deploy Mixer (0.05 SOL)",
          fn: () => testSolanaDeployMixer(solanaSdk, AssetMode.ETH, solAmount),
        },
        {
          name: "Deposit (0.05 SOL)",
          fn: () => testSolanaDeposit(solanaSdk, solAmount),
        },
        {
          name: "Staking (0.05 SOL)",
          fn: () => testSolanaStaking(solanaSdk, solAmount),
        },
        {
          name: "Claim Rewards",
          fn: () => testSolanaClaimRewards(solanaSdk),
        },
      ];

      for (const test of solanaTests) {
        try {
          console.log(`\n[Solana - ${test.name}]`);
          await test.fn();
          allResults.push({
            chain: "Solana",
            name: test.name,
            success: true,
          });
        } catch (error: any) {
          console.error(
            `\n✗ Solana Test "${test.name}" failed: ${error.message}`
          );
          allResults.push({
            chain: "Solana",
            name: test.name,
            success: false,
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      console.error(`\n✗ Solana setup error: ${error.message}`);
      allResults.push({
        chain: "Solana",
        name: "Setup",
        success: false,
        error: error.message,
      });
    }

    // ============================================
    // Summary
    // ============================================
    console.log("\n\n=========================================");
    console.log("Test Summary");
    console.log("=========================================");

    const evmResults = allResults.filter((r) => r.chain === "EVM");
    const solanaResults = allResults.filter((r) => r.chain === "Solana");

    if (evmResults.length > 0) {
      console.log("\n--- EVM Tests ---");
      for (const result of evmResults) {
        const status = result.success ? "✓ PASS" : "✗ FAIL";
        console.log(`${status} - ${result.name}`);
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      }
    }

    if (solanaResults.length > 0) {
      console.log("\n--- Solana Tests ---");
      for (const result of solanaResults) {
        const status = result.success ? "✓ PASS" : "✗ FAIL";
        console.log(`${status} - ${result.name}`);
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      }
    }

    console.log("\n=========================================\n");

    const passed = allResults.filter((r) => r.success).length;
    const total = allResults.length;
    console.log(`Total tests passed: ${passed}/${total}`);

    if (passed === total && total > 0) {
      console.log("🎉 All tests passed!");
      process.exit(0);
    } else if (total > 0) {
      console.log("⚠ Some tests failed. Check the output above for details.");
      process.exit(1);
    } else {
      console.log("⚠ No tests were run. Check your configuration.");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("\n✗ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { main as testDevnet };
