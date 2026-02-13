import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  AssetMode,
  TransactionResult,
  SolanaStakeSeason,
  SolanaStakerRecord,
} from "../types";
import factoryIdlJson from "./idl/aintivirus_factory.json";
import mixerIdlJson from "./idl/aintivirus_mixer.json";
import stakingIdlJson from "./idl/aintivirus_staking.json";

import type { AintivirusFactory } from "./types/aintivirus_factory";
import type { AintivirusMixer } from "./types/aintivirus_mixer";
import type { AintivirusStaking } from "./types/aintivirus_staking";

import { Buffer } from "buffer";
/**
 * Solana SDK for AintiVirus Mixer
 */
export class AintiVirusSolana {
  private factoryProgram: anchor.Program<AintivirusFactory>;
  private mixerProgram: anchor.Program<AintivirusMixer>;
  private stakingProgram: anchor.Program<AintivirusStaking>;
  private connection: Connection;
  private wallet: anchor.Wallet;
  private tokenMint?: PublicKey;

  constructor(
    wallet: anchor.Wallet,
    connection: Connection,
    tokenMint?: string,
  ) {
    this.connection = connection;
    this.wallet = wallet;

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // Set the provider on Anchor so it's available globally
    anchor.setProvider(provider);

    // Import IDL files directly
    // Ensure metadata.address is set for Anchor 0.32.1
    const factoryIdl = this.ensureIdlAddress(
      factoryIdlJson,
    ) as AintivirusFactory;
    const mixerIdl = this.ensureIdlAddress(mixerIdlJson) as AintivirusMixer;
    const stakingIdl = this.ensureIdlAddress(
      stakingIdlJson,
    ) as AintivirusStaking;

    // Initialize programs with IDLs
    this.factoryProgram = new anchor.Program(factoryIdl, provider);
    this.mixerProgram = new anchor.Program(mixerIdl, provider);
    this.stakingProgram = new anchor.Program(stakingIdl, provider);

    if (tokenMint) {
      this.tokenMint = new PublicKey(tokenMint);
    }
  }

  /**
   * Ensure IDL has address in metadata.address for Anchor 0.32.1
   */
  private ensureIdlAddress(idlJson: any): anchor.Idl {
    // If metadata.address already exists, return as-is
    if (idlJson.metadata?.address) {
      return idlJson as anchor.Idl;
    }

    // Get address from top level or metadata
    const programAddress = idlJson.address || idlJson.metadata?.address;
    if (!programAddress) {
      throw new Error(
        `IDL missing program address. Expected 'address' field at top level or in metadata.`,
      );
    }

    // Ensure metadata.address is set
    return {
      ...idlJson,
      metadata: {
        ...(idlJson.metadata || {}),
        address: programAddress,
      },
    } as anchor.Idl;
  }

  /**
   * Set token mint address (can be called after initialization)
   */
  setTokenMint(tokenMint: PublicKey): void {
    this.tokenMint = tokenMint;
  }

