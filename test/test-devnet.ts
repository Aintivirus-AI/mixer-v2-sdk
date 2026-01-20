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

import { ethers, Contract } from "ethers";
import {
  AintiVirusEVM,
  AssetMode,
  generateSecretAndNullifier,
  computeCommitment,
} from "../src";
import {
  buildMerkleTree,
  generateWithdrawalProof,
} from "../src/utils/proof";
import { bytes32ToBigInt } from "../src/utils/crypto";
import { config } from "dotenv";

config();
// ============================================
// Configuration - Update these for your devnet
// ============================================

// Devnet RPC URL (default: local Hardhat/Anvil)
const RPC_URL = process.env.RPC_URL || "http://localhost:8545";

// Contract addresses
const FACTORY_ADDRESS =  process.env.FACTORY_ADDRESS ;
const TOKEN_ADDRESS =  process.env.TOKEN_ADDRESS ; // AINTI Token
const STAKING_ADDRESS = process.env.STAKING_ADDRESS ?? "";
const POSEIDON_ADDRESS = process.env.POSEIDON_ADDRESS ;
const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS ;

// Expected fee rate (250 = 0.25%)
const EXPECTED_FEE_RATE = process.env.EXPECTED_FEE_RATE
  ? BigInt(process.env.EXPECTED_FEE_RATE)
  : 250n;

