import { Contract, Signer, Provider } from "ethers";
import {
  AssetMode,
  WithdrawalProof,
  TransactionResult,
  EVMStakeSeason,
  EVMStakerRecord,
} from "../types";
import { bigIntToBytes32 } from "../utils/crypto";

/**
 * EVM SDK for AintiVirus Mixer
 */
export class AintiVirusEVM {
  private factory: Contract;
  private token: Contract;
  private signer: Signer;
  private provider: Provider;

  // Factory ABI (minimal for main functions)
  private static readonly FACTORY_ABI = [
    "function deposit(uint256 _mode, uint256 _amount, bytes32 _commitment) payable",
    "function withdraw(tuple(uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[3] pubSignals) _proof, uint256 _amount, uint256 _mode)",
    "function withdrawRelayed(tuple(uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[3] pubSignals) _proof, uint256 _amount, uint256 _mode)",
    "function deployMixer(uint256 _mode, uint256 _amount) returns (address)",
    "function getMixer(uint256 _mode, uint256 _amount) view returns (address)",
    "function calculateDepositAmount(uint256 _amount) view returns (uint256)",
    "function feeRate() view returns (uint256)",
    "function relayerFeeRate() view returns (uint256)",
    "function staking() view returns (address)",
    "function mixToken() view returns (address)",
    "function stake(uint256 mode, uint256 amount) payable",
    "function claim(uint256 mode, uint256 seasonId) returns (uint256)",
    "function unstake(uint256 mode) returns (uint256)",
    "function getCurrentStakeSeason() view returns (uint256)",
    "function setFeeRate(uint256 _feeRate)",
    "function updateNextSeasonDuration(uint256 _duration)",
    "function startSeason()",
    "function setRelayerFeeRate(uint256 _relayerFeeRate)",
    "event MixerDeployed(address indexed mixer, uint256 indexed mode, uint256 indexed amount)",
    "event Deposit(uint256 indexed mode, uint256 amount, uint256 fee, bytes32 indexed commitment)",
    "event Withdrawal(uint256 indexed mode, uint256 amount, address to, bytes32 nullifierHash)",
    "event WithdrawalRelayed(uint256 indexed mode, uint256 amount, address indexed recipient, address indexed relayer, uint256 relayerFee, bytes32 nullifierHash)",
    "event FeeRateUpdated(uint256 oldFeeRate, uint256 newFeeRate)",
    "event RelayerFeeRateUpdated(uint256 oldRelayerFeeRate, uint256 newRelayerFeeRate)",
  ];

  // ERC20 ABI
  private static readonly ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  // Staking ABI
  private static readonly STAKING_ABI = [
    "function seasons(uint256 seasonId_, uint256 mode_) view returns (uint256 seasonId, uint256 start, uint256 end, uint256 duration, uint256 totalStaked, uint256 totalReward, uint256 totalWeight)",
    "function records(address staker_, uint256 mode_) view returns (uint64 seasonId, uint64 stakedAt, uint128 claimedCount, uint256 staked, uint256 weight)",
    "function wasSeasonClaimed(address staker, uint256 seasonId, uint256 mode) view returns (bool)",
    "function nextSeasonDuration() view returns (uint256)",
    "function currentSeasonId() view returns (uint256)",
  ];

  constructor(
    factoryAddress: string,
    tokenAddress: string,
    signerOrProvider: Signer | Provider
  ) {
    // Check if it's a Signer by checking for provider property
    // In ethers v6, Signer has a provider property, Provider doesn't
    const isSigner =
      signerOrProvider &&
      "provider" in signerOrProvider &&
      signerOrProvider.provider !== null;
    this.provider = isSigner
      ? (signerOrProvider as Signer).provider!
      : (signerOrProvider as Provider);
    this.signer = isSigner ? (signerOrProvider as Signer) : (null as any);

    this.factory = new Contract(
      factoryAddress,
      AintiVirusEVM.FACTORY_ABI,
      signerOrProvider
    );
    this.token = new Contract(
      tokenAddress,
      AintiVirusEVM.ERC20_ABI,
      signerOrProvider
    );
  }

  /**
   * Get the factory contract instance
   */
  getFactory(): Contract {
    return this.factory;
  }

  /**
   * Get the token contract instance
   */
  getToken(): Contract {
    return this.token;
  }

  /**
   * Get the provider instance
   */
  getProvider(): Provider {
    return this.provider;
  }

