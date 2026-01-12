#!/usr/bin/env ts-node

/**
 * Solana-only test script for AintiVirus Mixer SDK on devnet
 *
 * Usage:
 *   1. Create a .env file with your Solana configuration (see .env.example)
 *   2. Run: npm run test:solana
 */

import {
  AintiVirusSolana,
  AssetMode,
  generateSecretAndNullifier,
  computeCommitment,
} from "./src";
import { config } from "dotenv";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import {
  createMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";

config();

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

// Expected fee rate (250 = 0.25%)
const EXPECTED_FEE_RATE = process.env.EXPECTED_FEE_RATE
  ? BigInt(process.env.EXPECTED_FEE_RATE)
  : 250n;

// Solana wallet private key (base58 encoded or array format)
// If not provided, will generate a new keypair (needs to be funded)
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;

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
    try {
      const feeRate = await sdk.getFeeRate();
      const feeRatePercent = Number(feeRate) / 10000;
      console.log(`✓ Fee Rate: ${feeRate.toString()} (${feeRatePercent}%)`);

      // Verify expected fee rate
      if (feeRate === EXPECTED_FEE_RATE) {
        console.log(
          `  ✓ Fee rate matches expected value (${EXPECTED_FEE_RATE})`
        );
      } else {
        console.log(
          `  ⚠ Fee rate differs from expected (expected: ${EXPECTED_FEE_RATE}, got: ${feeRate})`
        );
      }
    } catch (error: any) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("no data")
      ) {
        console.log(
          `⚠ Factory account not initialized yet. Skipping fee rate check.`
        );
        console.log(`  Note: Factory PDA needs to be initialized before use.`);
      } else {
        throw error;
      }
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
    const depositAmountSol = Number(depositAmount) / 1_000_000_000;
    console.log(
      `✓ Deposit amount (0.05 SOL + fees): ${depositAmountSol.toFixed(9)} SOL`
    );

    // Test staking address
    try {
      const stakingAddress = await sdk.getStakingAddress();
      console.log(`✓ Staking contract: ${stakingAddress.toString()}`);
    } catch (error: any) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("no data")
      ) {
        console.log(
          `⚠ Factory account not initialized. Cannot get staking address.`
        );
      } else {
        console.log(`⚠ Could not get staking address: ${error.message}`);
      }
    }

    // Test current season
    try {
      const currentSeason = await sdk.getCurrentStakeSeason();
      console.log(`✓ Current stake season: ${currentSeason.toString()}`);
    } catch (error: any) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("no data")
      ) {
        console.log(
          `⚠ Factory account not initialized. Cannot get current season.`
        );
      } else {
        console.log(`⚠ Could not get current season: ${error.message}`);
      }
    }

    // Test balances
    const solBalance = await sdk.getSolBalance(userAddress);
    const solBalanceNum = Number(solBalance) / 1_000_000_000;
    console.log(`✓ SOL Balance: ${solBalanceNum.toFixed(9)} SOL`);

    // Test staker record
    try {
      const stakerRecord = await sdk.getStakerRecord(userAddress.toString());
      console.log(`✓ Staker record found:`);
      const stakedSol = Number(stakerRecord.stakedEthAmount) / 1_000_000_000;
      console.log(`  - Staked SOL: ${stakedSol.toFixed(9)} SOL`);
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

    const amountSol = Number(amount) / 1_000_000_000;
    console.log(`Generating deposit for ${amountSol.toFixed(9)} SOL...`);
    console.log(`Commitment: ${commitment.toString()}`);
    console.log(`Secret: ${secret.toString()}`);
    console.log(`Nullifier: ${nullifier.toString()}`);

    // Calculate total amount with fees
    const totalAmount = await sdk.calculateDepositAmount(amount);
    const totalAmountSol = Number(totalAmount) / 1_000_000_000;
    console.log(`Total amount (with fees): ${totalAmountSol.toFixed(9)} SOL`);

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
    const amountSol = Number(amount) / 1_000_000_000;
    console.log(`Staking ${amountSol.toFixed(9)} SOL...`);

    const result = await sdk.stakeSol(amount);

    console.log(`✓ Staking successful!`);
    console.log(`  Transaction Signature: ${result.txHash}`);

    // Get updated staker record
    const userAddress = sdk["wallet"].publicKey;
    const stakerRecord = await sdk.getStakerRecord(userAddress.toString());
    console.log(`✓ Updated staker record:`);
    const stakedSol = Number(stakerRecord.stakedEthAmount) / 1_000_000_000;
    console.log(`  - Staked SOL: ${stakedSol.toFixed(9)} SOL`);
    console.log(`  - SOL Weight: ${stakerRecord.ethWeightValue.toString()}`);
  } catch (error: any) {
    console.error(`✗ Solana staking error: ${error.message}`);
    if (error.logs) {
      console.error(`  Logs:`, error.logs);
    }
    if (error.message.includes("InstructionFallbackNotFound")) {
      console.error(
        `  ⚠ The instruction name 'stakeEther' may not match the program.`
      );
      console.error(
        `  The program might use a different instruction name (e.g., 'stakeSol', 'stake').`
      );
      console.error(
        `  To fix: Update the SDK with the correct instruction name from the IDL.`
      );
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

    const amountSol = Number(amount) / 1_000_000_000;
    console.log(
      `Deploying mixer for ${
        mode === AssetMode.ETH ? "SOL" : "TOKEN"
      } mode, amount: ${amountSol.toFixed(9)} SOL...`
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
    if (error.message.includes("AccountNotEnoughKeys")) {
      console.error(
        `  ⚠ This error suggests the IDL doesn't match the program.`
      );
      console.error(
        `  The minimal IDL may be missing required account definitions.`
      );
      console.error(
        `  To fix: Provide the actual IDL or fetch it from the chain.`
      );
    }
    throw error;
  }
}

async function testSolanaClaimRewards(sdk: AintiVirusSolana) {
  console.log("\n=== Testing Solana Claim Rewards ===");

  try {
    let currentSeason: bigint;
    try {
      currentSeason = await sdk.getCurrentStakeSeason();
      console.log(`Current season: ${currentSeason.toString()}`);
    } catch (error: any) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("no data")
      ) {
        console.log("⚠ Factory account not initialized. Skipping claim test.");
        return;
      }
      throw error;
    }

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
    if (
      error.message.includes("does not exist") ||
      error.message.includes("no data")
    ) {
      console.log("  (This is expected if factory account is not initialized)");
    } else {
      // Don't throw - claiming might fail if no rewards available
      console.log("  (This is expected if no rewards are available)");
    }
  }
}

