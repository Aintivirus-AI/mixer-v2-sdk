import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  AssetMode,
  TransactionResult,
  StakeSeason,
  StakerRecord,
} from "../types";
import factoryIdlJson from "./idl/aintivirus_factory.json";
import mixerIdlJson from "./idl/aintivirus_mixer.json";
import stakingIdlJson from "./idl/aintivirus_staking.json";

import type { AintivirusFactory } from "./types/aintivirus_factory";
import type { AintivirusMixer } from "./types/aintivirus_mixer";
import type { AintivirusStaking } from "./types/aintivirus_staking";

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
    tokenMint?: string
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
      factoryIdlJson
    ) as AintivirusFactory;
    const mixerIdl = this.ensureIdlAddress(mixerIdlJson) as AintivirusMixer;
    const stakingIdl = this.ensureIdlAddress(
      stakingIdlJson
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
        `IDL missing program address. Expected 'address' field at top level or in metadata.`
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
      this.factoryProgram.programId
    );
  }

  /**
   * Get mixer pool PDA
   */
  private getMixerPoolPda(
    mode: AssetMode,
    amount: bigint
  ): [PublicKey, number] {
    const amountBuffer = Buffer.allocUnsafe(8);
    amountBuffer.writeBigUInt64LE(amount, 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("mixer_pool"), Buffer.from([mode]), amountBuffer],
      this.factoryProgram.programId
    );
  }

  /**
   * Get mixer config PDA
   */
  private getMixerConfigPda(
    mode: AssetMode,
    amount: bigint
  ): [PublicKey, number] {
    const amountBuffer = Buffer.allocUnsafe(8);
    amountBuffer.writeBigUInt64LE(amount, 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("mixer_config"), Buffer.from([mode]), amountBuffer],
      this.mixerProgram.programId
    );
  }

  /**
   * Get merkle tree PDA
   */
  private getMerkleTreePda(mixerConfigPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("merkle_tree"), mixerConfigPda.toBuffer()],
      this.mixerProgram.programId
    );
  }

  /**
   * Get vault SOL PDA
   */
  private getVaultSolPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from("sol")],
      this.factoryProgram.programId
    );
  }

  /**
   * Get staking PDA
   */
  private getStakingPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("staking")],
      this.stakingProgram.programId
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
      this.stakingProgram.programId
    );
  }

  /**
   * Get staker record PDA
   */
  private getStakerRecordPda(staker: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("staker_record"), staker.toBuffer()],
      this.stakingProgram.programId
    );
  }

  /**
   * Get season claimed PDA
   */
  private getSeasonClaimedPda(
    staker: PublicKey,
    seasonId: bigint,
    mode: AssetMode = AssetMode.SOL
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
      this.stakingProgram.programId
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
    mode: AssetMode
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
      this.mixerProgram.programId
    );
  }

  /**
   * Get nullifier hash checker PDA
   */
  private getNullifierHashCheckerPda(
    nullifierHash: Buffer
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier_hash"), nullifierHash],
      this.mixerProgram.programId
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
    commitment: bigint
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
    const factoryAccount = await this.factoryProgram.account.factory.fetch(
      factoryPda
    );
    const tokenMint = new PublicKey(factoryAccount.mint);
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      factoryPda,
      true
    );

    try {
      const commitmentArray = Array.from(commitmentBytes);
      const tx = await this.factoryProgram.methods
        .deposit(
          AssetMode.SOL,
          new anchor.BN(amount.toString()),
          commitmentArray
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
        errorMsg
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
    commitment: bigint
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
      this.wallet.publicKey
    );

    const vaultTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true // allowOwnerOffCurve
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
        Array.from(commitmentBytes)
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
    recipient?: PublicKey
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

    const accounts: any = {
      // factory, vault_sol, mixer_program, token_program, system_program are auto-populated
      vault_token_account: vaultSolPda, // Will be set correctly for token mode
      mixer_pool: mixerPoolPda,
      mixer_config: mixerConfigPda,
      merkle_tree: merkleTreePda,
      nullifier_hash_checker: nullifierHashCheckerPda,
      recipient: recipientPubkey,
      payer: this.wallet.publicKey,
    };

    if (mode === AssetMode.TOKEN && this.tokenMint) {
      const recipientTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        recipientPubkey
      );
      const vaultTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        factoryPda,
        true
      );
      accounts.vault_token_account = vaultTokenAccount;
      accounts.recipient_token_account = recipientTokenAccount;
    }

    const tx = await this.factoryProgram.methods
      .withdraw(
        mode,
        new anchor.BN(amount.toString()),
        instructionData, // Buffer type
        Array.from(nullifierHashBytes)
      )
      .accounts(accounts)
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
        user: this.wallet.publicKey,
        stakerRecord: stakerRecordPda,
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
      this.wallet.publicKey
    );
    const vaultTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true
    );

    const tx = await this.factoryProgram.methods
      .stakeToken(new anchor.BN(amount.toString()))
      .accounts({
        // factory, staking, stake_season, staking_program, token_program, system_program are auto-populated
        user: this.wallet.publicKey,
        staker_record: stakerRecordPda,
        user_token_account: userTokenAccount,
        vault_token_account: vaultTokenAccount,
      } as any)
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
    const [stakerRecordPda] = this.getStakerRecordPda(this.wallet.publicKey);
    const [seasonClaimedPda] = this.getSeasonClaimedPda(
      this.wallet.publicKey,
      seasonId
    );

    const tx = await this.factoryProgram.methods
      .claimSol(new anchor.BN(seasonId.toString()))
      .accounts({
        // factory, vault_sol, staking, stake_season, staking_program, system_program are auto-populated
        staker_record: stakerRecordPda,
        season_claimed: seasonClaimedPda,
        staker: this.wallet.publicKey,
      } as any)
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
      AssetMode.TOKEN
    );

    const stakerTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey
    );
    const vaultTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true
    );

    const tx = await this.factoryProgram.methods
      .claimToken(new anchor.BN(seasonId.toString()))
      .accounts({
        // factory, staking, stake_season, staking_program, token_program, system_program are auto-populated
        staker_record: stakerRecordPda,
        season_claimed: seasonClaimedPda,
        staker: this.wallet.publicKey,
        vault_token_account: vaultTokenAccount,
        staker_token_account: stakerTokenAccount,
      } as any)
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
    const [stakerRecordPda] = this.getStakerRecordPda(this.wallet.publicKey);

    const tx = await this.factoryProgram.methods
      .unstakeSol()
      .accounts({
        // factory, vault_sol, staking, stake_season, staking_program, system_program are auto-populated
        staker_record: stakerRecordPda,
        staker: this.wallet.publicKey,
      } as any)
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

    // Get current stake season from staking account
    const [stakerRecordPda] = this.getStakerRecordPda(this.wallet.publicKey);

    const recipientTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey
    );
    const vaultTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true
    );

    const tx = await this.factoryProgram.methods
      .unstakeToken()
      .accounts({
        // factory, staking_program, staking, stake_season, token_program, system_program are auto-populated
        staker_record: stakerRecordPda,
        staker: this.wallet.publicKey,
        recipient_token_account: recipientTokenAccount,
        vault_token_account: vaultTokenAccount,
      } as any)
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
      const stakingAccount = await this.stakingProgram.account.staking.fetch(
        stakingPda
      );
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
      address
    );

    try {
      const accountInfo = await this.connection.getTokenAccountBalance(
        tokenAccount
      );
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
    tokenMint: PublicKey
  ): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();

    // Derive vault token account (factory PDA's associated token account)
    const vaultTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      factoryPda,
      true
    );

    const tx = await this.factoryProgram.methods
      .initializeFactory(new anchor.BN(feeRate.toString()))
      .accounts({
        // factory, authority, vault_sol, token_program, staking_program, system_program are auto-populated
        vault_token_account: vaultTokenAccount,
        mint: tokenMint,
      } as any)
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
    amount: bigint
  ): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();
    const [mixerPoolPda] = this.getMixerPoolPda(mode, amount);
    const [mixerConfigPda] = this.getMixerConfigPda(mode, amount);
    const [merkleTreePda] = this.getMerkleTreePda(mixerConfigPda);

    const accounts: any = {
      factory: factoryPda,
      payer: this.wallet.publicKey,
      mixerProgram: this.mixerProgram.programId,
      mixerPool: mixerPoolPda,
      mixerConfig: mixerConfigPda,
      merkleTree: merkleTreePda,
      systemProgram: SystemProgram.programId,
    };

    if (mode === AssetMode.TOKEN && this.tokenMint) {
      const factoryTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        factoryPda,
        true
      );
      accounts.tokenMint = this.tokenMint;
      accounts.factoryTokenAccount = factoryTokenAccount;
      accounts.tokenProgram = TOKEN_PROGRAM_ID;
    }

    const tx = await this.factoryProgram.methods
      .deployMixer(mode, new anchor.BN(amount.toString()))
      .accounts({
        // factory, authority, mixer_program, system_program are auto-populated
        mixer_pool: mixerPoolPda,
        mixer_config: mixerConfigPda,
        merkle_tree: merkleTreePda,
      } as any)
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
        // factory and authority are auto-populated
      } as any)
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
      .accounts({
        // factory, authority, staking, staking_program are auto-populated
      } as any)
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
    const [stakingPda] = this.getStakingPda();

    // Get current stake season from staking account
    let stakingAccount: any;
    try {
      stakingAccount = await this.stakingProgram.account.staking.fetch(
        stakingPda
      );
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("array")) {
        throw new Error(
          `Failed to deserialize staking account. This may indicate an IDL type mismatch. ` +
            `Original error: ${errorMsg}. ` +
            `Try checking if the account structure matches the IDL definition.`
        );
      }
      throw error;
    }

    if (!stakingAccount || !(stakingAccount as any).currentStakeSeason) {
      throw new Error(
        "Staking account data is invalid or missing currentStakeSeason"
      );
    }

    const currentSeasonId = BigInt(
      (stakingAccount as any).currentStakeSeason.toString()
    );
    const [currentStakeSeasonPda] = this.getStakeSeasonPda(currentSeasonId);
    const [nextStakeSeasonPda] = this.getStakeSeasonPda(nextSeasonId);

    const tx = await this.factoryProgram.methods
      .startStakeSeason(new anchor.BN(nextSeasonId.toString()))
      .accounts({
        // factory, authority, staking_program, staking, system_program are auto-populated
        current_stake_season: currentStakeSeasonPda,
        next_stake_season: nextStakeSeasonPda,
      } as any)
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
      factoryAccount = await this.factoryProgram.account.factory.fetch(
        factoryPda
      );
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("array")) {
        throw new Error(
          `Failed to deserialize factory account. This may indicate an IDL type mismatch. ` +
            `Original error: ${errorMsg}`
        );
      }
      throw error;
    }
    const feeRateValue = (factoryAccount as any).feeRate;

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
      const factoryAccount = await this.factoryProgram.account.factory.fetch(
        factoryPda
      );
      return factoryAccount?.feeRate
        ? BigInt(factoryAccount.feeRate.toString())
        : 0n;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("array")) {
        throw new Error(
          `Failed to deserialize factory account. This may indicate an IDL type mismatch. ` +
            `Original error: ${errorMsg}`
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
  async getStakeSeason(seasonId: bigint): Promise<StakeSeason> {
    // Fetch stake season from staking program
    const seasonPda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake_season"),
        new anchor.BN(seasonId.toString()).toArrayLike(Buffer, "be", 8),
      ],
      this.stakingProgram.programId
    )[0];

    try {
      const seasonAccount = await (
        this.stakingProgram.account as any
      ).stakeSeason.fetch(seasonPda);
      return {
        seasonId: BigInt((seasonAccount as any).seasonId?.toString() || "0"),
        startTimestamp: BigInt(
          (seasonAccount as any).startTimestamp?.toString() || "0"
        ),
        endTimestamp: BigInt(
          (seasonAccount as any).endTimestamp?.toString() || "0"
        ),
        totalStakedEthAmount: BigInt(
          (seasonAccount as any).totalStakedEthAmount?.toString() || "0"
        ),
        totalStakedTokenAmount: BigInt(
          (seasonAccount as any).totalStakedTokenAmount?.toString() || "0"
        ),
        totalRewardEthAmount: BigInt(
          (seasonAccount as any).totalRewardEthAmount?.toString() || "0"
        ),
        totalRewardTokenAmount: BigInt(
          (seasonAccount as any).totalRewardTokenAmount?.toString() || "0"
        ),
        totalEthWeightValue: BigInt(
          (seasonAccount as any).totalEthWeightValue?.toString() || "0"
        ),
        totalTokenWeightValue: BigInt(
          (seasonAccount as any).totalTokenWeightValue?.toString() || "0"
        ),
      };
    } catch {
      throw new Error(`Stake season ${seasonId} not found`);
    }
  }

  /**
   * Get staker record
   */
  async getStakerRecord(address: string): Promise<StakerRecord> {
    const stakerPubkey = new PublicKey(address);
    const stakerRecordPda = PublicKey.findProgramAddressSync(
      [Buffer.from("staker_record"), stakerPubkey.toBuffer()],
      this.stakingProgram.programId
    )[0];

    try {
      const stakerRecord = await (
        this.stakingProgram.account as any
      ).stakerRecord.fetch(stakerRecordPda);
      return {
        ethStakedSeasonId: BigInt(
          (stakerRecord as any).ethStakedSeasonId?.toString() || "0"
        ),
        tokenStakedSeasonId: BigInt(
          (stakerRecord as any).tokenStakedSeasonId?.toString() || "0"
        ),
        ethStakedTimestamp: BigInt(
          (stakerRecord as any).ethStakedTimestamp?.toString() || "0"
        ),
        tokenStakedTimestamp: BigInt(
          (stakerRecord as any).tokenStakedTimestamp?.toString() || "0"
        ),
        stakedEthAmount: BigInt(
          (stakerRecord as any).stakedEthAmount?.toString() || "0"
        ),
        stakedTokenAmount: BigInt(
          (stakerRecord as any).stakedTokenAmount?.toString() || "0"
        ),
        ethWeightValue: BigInt(
          (stakerRecord as any).ethWeightValue?.toString() || "0"
        ),
        tokenWeightValue: BigInt(
          (stakerRecord as any).tokenWeightValue?.toString() || "0"
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
    const factoryAccount = await (
      this.factoryProgram.account as any
    ).factory.fetch(factoryPda);
    return (factoryAccount as any).stakingProgram as PublicKey;
  }
}