  /**
   * Calculate total deposit amount including fees
   */
  async calculateDepositAmount(amount: bigint): Promise<bigint> {
    return await this.factory.calculateDepositAmount(amount);
  }

  /**
   * Get fee rate
   */
  async getFeeRate(): Promise<bigint> {
    return await this.factory.feeRate();
  }

  /**
   * Get mixer address for a specific mode and amount
   */
  async getMixer(mode: AssetMode, amount: bigint): Promise<string> {
    return await this.factory.getMixer(mode, amount);
  }

  /**
   * Check if mixer exists for a specific mode and amount
   */
  async mixerExists(mode: AssetMode, amount: bigint): Promise<boolean> {
    const mixerAddress = await this.getMixer(mode, amount);
    return mixerAddress !== "0x0000000000000000000000000000000000000000";
  }

  /**
   * Deposit ETH into the mixer
   */
  async depositEth(
    amount: bigint,
    commitment: bigint
  ): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const totalAmount = await this.calculateDepositAmount(amount);
    const tx = await this.factory.deposit(
      AssetMode.ETH,
      amount,
      bigIntToBytes32(commitment),
      { value: totalAmount }
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Deposit tokens into the mixer
   */
  async depositToken(
    amount: bigint,
    commitment: bigint
  ): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const totalAmount = await this.calculateDepositAmount(amount);
    const factoryAddress = await this.factory.getAddress();

    // Check and approve if needed
    const allowance = await this.token.allowance(
      await this.signer.getAddress(),
      factoryAddress
    );
    if (allowance < totalAmount) {
      const approveTx = await this.token.approve(factoryAddress, totalAmount);
      await approveTx.wait();
    }

    const tx = await this.factory.deposit(
      AssetMode.TOKEN,
      amount,
      bigIntToBytes32(commitment)
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Withdraw from the mixer
   */
  async withdraw(
    proof: WithdrawalProof,
    amount: bigint,
    mode: AssetMode
  ): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    // Format proof for contract
    const formattedProof = {
      pA: [proof.pA[0].toString(), proof.pA[1].toString()],
      pB: [
        [proof.pB[0][0].toString(), proof.pB[0][1].toString()],
        [proof.pB[1][0].toString(), proof.pB[1][1].toString()],
      ],
      pC: [proof.pC[0].toString(), proof.pC[1].toString()],
      pubSignals: proof.pubSignals.map((s) => s.toString()),
    };

    const tx = await this.factory.withdraw(formattedProof, amount, mode);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Withdraw via a relayer (EVM Factory: withdrawRelayed)
   */
  async withdrawRelayed(
    proof: WithdrawalProof,
    amount: bigint,
    mode: AssetMode
  ): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const formattedProof = {
      pA: [proof.pA[0].toString(), proof.pA[1].toString()],
      pB: [
        [proof.pB[0][0].toString(), proof.pB[0][1].toString()],
        [proof.pB[1][0].toString(), proof.pB[1][1].toString()],
      ],
      pC: [proof.pC[0].toString(), proof.pC[1].toString()],
      pubSignals: proof.pubSignals.map((s) => s.toString()),
    };

    const tx = await this.factory.withdrawRelayed(formattedProof, amount, mode);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Stake ETH
   */
  async stakeEther(amount: bigint): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.stake(AssetMode.ETH, amount, { value: amount });
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Stake tokens
   */
  async stakeToken(amount: bigint): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const factoryAddress = await this.factory.getAddress();
    const allowance = await this.token.allowance(
      await this.signer.getAddress(),
      factoryAddress
    );
    if (allowance < amount) {
      const approveTx = await this.token.approve(factoryAddress, amount);
      await approveTx.wait();
    }

    const tx = await this.factory.stake(AssetMode.TOKEN, amount);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Claim ETH rewards
   */
  async claimEth(seasonId: bigint): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.claim(AssetMode.ETH, seasonId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Claim token rewards
   */
  async claimToken(seasonId: bigint): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.claim(AssetMode.TOKEN, seasonId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Unstake ETH
   */
  async unstakeEth(): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.unstake(AssetMode.ETH);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Unstake tokens
   */
  async unstakeToken(): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.unstake(AssetMode.TOKEN);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Get current stake season
   */
  async getCurrentStakeSeason(): Promise<bigint> {
    return await this.factory.getCurrentStakeSeason();
  }

  /**
   * Get staking contract address
   */
  async getStakingAddress(): Promise<string> {
    return await this.factory.staking();
  }

  /**
   * Start a new stake season
   */
  async startStakeSeason(): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.startStakeSeason();
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Get stake season information
   */
  async getStakeSeason(seasonId: bigint): Promise<EVMStakeSeason> {
    try {
      const stakingAddress = await this.getStakingAddress();
      const staking = new Contract(
        stakingAddress,
        AintiVirusEVM.STAKING_ABI,
        this.provider
      );

      // New staking contract is mode-scoped; fetch both modes and merge into the legacy shape.
      const [ethSeason, tokenSeason] = await Promise.all([
        staking.seasons(seasonId, AssetMode.ETH),
        staking.seasons(seasonId, AssetMode.TOKEN),
      ]);
      return {
        seasonId: BigInt(ethSeason.seasonId.toString()),
        startTimestamp: BigInt(ethSeason.start.toString()),
        endTimestamp: BigInt(ethSeason.end.toString()),
        totalStakedEthAmount: BigInt(ethSeason.totalStaked.toString()),
        totalStakedTokenAmount: BigInt(tokenSeason.totalStaked.toString()),
        totalRewardEthAmount: BigInt(ethSeason.totalReward.toString()),
        totalRewardTokenAmount: BigInt(tokenSeason.totalReward.toString()),
        totalEthWeightValue: BigInt(ethSeason.totalWeight.toString()),
        totalTokenWeightValue: BigInt(tokenSeason.totalWeight.toString()),
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Stake season ${seasonId} not found. Original error: ${errorMsg}`
      );
    }
  }

  /**
   * Get staker record
   */
  async getStakerRecord(address: string): Promise<EVMStakerRecord> {
    const stakingAddress = await this.getStakingAddress();
    const staking = new Contract(
      stakingAddress,
      AintiVirusEVM.STAKING_ABI,
      this.provider
    );

    const [ethRecord, tokenRecord] = await Promise.all([
      staking.records(address, AssetMode.ETH),
      staking.records(address, AssetMode.TOKEN),
    ]);
    return {
      ethStakedSeasonId: BigInt(ethRecord.seasonId.toString()),
      tokenStakedSeasonId: BigInt(tokenRecord.seasonId.toString()),
      ethStakedTimestamp: BigInt(ethRecord.stakedAt.toString()),
      tokenStakedTimestamp: BigInt(tokenRecord.stakedAt.toString()),
      stakedEthAmount: BigInt(ethRecord.staked.toString()),
      stakedTokenAmount: BigInt(tokenRecord.staked.toString()),
      ethWeightValue: BigInt(ethRecord.weight.toString()),
      tokenWeightValue: BigInt(tokenRecord.weight.toString()),
    };
  }

  /**
   * Check if user has claimed rewards for a season
   */
  async hasClaimedEth(address: string, seasonId: bigint): Promise<boolean> {
    const stakingAddress = await this.getStakingAddress();
    const staking = new Contract(
      stakingAddress,
      AintiVirusEVM.STAKING_ABI,
      this.provider
    );
    return await staking.wasSeasonClaimed(address, seasonId, AssetMode.ETH);
  }

  /**
   * Check if user has claimed token rewards for a season
   */
  async hasClaimedToken(address: string, seasonId: bigint): Promise<boolean> {
    const stakingAddress = await this.getStakingAddress();
    const staking = new Contract(
      stakingAddress,
      AintiVirusEVM.STAKING_ABI,
      this.provider
    );
    return await staking.wasSeasonClaimed(address, seasonId, AssetMode.TOKEN);
  }

  /**
   * Get token balance of an address
   */
  async getTokenBalance(address: string): Promise<bigint> {
    return await this.token.balanceOf(address);
  }

  /**
   * Get ETH balance of an address
   */
  async getEthBalance(address: string): Promise<bigint> {
    return await this.provider.getBalance(address);
  }

  /**
   * Deploy a new mixer instance
   */
  async deployMixer(
    mode: AssetMode,
    amount: bigint
  ): Promise<TransactionResult & { mixerAddress: string }> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.deployMixer(mode, amount);
    const receipt = await tx.wait();

    // Extract mixer address from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.factory.interface.parseLog(log);
        return parsed?.name === "MixerDeployed";
      } catch {
        return false;
      }
    });

    let mixerAddress = "";
    if (event) {
      const parsed = this.factory.interface.parseLog(event);
      mixerAddress = parsed?.args.mixer;
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
      mixerAddress,
    };
  }
}

// The Graph (EVM-only) helpers
export * from "./subgraph";