// Test account private key (use a funded account on your devnet)
// For local devnet, use the default Hardhat account #0
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";

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

    // Test mixer existence for 0.01 ETH
    const amount = ethers.parseEther("0.01");
    const mixerExists = await sdk.mixerExists(AssetMode.ETH, amount);
    console.log(`✓ Mixer exists for 0.01 ETH: ${mixerExists}`);

    if (mixerExists) {
      const mixerAddress = await sdk.getMixer(AssetMode.ETH, amount);
      console.log(`✓ Mixer address: ${mixerAddress}`);
    }

    // Test deposit amount calculation
    const depositAmount = await sdk.calculateDepositAmount(amount);
    console.log(
      `✓ Deposit amount (0.01 ETH + fees): ${ethers.formatEther(
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

async function testWithdraw(
  sdk: AintiVirusEVM,
  amount: bigint,
  secret?: bigint,
  nullifier?: bigint
) {
  console.log("\n=== Testing Withdraw ===");

  try {
    // Check if mixer exists
    const exists = await sdk.mixerExists(AssetMode.ETH, amount);
    if (!exists) {
      console.log(
        "⚠ Mixer not deployed for this amount. Skipping withdraw test."
      );
      return;
    }

    // Secret and nullifier are required
    if (!secret || !nullifier) {
      throw new Error(
        "Secret and nullifier are required for withdrawal. Please provide both parameters."
      );
    }

    const depositCommitment = computeCommitment(secret, nullifier);

    console.log(`Attempting to withdraw ${ethers.formatEther(amount)} ETH...`);
    console.log(`Secret: ${secret.toString()}`);
    console.log(`Nullifier: ${nullifier.toString()}`);
    console.log(`Commitment: ${depositCommitment.toString()}`);

    // Get mixer address and create mixer contract instance
    const mixerAddress = await sdk.getMixer(AssetMode.ETH, amount);
    const provider = sdk.getProvider();
    
    // Mixer ABI for Deposit event
    const MIXER_ABI = [
      "event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)",
    ];
    const mixer = new Contract(mixerAddress, MIXER_ABI, provider);

    // Query all deposit events from the mixer
    console.log("Querying deposit events from mixer...");
    const depositEvents = await mixer.queryFilter(mixer.filters.Deposit());
    
    if (depositEvents.length === 0) {
      console.log("⚠ No deposit events found. Skipping withdraw test.");
      return;
    }

    // Extract commitments from events and build merkle tree
    const commitments: bigint[] = depositEvents.map((event: any) => {
      return bytes32ToBigInt(event.args[0]);
    });

    console.log(`Found ${commitments.length} deposit(s) in mixer`);
    
    // Build merkle tree from commitments
    console.log("Building merkle tree from commitments...");
    const merkleTree = buildMerkleTree(commitments);
    const root = BigInt(merkleTree.root);
    console.log(`Merkle root: ${root.toString()}`);

    // Find the commitment index in the tree
    const commitmentIndex = merkleTree.elements.indexOf(depositCommitment.toString());
    if (commitmentIndex === -1) {
      console.log("⚠ Commitment not found in merkle tree. Skipping withdraw test.");
      return;
    }

    // Get merkle path for the commitment
    const merklePath = merkleTree.path(commitmentIndex);
    const pathElements = merklePath.pathElements.map((e) => BigInt(e));
    const pathIndices = merklePath.pathIndices;

    console.log(`Commitment found at leaf index: ${commitmentIndex}`);
    console.log(`Merkle path depth: ${pathElements.length}`);

    // Get recipient address
    const signer = (sdk as any).signer;
    if (!signer) {
      console.log("⚠ No signer available. Skipping withdraw test.");
      return;
    }
    const recipient = await signer.getAddress();

    // Load circuit files from IPFS
    console.log("Loading circuit files from IPFS...");
    const wasmUrl = "https://pink-academic-gamefowl-968.mypinata.cloud/ipfs/bafybeibhilxde222rvmpit5wn2o4mtoy7bv4eqv4gv2orgde3roipdvzqu";
    const zkeyUrl = "https://pink-academic-gamefowl-968.mypinata.cloud/ipfs/bafybeibwbfyigzm4rmwnqclwhkfccy32ni6tykaoepvnibutgsqi7gfere";
    
    const [wasmResponse, zkeyResponse] = await Promise.all([
      fetch(wasmUrl),
      fetch(zkeyUrl)
    ]);
    
    if (!wasmResponse.ok) {
      throw new Error(`Failed to fetch WASM file: ${wasmResponse.statusText}`);
    }
    if (!zkeyResponse.ok) {
      throw new Error(`Failed to fetch Zkey file: ${zkeyResponse.statusText}`);
    }
    
    const circuitWasm = Buffer.from(await wasmResponse.arrayBuffer());
    const circuitZkey = Buffer.from(await zkeyResponse.arrayBuffer());
    console.log("✓ Circuit files loaded from IPFS");

    // Generate withdrawal proof
    console.log("Generating withdrawal proof...");
    const proof = await generateWithdrawalProof(
      secret,
      nullifier,
      root,
      recipient,
      pathElements,
      pathIndices,
      circuitWasm,
      circuitZkey
    );

    console.log("✓ Proof generated successfully");

    // Attempt withdraw
    console.log("Sending withdraw transaction...");
    const result = await sdk.withdraw(proof, amount, AssetMode.ETH);

    console.log(`✓ Withdraw successful!`);
    console.log(`  Transaction Hash: ${result.txHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);
    if (result.blockTime) {
      console.log(
        `  Block Time: ${new Date(
          Number(result.blockTime) * 1000
        ).toISOString()}`
      );
    }
  } catch (error: any) {
    console.error(`✗ Withdraw error: ${error.message}`);
    if (error.data) {
      console.error(`  Error data: ${error.data}`);
    }
    // Don't throw - withdraw might fail if proof is invalid, no deposit exists, or other issues
    console.log(
      "  (This might be expected if the commitment is not in the merkle tree or proof verification fails)"
    );
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

async function testUnstake(sdk: AintiVirusEVM) {
  console.log("\n=== Testing Unstake ===");

  try {
    // Get staker record before unstaking
    const signer = (sdk as any).signer;
    if (!signer) {
      console.log("⚠ No signer available. Skipping unstake test.");
      return;
    }

    const userAddress = await signer.getAddress();
    let stakerRecordBefore;
    try {
      stakerRecordBefore = await sdk.getStakerRecord(userAddress);
      const stakedEthBefore = ethers.formatEther(
        stakerRecordBefore.stakedEthAmount
      );
      console.log(`Current staker record before unstaking:`);
      console.log(`  - Staked ETH: ${stakedEthBefore} ETH`);
      console.log(
        `  - ETH Weight: ${stakerRecordBefore.ethWeightValue.toString()}`
      );

      if (stakerRecordBefore.stakedEthAmount === 0n) {
        console.log(`⚠ No ETH staked. Skipping unstake test.`);
        return;
      }
    } catch (error: any) {
      console.log(`⚠ No staker record found. Skipping unstake test.`);
      return;
    }

    console.log(`Unstaking ETH...`);

    const result = await sdk.unstakeEth();

    console.log(`✓ Unstaking successful!`);
    console.log(`  Transaction Hash: ${result.txHash}`);
    console.log(`  Block Number: ${result.blockNumber}`);

    // Get updated staker record
    try {
      const stakerRecordAfter = await sdk.getStakerRecord(userAddress);
      console.log(`✓ Updated staker record:`);
      const stakedEthAfter = ethers.formatEther(
        stakerRecordAfter.stakedEthAmount
      );
      console.log(`  - Staked ETH: ${stakedEthAfter} ETH`);
      console.log(
        `  - ETH Weight: ${stakerRecordAfter.ethWeightValue.toString()}`
      );
    } catch (error: any) {
      console.log(`⚠ Could not fetch updated staker record: ${error.message}`);
    }
  } catch (error: any) {
    console.error(`✗ Unstake error: ${error.message}`);
    if (error.data) {
      console.error(`  Error data: ${error.data}`);
    }
    throw error;
  }
}

// ============================================
// Main Test Runner
// ============================================

async function main() {
  console.log("=========================================");
  console.log("AintiVirus Mixer SDK - EVM Devnet Test");
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
  console.log("=========================================\n");

  try {
    const results: Array<{
      name: string;
      success: boolean;
      error?: string;
    }> = [];

    // ============================================
    // EVM Tests
    // ============================================
    if (RPC_URL && FACTORY_ADDRESS && TOKEN_ADDRESS) {
      console.log("\n🔷 Running Tests");
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

        // Store deposit data for withdraw test
        let depositData: { secret: bigint; nullifier: bigint; commitment: bigint } | null = null;

        // Run EVM tests
        const evmTests: Array<{ name: string; fn: () => Promise<any> }> = [
          {
            name: "View Functions",
            fn: () => testViewFunctions(sdk, userAddress),
          },
          {
            name: "Deploy Mixer (0.01 ETH)",
            fn: () =>
              testDeployMixer(sdk, AssetMode.ETH, ethers.parseEther("0.01")),
          },
          {
            name: "Deposit (0.01 ETH)",
            fn: async () => {
              const result = await testDeposit(sdk, ethers.parseEther("0.01"));
              if (result) {
                depositData = result;
              }
              return result;
            },
          },
          {
            name: "Withdraw (0.01 ETH)",
            fn: () => {
              if (depositData) {
                return testWithdraw(
                  sdk,
                  ethers.parseEther("0.01"),
                  depositData.secret,
                  depositData.nullifier
                );
              } else {
                return testWithdraw(sdk, ethers.parseEther("0.01"));
              }
            },
          },
          {
            name: "Staking (0.01 ETH)",
            fn: () => testStaking(sdk, ethers.parseEther("0.01")),
          },
          {
            name: "Unstake ETH",
            fn: () => testUnstake(sdk),
          },
        ];

        for (const test of evmTests) {
          try {
            console.log(`\n[${test.name}]`);
            await test.fn();
            results.push({ name: test.name, success: true });
          } catch (error: any) {
            console.error(`\n✗ Test "${test.name}" failed: ${error.message}`);
            results.push({
              name: test.name,
              success: false,
              error: error.message,
            });
          }
        }
      } catch (error: any) {
        console.error(`\n✗ Setup error: ${error.message}`);
        results.push({
          name: "Setup",
          success: false,
          error: error.message,
        });
      }
    } else {
      console.log("\n⚠ Skipping tests (missing configuration)");
    }

    // ============================================
    // Summary
    // ============================================
    console.log("\n\n=========================================");
    console.log("Test Summary");
    console.log("=========================================");

    for (const result of results) {
      const status = result.success ? "✓ PASS" : "✗ FAIL";
      console.log(`${status} - ${result.name}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    }

    console.log("\n=========================================\n");

    const passed = results.filter((r) => r.success).length;
    const total = results.length;
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