  /**
   * Get factory PDA
   */
  private getFactoryPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("factory")],
      this.factoryProgram.programId,
    );
  }

  /**
   * Get mixer pool PDA
   */
  private getMixerPoolPda(
    mode: AssetMode,
    amount: bigint,
  ): [PublicKey, number] {
    const amountBuffer = Buffer.allocUnsafe(8);
    amountBuffer.writeBigUInt64LE(amount, 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("mixer_pool"), Buffer.from([mode]), amountBuffer],
      this.factoryProgram.programId,
    );
  }

  /**
   * Get mixer config PDA
   */
  private getMixerConfigPda(
    mode: AssetMode,
    amount: bigint,
  ): [PublicKey, number] {
    const amountBuffer = Buffer.allocUnsafe(8);
    amountBuffer.writeBigUInt64LE(amount, 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("mixer_config"), Buffer.from([mode]), amountBuffer],
      this.mixerProgram.programId,
    );
  }

  /**
   * Get merkle tree PDA
   */
  private getMerkleTreePda(mixerConfigPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("merkle_tree"), mixerConfigPda.toBuffer()],
      this.mixerProgram.programId,
    );
  }

  /**
   * Get vault SOL PDA
   */
  private getVaultSolPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from("sol")],
      this.factoryProgram.programId,
    );
  }

  /**
   * Get staking PDA
   */
  private getStakingPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("staking")],
      this.stakingProgram.programId,
    );
  }

  /**
   * Get stake season PDA
   */
  private getStakeSeasonPda(seasonId: bigint): [PublicKey, number] {
    const seasonIdBuffer = Buffer.allocUnsafe(8);
    seasonIdBuffer.writeBigUInt64LE(seasonId, 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("stake_season"), seasonIdBuffer],
      this.stakingProgram.programId,
    );
  }

  /**
   * Get staker record PDA
   */
  private getStakerRecordPda(staker: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("staker_record"), staker.toBuffer()],
      this.stakingProgram.programId,
    );
  }

  /**
   * Get season claimed PDA
   */
  private getSeasonClaimedPda(
    staker: PublicKey,
    seasonId: bigint,
    mode: AssetMode = AssetMode.SOL,
  ): [PublicKey, number] {
    const seasonIdBuffer = Buffer.allocUnsafe(8);
    seasonIdBuffer.writeBigUInt64LE(seasonId, 0);
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("season_claimed"),
        staker.toBuffer(),
        seasonIdBuffer,
        Buffer.from([mode]),
      ],
      this.stakingProgram.programId,
    );
  }

  /**
   * Check if an address has claimed rewards for a season
   * @param address - Staker's public key
   * @param seasonId - Season ID to check
   * @param mode - Asset mode (SOL or TOKEN)
   * @returns true if the address has claimed rewards for the season
   */
  private async hasClaimed(
    address: string,
    seasonId: bigint,
    mode: AssetMode,
  ): Promise<boolean> {
    const stakerPubkey = new PublicKey(address);
    const [claimPda] = this.getSeasonClaimedPda(stakerPubkey, seasonId, mode);

    try {
      await this.stakingProgram.account.seasonClaimed.fetch(claimPda);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get commitment checker PDA
   */
  private getCommitmentCheckerPda(commitment: Buffer): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("commitment"), commitment],
      this.mixerProgram.programId,
    );
  }

  /**
   * Get nullifier hash checker PDA
   */
  private getNullifierHashCheckerPda(
    nullifierHash: Buffer,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier_hash"), nullifierHash],
      this.mixerProgram.programId,
    );
  }

  /**
   * Get mixer address for a specific mode and amount
   */
  async getMixer(mode: AssetMode, amount: bigint): Promise<PublicKey> {
    const [mixerPoolPda] = this.getMixerPoolPda(mode, amount);

    // Call get_mixer instruction (view function)
    try {
      const mixerConfigPubkey = await this.factoryProgram.methods
        .getMixer(mode, new anchor.BN(amount.toString()))
        .accounts({
          mixerPool: mixerPoolPda,
        })
        .view();

      return mixerConfigPubkey as PublicKey;
    } catch (error) {
      throw new Error(`Mixer not found for mode ${mode}, amount ${amount}`);
    }
  }

  /**
   * Check if mixer exists
   */
  async mixerExists(mode: AssetMode, amount: bigint): Promise<boolean> {
    try {
      await this.getMixer(mode, amount);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deposit SOL into the mixer
   */
  async depositSol(
    amount: bigint,
    commitment: bigint,
  ): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();

    const [mixerPoolPda] = this.getMixerPoolPda(AssetMode.SOL, amount);
    const [mixerConfigPda] = this.getMixerConfigPda(AssetMode.SOL, amount);
    const [merkleTreePda] = this.getMerkleTreePda(mixerConfigPda);
    // Convert commitment bigint to 32-byte buffer (same as reference implementation)
    const commitmentHex = commitment.toString(16).padStart(64, "0");
    const commitmentBytes = Buffer.from(commitmentHex, "hex");
    const [commitmentCheckerPda] =
      this.getCommitmentCheckerPda(commitmentBytes);

    // Get token mint from factory account
    const factoryAccount =
      await this.factoryProgram.account.factory.fetch(factoryPda);
    const tokenMint = new PublicKey(factoryAccount.mint);
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      factoryPda,
      true,
    );

    try {
      const commitmentArray = Array.from(commitmentBytes);
      const tx = await this.factoryProgram.methods
        .deposit(
          AssetMode.SOL,
          new anchor.BN(amount.toString()),
          commitmentArray,
        )
        .accounts({
          commitmentChecker: commitmentCheckerPda as PublicKey,
          merkleTree: merkleTreePda as PublicKey,
          mixerConfig: mixerConfigPda as PublicKey,
          mixerPool: mixerPoolPda as PublicKey,
          userTokenAccount: null,
          vaultTokenAccount: vaultTokenAccount,
          user: this.wallet.publicKey as PublicKey,
        })
        .rpc();

      const signature = tx;

      const txDetails = await this.connection.getTransaction(signature, {
        commitment: "confirmed",
      });

      return {
        txHash: signature,
        blockTime: txDetails?.blockTime ?? undefined,
      };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error(
        "[depositSol] ✗ Error preparing/sending transaction:",
        errorMsg,
      );
      if (error?.stack) {
        console.error("[depositSol] Stack trace:", error.stack);
      }
      if (error?.logs) {
        console.error("[depositSol] Error logs:", error.logs);
      }
      throw error;
    }
  }

  /**
   * Deposit tokens into the mixer
   */
  async depositToken(
    amount: bigint,
    commitment: bigint,
  ): Promise<TransactionResult> {
    if (!this.tokenMint) {
      throw new Error("Token mint not configured");
    }

    const [factoryPda] = this.getFactoryPda();
    const [mixerPoolPda] = this.getMixerPoolPda(AssetMode.TOKEN, amount);
    const [mixerConfigPda] = this.getMixerConfigPda(AssetMode.TOKEN, amount);
    const [merkleTreePda] = this.getMerkleTreePda(mixerConfigPda);

    const userTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey,
    );

    const vaultTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true, // allowOwnerOffCurve
    );

    // Convert commitment bigint to 32-byte buffer (same as reference implementation)
    const commitmentHex = commitment.toString(16).padStart(64, "0");
    const commitmentBytes = Buffer.from(commitmentHex, "hex");
    const [commitmentCheckerPda] =
      this.getCommitmentCheckerPda(commitmentBytes);

    const tx = await this.factoryProgram.methods
      .deposit(
        AssetMode.TOKEN,
        new anchor.BN(amount.toString()),
        Array.from(commitmentBytes),
      )
      .accounts({
        vaultTokenAccount: vaultTokenAccount,
        mixerPool: mixerPoolPda,
        mixerConfig: mixerConfigPda,
        merkleTree: merkleTreePda,
        commitmentChecker: commitmentCheckerPda,
        user: this.wallet.publicKey,
        userTokenAccount: userTokenAccount,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Withdraw from the mixer
   */
  async withdraw(
    instructionData: Buffer,
    nullifierHash: bigint,
    amount: bigint,
    mode: AssetMode,
    recipient?: PublicKey,
  ): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();
    const [vaultSolPda] = this.getVaultSolPda();
    const [mixerPoolPda] = this.getMixerPoolPda(mode, amount);
    const [mixerConfigPda] = this.getMixerConfigPda(mode, amount);
    const [merkleTreePda] = this.getMerkleTreePda(mixerConfigPda);
    const recipientPubkey = recipient || this.wallet.publicKey;

    // Convert nullifier hash bigint to 32-byte buffer (same as reference implementation)
    const nullifierHashHex = nullifierHash.toString(16).padStart(64, "0");
    const nullifierHashBytes = Buffer.from(nullifierHashHex, "hex");
    const [nullifierHashCheckerPda] =
      this.getNullifierHashCheckerPda(nullifierHashBytes);

    let recipientTokenAccount: PublicKey | null = null;
    let vaultTokenAccount: PublicKey | null = null;
    if (mode === AssetMode.TOKEN && this.tokenMint) {
      recipientTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        recipientPubkey,
      );
      vaultTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        factoryPda,
        true,
      );
    }

    const tx = await this.factoryProgram.methods
      .withdraw(
        mode,
        new anchor.BN(amount.toString()),
        instructionData, // Buffer type
        Array.from(nullifierHashBytes),
      )
      .accounts({
        mixerPool: mixerPoolPda,
        mixerConfig: mixerConfigPda,
        merkleTree: merkleTreePda,
        nullifierHashChecker: nullifierHashCheckerPda,
        recipient: recipientPubkey,
        payer: this.wallet.publicKey,
        vaultTokenAccount: vaultTokenAccount as PublicKey,
        recipientTokenAccount: recipientTokenAccount,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Stake SOL
   */
  async stakeSol(amount: bigint): Promise<TransactionResult> {
    const [stakerRecordPda] = this.getStakerRecordPda(this.wallet.publicKey);

    const tx = await this.factoryProgram.methods
      .stakeSol(new anchor.BN(amount.toString()))
      .accounts({
        stakerRecord: stakerRecordPda,
        user: this.wallet.publicKey,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Stake tokens
   */
  async stakeToken(amount: bigint): Promise<TransactionResult> {
    if (!this.tokenMint) {
      throw new Error("Token mint not configured");
    }

    const [factoryPda] = this.getFactoryPda();
    const [stakerRecordPda] = this.getStakerRecordPda(this.wallet.publicKey);

    const userTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey,
    );
    const vaultTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true,
    );

    const tx = await this.factoryProgram.methods
      .stakeToken(new anchor.BN(amount.toString()))
      .accounts({
        // factory, staking, stake_season, staking_program, token_program, system_program are auto-populated
        user: this.wallet.publicKey,
        stakerRecord: stakerRecordPda,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Claim SOL rewards
   */
  async claimSol(seasonId: bigint): Promise<TransactionResult> {
    const [seasonClaimedPda] = this.getSeasonClaimedPda(
      this.wallet.publicKey,
      seasonId,
    );

    const tx = await this.factoryProgram.methods
      .claimSol(new anchor.BN(seasonId.toString()))
      .accounts({
        // factory, vault_sol, staking, stake_season, staking_program, system_program are auto-populated
        seasonClaimed: seasonClaimedPda,
        staker: this.wallet.publicKey,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Claim token rewards
   */
  async claimToken(seasonId: bigint): Promise<TransactionResult> {
    if (!this.tokenMint) {
      throw new Error("Token mint not configured");
    }

    const [factoryPda] = this.getFactoryPda();
    const [stakerRecordPda] = this.getStakerRecordPda(this.wallet.publicKey);
    const [seasonClaimedPda] = this.getSeasonClaimedPda(
      this.wallet.publicKey,
      seasonId,
      AssetMode.TOKEN,
    );

    const stakerTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey,
    );
    const vaultTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true,
    );

    const tx = await this.factoryProgram.methods
      .claimToken(new anchor.BN(seasonId.toString()))
      .accounts({
        // factory, staking, stake_season, staking_program, token_program, system_program are auto-populated
        seasonClaimed: seasonClaimedPda,
        staker: this.wallet.publicKey,
        vaultTokenAccount: vaultTokenAccount,
        stakerTokenAccount: stakerTokenAccount,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Unstake SOL
   */
  async unstakeSol(): Promise<TransactionResult> {
    const tx = await this.factoryProgram.methods
      .unstakeSol()
      .accounts({
        staker: this.wallet.publicKey,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Unstake tokens
   */
  async unstakeToken(): Promise<TransactionResult> {
    if (!this.tokenMint) {
      throw new Error("Token mint not configured");
    }

    const [factoryPda] = this.getFactoryPda();

    const recipientTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey,
    );
    const vaultTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true,
    );

    const tx = await this.factoryProgram.methods
      .unstakeToken()
      .accounts({
        staker: this.wallet.publicKey,
        recipientTokenAccount: recipientTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Get current stake season
   */
  async getCurrentStakeSeason(): Promise<bigint> {
    const [stakingPda] = this.getStakingPda();
    try {
      const stakingAccount =
        await this.stakingProgram.account.staking.fetch(stakingPda);
      return BigInt(stakingAccount.currentStakeSeason.toString());
    } catch {
      // If staking account doesn't exist, return 0
      return 0n;
    }
  }

  /**
   * Get SOL balance
   */
  async getSolBalance(address: PublicKey): Promise<bigint> {
    const balance = await this.connection.getBalance(address);
    return BigInt(balance);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(address: PublicKey): Promise<bigint> {
    if (!this.tokenMint) {
      throw new Error("Token mint not configured");
    }

    const tokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      address,
    );

    try {
      const accountInfo =
        await this.connection.getTokenAccountBalance(tokenAccount);
      return BigInt(accountInfo.value.amount);
    } catch {
      return 0n;
    }
  }

  /**
   * Initialize factory account
   * @param feeRate Fee rate in basis points (e.g., 250 = 0.25%)
   * @param tokenMint Token mint address (required for vault_token_account)
   */
  async initializeFactory(
    feeRate: bigint,
    tokenMint: PublicKey,
  ): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();

    // Derive vault token account (factory PDA's associated token account)
    const vaultTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      factoryPda,
      true,
    );

    const tx = await this.factoryProgram.methods
      .initializeFactory(new anchor.BN(feeRate.toString()))
      .accounts({
        vaultTokenAccount: vaultTokenAccount,
        mint: tokenMint,
      })
      .rpc();

    const slot = await this.connection.getSlot();
    const blockTime = await this.connection.getBlockTime(slot);

    return {
      txHash: tx,
      blockTime: blockTime || undefined,
    };
  }

  /**
   * Deploy mixer instance
   */
  async deployMixer(
    mode: AssetMode,
    amount: bigint,
  ): Promise<TransactionResult> {
    const [mixerPoolPda] = this.getMixerPoolPda(mode, amount);
    const [mixerConfigPda] = this.getMixerConfigPda(mode, amount);
    const [merkleTreePda] = this.getMerkleTreePda(mixerConfigPda);

    const tx = await this.factoryProgram.methods
      .deployMixer(mode, new anchor.BN(amount.toString()))
      .accounts({
        mixerPool: mixerPoolPda,
        mixerConfig: mixerConfigPda,
        merkleTree: merkleTreePda,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Set fee rate (admin function)
   */
  async setFeeRate(feeRate: bigint): Promise<TransactionResult> {
    const tx = await this.factoryProgram.methods
      .setFeeRate(new anchor.BN(feeRate.toString()))
      .accounts({
        authority: this.wallet.publicKey,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Set staking season period (admin function)
   */
  async setStakingSeasonPeriod(period: bigint): Promise<TransactionResult> {
    const tx = await this.factoryProgram.methods
      .setStakingSeasonPeriod(new anchor.BN(period.toString()))
      .accounts({})
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Start stake season (admin function)
   */
  async startStakeSeason(nextSeasonId: bigint): Promise<TransactionResult> {
    const [nextStakeSeasonPda] = this.getStakeSeasonPda(nextSeasonId);

    const tx = await this.factoryProgram.methods
      .startStakeSeason(new anchor.BN(nextSeasonId.toString()))
      .accounts({
        nextStakeSeason: nextStakeSeasonPda as PublicKey,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime ?? undefined,
    };
  }

  /**
   * Calculate deposit amount including fees
   */
  async calculateDepositAmount(amount: bigint): Promise<bigint> {
    const [factoryPda] = this.getFactoryPda();
    let factoryAccount: any;
    try {
      factoryAccount =
        await this.factoryProgram.account.factory.fetch(factoryPda);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("array")) {
        throw new Error(
          `Failed to deserialize factory account. This may indicate an IDL type mismatch. ` +
            `Original error: ${errorMsg}`,
        );
      }
      throw error;
    }
    const feeRateValue = factoryAccount.feeRate;

    const feeRate = feeRateValue ? BigInt(feeRateValue.toString()) : 0n;

    // Calculate: amount + (amount * feeRate / 10000)
    return amount + (amount * feeRate) / 10000n;
  }

  /**
   * Get fee rate
   */
  async getFeeRate(): Promise<bigint> {
    const [factoryPda] = this.getFactoryPda();
    try {
      const factoryAccount =
        await this.factoryProgram.account.factory.fetch(factoryPda);
      return factoryAccount?.feeRate
        ? BigInt(factoryAccount.feeRate.toString())
        : 0n;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("array")) {
        throw new Error(
          `Failed to deserialize factory account. This may indicate an IDL type mismatch. ` +
            `Original error: ${errorMsg}`,
        );
      }
      throw error;
    }
  }

  /**
   * Get factory account (includes mint address)
   */
  async getFactoryAccount(): Promise<any> {
    const [factoryPda] = this.getFactoryPda();
    return await this.factoryProgram.account.factory.fetch(factoryPda);
  }

  /**
   * Get stake season information
   */
  async getStakeSeason(seasonId: bigint): Promise<SolanaStakeSeason> {
    // Fetch stake season from staking program
    const [seasonPda] = this.getStakeSeasonPda(seasonId);

    try {
      const seasonAccount =
        await this.stakingProgram.account.stakeSeason.fetch(seasonPda);
      return {
        seasonId: BigInt(seasonAccount.seasonId?.toString() || "0"),
        startTimestamp: BigInt(seasonAccount.startTimestamp?.toString() || "0"),
        endTimestamp: BigInt(seasonAccount.endTimestamp?.toString() || "0"),
        totalStakedSolAmount: BigInt(
          seasonAccount.totalStakedSolAmount?.toString() || "0",
        ),
        totalStakedTokenAmount: BigInt(
          seasonAccount.totalStakedTokenAmount?.toString() || "0",
        ),
        totalRewardSolAmount: BigInt(
          seasonAccount.totalRewardSolAmount?.toString() || "0",
        ),
        totalRewardTokenAmount: BigInt(
          seasonAccount.totalRewardTokenAmount?.toString() || "0",
        ),
        totalSolWeightValue: BigInt(
          seasonAccount.totalSolWeightValue?.toString() || "0",
        ),
        totalTokenWeightValue: BigInt(
          seasonAccount.totalTokenWeightValue?.toString() || "0",
        ),
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Stake season ${seasonId} not found. Original error: ${errorMsg}`,
      );
    }
  }

  /**
   * Get staker record
   */
  async getStakerRecord(address: string): Promise<SolanaStakerRecord> {
    const stakerPubkey = new PublicKey(address);
    const stakerRecordPda = PublicKey.findProgramAddressSync(
      [Buffer.from("staker_record"), stakerPubkey.toBuffer()],
      this.stakingProgram.programId,
    )[0];

    try {
      const stakerRecord =
        await this.stakingProgram.account.stakerRecord.fetch(stakerRecordPda);
      return {
        solStakedSeasonId: BigInt(
          stakerRecord.solStakedSeasonId?.toString() || "0",
        ),
        tokenStakedSeasonId: BigInt(
          stakerRecord.tokenStakedSeasonId?.toString() || "0",
        ),
        solStakedTimestamp: BigInt(
          stakerRecord.solStakedTimestamp?.toString() || "0",
        ),
        tokenStakedTimestamp: BigInt(
          stakerRecord.tokenStakedTimestamp?.toString() || "0",
        ),
        stakedSolAmount: BigInt(
          stakerRecord.stakedSolAmount?.toString() || "0",
        ),
        stakedTokenAmount: BigInt(
          stakerRecord.stakedTokenAmount?.toString() || "0",
        ),
        solWeightValue: BigInt(stakerRecord.solWeightValue?.toString() || "0"),
        tokenWeightValue: BigInt(
          stakerRecord.tokenWeightValue?.toString() || "0",
        ),
      };
    } catch {
      throw new Error(`Staker record for ${address} not found`);
    }
  }

  /**
   * Check if address has claimed SOL for a season
   */
  async hasClaimedSol(address: string, seasonId: bigint): Promise<boolean> {
    return this.hasClaimed(address, seasonId, AssetMode.SOL);
  }

  /**
   * Check if address has claimed tokens for a season
   */
  async hasClaimedToken(address: string, seasonId: bigint): Promise<boolean> {
    return this.hasClaimed(address, seasonId, AssetMode.TOKEN);
  }

  /**
   * Get staking address (PDA)
   */
  async getStakingAddress(): Promise<PublicKey> {
    const [factoryPda] = this.getFactoryPda();
    const factoryAccount =
      await this.factoryProgram.account.factory.fetch(factoryPda);
    return factoryAccount.stakingProgram as PublicKey;
  }
}
