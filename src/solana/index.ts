import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection, Keypair, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { AssetMode, TransactionResult, StakeSeason, StakerRecord } from "../types";

/**
 * Solana SDK for AintiVirus Mixer
 */
export class AintiVirusSolana {
  private factoryProgram: anchor.Program;
  private mixerProgram: anchor.Program;
  private stakingProgram: anchor.Program;
  private connection: Connection;
  private wallet: anchor.Wallet;
  private tokenMint?: PublicKey;

  constructor(
    factoryProgramId: string,
    mixerProgramId: string,
    stakingProgramId: string,
    wallet: anchor.Wallet,
    connection: Connection,
    tokenMint?: string
  ) {
    this.connection = connection;
    this.wallet = wallet;

    // Initialize programs (using any type for IDL flexibility)
    this.factoryProgram = new anchor.Program(
      {} as any, // IDL should be loaded separately
      new PublicKey(factoryProgramId),
      new anchor.AnchorProvider(connection, wallet, {})
    );

    this.mixerProgram = new anchor.Program(
      {} as any,
      new PublicKey(mixerProgramId),
      new anchor.AnchorProvider(connection, wallet, {})
    );

    this.stakingProgram = new anchor.Program(
      {} as any,
      new PublicKey(stakingProgramId),
      new anchor.AnchorProvider(connection, wallet, {})
    );

    if (tokenMint) {
      this.tokenMint = new PublicKey(tokenMint);
    }
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
  private getMixerPoolPda(mode: AssetMode, amount: bigint): [PublicKey, number] {
    const amountBuffer = Buffer.allocUnsafe(8);
    amountBuffer.writeBigUInt64LE(amount, 0);
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("mixer_pool"),
        Buffer.from([mode]),
        amountBuffer,
      ],
      this.factoryProgram.programId
    );
  }

  /**
   * Get mixer config PDA
   */
  private getMixerConfigPda(mode: AssetMode, amount: bigint): [PublicKey, number] {
    const amountBuffer = Buffer.allocUnsafe(8);
    amountBuffer.writeBigUInt64LE(amount, 0);
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("mixer_config"),
        Buffer.from([mode]),
        amountBuffer,
      ],
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
    const [mixerPoolPda] = this.getMixerPoolPda(AssetMode.ETH, amount);
    const [mixerConfigPda] = this.getMixerConfigPda(AssetMode.ETH, amount);
    const [merkleTreePda] = this.getMerkleTreePda(mixerConfigPda);

    const commitmentBytes = Buffer.allocUnsafe(32);
    const commitmentBigInt = commitment;
    commitmentBytes.writeBigUInt64LE(commitmentBigInt & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
    commitmentBytes.writeBigUInt64LE((commitmentBigInt >> 64n) & BigInt("0xFFFFFFFFFFFFFFFF"), 8);
    commitmentBytes.writeBigUInt64LE((commitmentBigInt >> 128n) & BigInt("0xFFFFFFFFFFFFFFFF"), 16);
    commitmentBytes.writeBigUInt64LE((commitmentBigInt >> 192n) & BigInt("0xFFFFFFFFFFFFFFFF"), 24);

    const tx = await this.factoryProgram.methods
      .deposit(
        AssetMode.ETH,
        new anchor.BN(amount.toString()),
        Array.from(commitmentBytes)
      )
      .accounts({
        factory: factoryPda,
        payer: this.wallet.publicKey,
        mixerProgram: this.mixerProgram.programId,
        mixerPool: mixerPoolPda,
        mixerConfig: mixerConfigPda,
        merkleTree: merkleTreePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime,
    };
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

    const factoryTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true // allowOwnerOffCurve
    );

    const commitmentBytes = Buffer.allocUnsafe(32);
    const commitmentBigInt = commitment;
    commitmentBytes.writeBigUInt64LE(commitmentBigInt & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
    commitmentBytes.writeBigUInt64LE((commitmentBigInt >> 64n) & BigInt("0xFFFFFFFFFFFFFFFF"), 8);
    commitmentBytes.writeBigUInt64LE((commitmentBigInt >> 128n) & BigInt("0xFFFFFFFFFFFFFFFF"), 16);
    commitmentBytes.writeBigUInt64LE((commitmentBigInt >> 192n) & BigInt("0xFFFFFFFFFFFFFFFF"), 24);

    const tx = await this.factoryProgram.methods
      .deposit(
        AssetMode.TOKEN,
        new anchor.BN(amount.toString()),
        Array.from(commitmentBytes)
      )
      .accounts({
        factory: factoryPda,
        payer: this.wallet.publicKey,
        mixerProgram: this.mixerProgram.programId,
        mixerPool: mixerPoolPda,
        mixerConfig: mixerConfigPda,
        merkleTree: merkleTreePda,
        tokenMint: this.tokenMint,
        userTokenAccount: userTokenAccount,
        factoryTokenAccount: factoryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime,
    };
  }

  /**
   * Withdraw from the mixer
   */
  async withdraw(
    instructionData: Buffer,
    nullifierHash: bigint,
    amount: bigint,
    mode: AssetMode
  ): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();
    const [mixerPoolPda] = this.getMixerPoolPda(mode, amount);
    const [mixerConfigPda] = this.getMixerConfigPda(mode, amount);
    const [merkleTreePda] = this.getMerkleTreePda(mixerConfigPda);

    const nullifierHashBytes = Buffer.allocUnsafe(32);
    const nullifierHashBigInt = nullifierHash;
    nullifierHashBytes.writeBigUInt64LE(nullifierHashBigInt & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
    nullifierHashBytes.writeBigUInt64LE((nullifierHashBigInt >> 64n) & BigInt("0xFFFFFFFFFFFFFFFF"), 8);
    nullifierHashBytes.writeBigUInt64LE((nullifierHashBigInt >> 128n) & BigInt("0xFFFFFFFFFFFFFFFF"), 16);
    nullifierHashBytes.writeBigUInt64LE((nullifierHashBigInt >> 192n) & BigInt("0xFFFFFFFFFFFFFFFF"), 24);

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
      const userTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        this.wallet.publicKey
      );
      const factoryTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        factoryPda,
        true
      );
      accounts.tokenMint = this.tokenMint;
      accounts.userTokenAccount = userTokenAccount;
      accounts.factoryTokenAccount = factoryTokenAccount;
      accounts.tokenProgram = TOKEN_PROGRAM_ID;
    }

    const tx = await this.factoryProgram.methods
      .withdraw(
        mode,
        new anchor.BN(amount.toString()),
        Array.from(instructionData),
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
      blockTime: txDetails?.blockTime,
    };
  }

  /**
   * Stake SOL
   */
  async stakeSol(amount: bigint): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();

    const tx = await this.factoryProgram.methods
      .stakeEther(new anchor.BN(amount.toString()))
      .accounts({
        factory: factoryPda,
        staker: this.wallet.publicKey,
        stakingProgram: this.stakingProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime,
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
    const userTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey
    );
    const factoryTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true
    );

    const tx = await this.factoryProgram.methods
      .stakeToken(new anchor.BN(amount.toString()))
      .accounts({
        factory: factoryPda,
        staker: this.wallet.publicKey,
        stakingProgram: this.stakingProgram.programId,
        tokenMint: this.tokenMint,
        userTokenAccount: userTokenAccount,
        factoryTokenAccount: factoryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime,
    };
  }

  /**
   * Claim SOL rewards
   */
  async claimSol(seasonId: bigint): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();

    const tx = await this.factoryProgram.methods
      .claimEth(new anchor.BN(seasonId.toString()))
      .accounts({
        factory: factoryPda,
        staker: this.wallet.publicKey,
        stakingProgram: this.stakingProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime,
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
    const userTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey
    );
    const factoryTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true
    );

    const tx = await this.factoryProgram.methods
      .claimToken(new anchor.BN(seasonId.toString()))
      .accounts({
        factory: factoryPda,
        staker: this.wallet.publicKey,
        stakingProgram: this.stakingProgram.programId,
        tokenMint: this.tokenMint,
        userTokenAccount: userTokenAccount,
        factoryTokenAccount: factoryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime,
    };
  }

  /**
   * Unstake SOL
   */
  async unstakeSol(): Promise<TransactionResult> {
    const [factoryPda] = this.getFactoryPda();

    const tx = await this.factoryProgram.methods
      .unstakeEth()
      .accounts({
        factory: factoryPda,
        staker: this.wallet.publicKey,
        stakingProgram: this.stakingProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime,
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
    const userTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey
    );
    const factoryTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      factoryPda,
      true
    );

    const tx = await this.factoryProgram.methods
      .unstakeToken()
      .accounts({
        factory: factoryPda,
        staker: this.wallet.publicKey,
        stakingProgram: this.stakingProgram.programId,
        tokenMint: this.tokenMint,
        userTokenAccount: userTokenAccount,
        factoryTokenAccount: factoryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const signature = tx;
    const txDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    return {
      txHash: signature,
      blockTime: txDetails?.blockTime,
    };
  }

  /**
   * Get current stake season
   */
  async getCurrentStakeSeason(): Promise<bigint> {
    const [factoryPda] = this.getFactoryPda();
    const factoryAccount = await this.factoryProgram.account.factory.fetch(factoryPda);
    // Assuming factory account has currentStakeSeason field
    // This may need adjustment based on actual account structure
    return BigInt((factoryAccount as any).currentStakeSeason?.toString() || "0");
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
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
      return BigInt(accountInfo.value.amount);
    } catch {
      return 0n;
    }
  }
}