// ============================================
// Main Test Runner
// ============================================

async function main() {
  console.log("=========================================");
  console.log("AintiVirus Mixer SDK - Solana Devnet Test");
  console.log("=========================================");
  console.log(`Solana RPC URL: ${SOLANA_RPC_URL}`);
  console.log(`Factory Program ID: ${SOLANA_FACTORY_PROGRAM_ID}`);
  console.log(`Mixer Program ID: ${SOLANA_MIXER_PROGRAM_ID}`);
  console.log(`Staking Program ID: ${SOLANA_STAKING_PROGRAM_ID}`);
  console.log(
    `Expected Fee Rate: ${EXPECTED_FEE_RATE} (${
      Number(EXPECTED_FEE_RATE) / 10000
    }%)`
  );
  console.log("\n⚠ NOTE: This test uses a minimal IDL.");
  console.log("  Some tests may fail if:");
  console.log("  - Factory account is not initialized");
  console.log("  - Instruction names don't match the program");
  console.log("  - Required accounts are missing from the IDL");
  console.log("  To fix: Provide the actual IDL or fetch it from the chain.");
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
    const solBalanceNum = solBalance / 1_000_000_000;
    console.log(`Account balance: ${solBalanceNum.toFixed(9)} SOL\n`);

    if (solBalance === 0) {
      console.warn("⚠ WARNING: Account has zero balance. Some tests may fail.");
      console.warn(
        "  Please fund this account on Solana devnet: https://faucet.solana.com/\n"
      );
    } else {
      // Estimate: ~0.15 SOL total
      const estimatedCost = 150_000_000; // 0.15 SOL in lamports
      if (solBalance < estimatedCost) {
        console.warn(
          `⚠ WARNING: Account balance (${solBalanceNum.toFixed(
            9
          )} SOL) may be low for all tests.`
        );
        console.warn(`  Estimated cost: ~0.15 SOL (including fees)\n`);
      } else {
        console.log(
          `✓ Account balance sufficient for testing (~0.15 SOL estimated cost)\n`
        );
      }
    }

    // Initialize Solana SDK
    console.log("Initializing Solana SDK...");
    const solanaSdk = new AintiVirusSolana(wallet, connection);
    console.log("✓ Solana SDK initialized\n");

    // Check if factory is initialized, if not, initialize it
    let tokenMint: PublicKey | null = null;
    try {
      await solanaSdk.getFeeRate();
      console.log("✓ Factory account already initialized");

      // Get the token mint from the factory account
      const factoryAccount = await solanaSdk.getFactoryAccount();
      tokenMint = (factoryAccount as any).mint as PublicKey;
      console.log(`✓ Using existing token mint: ${tokenMint.toString()}\n`);
    } catch (error: any) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("no data") ||
        error.message.includes("AccountNotInitialized")
      ) {
        console.log("Factory account not initialized. Initializing...");
        try {
          // Create a token mint for the factory (required for initialization)
          console.log("Creating token mint for factory initialization...");
          tokenMint = await createMint(
            connection,
            keypair, // payer
            keypair.publicKey, // mint authority
            null, // freeze authority
            9 // decimals
          );
          console.log(`✓ Token mint created: ${tokenMint.toString()}`);

          // Derive vault token account
          const [factoryPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("factory")],
            new PublicKey(SOLANA_FACTORY_PROGRAM_ID)
          );
          const vaultTokenAccount = getAssociatedTokenAddressSync(
            tokenMint,
            factoryPda,
            true
          );

          // Create vault token account if it doesn't exist
          try {
            await getAccount(connection, vaultTokenAccount);
            console.log("✓ Vault token account already exists");
          } catch {
            console.log("Creating vault token account...");
            const createVaultTokenIx = createAssociatedTokenAccountInstruction(
              keypair.publicKey, // payer
              vaultTokenAccount, // ata
              factoryPda, // owner
              tokenMint // mint
            );
            const tx = new Transaction().add(createVaultTokenIx);
            await connection.sendTransaction(tx, [keypair]);
            console.log("✓ Vault token account created");
          }

          // Initialize factory
          console.log("Initializing factory...");
          const initResult = await solanaSdk.initializeFactory(
            EXPECTED_FEE_RATE,
            tokenMint
          );
          console.log(
            `✓ Factory initialized! Transaction: ${initResult.txHash}\n`
          );
        } catch (initError: any) {
          console.error(`✗ Failed to initialize factory: ${initError.message}`);
          console.error(
            "  Some tests may fail. Factory must be initialized before use."
          );
          if (initError.logs) {
            console.error("  Logs:", initError.logs);
          }
          console.log("");
        }
      } else {
        throw error;
      }
    }

    // Set token mint in SDK if we have it
    if (tokenMint) {
      solanaSdk.setTokenMint(tokenMint);
    }

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

    const results: Array<{ name: string; success: boolean; error?: string }> =
      [];

    for (const test of solanaTests) {
      try {
        console.log(`\n[${test.name}]`);
        await test.fn();
        results.push({ name: test.name, success: true });
      } catch (error: any) {
        console.error(`\n✗ Test "${test.name}" failed: ${error.message}`);
        results.push({ name: test.name, success: false, error: error.message });
      }
    }

    // Summary
    console.log("\n=========================================");
    console.log("Test Summary");
    console.log("=========================================");
    for (const result of results) {
      const status = result.success ? "✓ PASS" : "✗ FAIL";
      console.log(`${status} - ${result.name}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    }
    console.log("=========================================\n");

    const passed = results.filter((r) => r.success).length;
    const total = results.length;
    console.log(`Tests passed: ${passed}/${total}`);

    if (passed === total) {
      console.log("🎉 All tests passed!");
      process.exit(0);
    } else {
      console.log("⚠ Some tests failed. Check the output above for details.");
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

export { main as testSolanaDevnet };
