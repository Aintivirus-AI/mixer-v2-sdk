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
    "function deployMixer(uint256 _mode, uint256 _amount) returns (address)",
    "function getMixer(uint256 _mode, uint256 _amount) view returns (address)",
    "function calculateDepositAmount(uint256 _amount) view returns (uint256)",
    "function feeRate() view returns (uint256)",
    "function staking() view returns (address)",
    "function mixToken() view returns (address)",
    "function stakeEther(uint256 amount) payable",
    "function stakeToken(uint256 amount)",
    "function claimEth(uint256 seasonId)",
    "function claimToken(uint256 seasonId)",
    "function unstakeEth()",
    "function unstakeToken()",
    "function getCurrentStakeSeason() view returns (uint256)",
    "function setFeeRate(uint256 _feeRate)",
    "function setStakingSeasonPeriod(uint256 _period)",
    "function startStakeSeason()",
    "function setVerifier(address _verifier)",
    "event MixerDeployed(address indexed mixer, uint256 indexed mode, uint256 indexed amount)",
    "event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)",
    "event Withdrawal(address to, bytes32 nullifierHash)",
    "event FeeRateUpdated(uint256 oldFeeRate, uint256 newFeeRate)",
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
    "function stakeSeasons(uint256) view returns (uint256 seasonId, uint256 startTimestamp, uint256 endTimestamp, uint256 totalStakedEthAmount, uint256 totalStakedTokenAmount, uint256 totalRewardEthAmount, uint256 totalRewardTokenAmount, uint256 totalEthWeightValue, uint256 totalTokenWeightValue)",
    "function stakeRecords(address) view returns (uint256 ethStakedSeasonId, uint256 tokenStakedSeasonId, uint256 ethStakedTimestamp, uint256 tokenStakedTimestamp, uint256 stakedEthAmount, uint256 stakedTokenAmount, uint256 ethWeightValue, uint256 tokenWeightValue)",
    "function addressToSeasonClaimedEth(address, uint256) view returns (bool)",
    "function addressToSeasonClaimedToken(address, uint256) view returns (bool)",
    "function stakingSeasonPeriod() view returns (uint256)",
    "function currentStakeSeason() view returns (uint256)",
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
   * Stake ETH
   */
  async stakeEther(amount: bigint): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.stakeEther(amount, { value: amount });
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

    const tx = await this.factory.stakeToken(amount);
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

    const tx = await this.factory.claimEth(seasonId);
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

    const tx = await this.factory.claimToken(seasonId);
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

    const tx = await this.factory.unstakeEth();
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

    const tx = await this.factory.unstakeToken();
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

      const season = await staking.stakeSeasons(seasonId);
      return {
        seasonId: season.seasonId,
        startTimestamp: season.startTimestamp,
        endTimestamp: season.endTimestamp,
        totalStakedEthAmount: season.totalStakedEthAmount,
        totalStakedTokenAmount: season.totalStakedTokenAmount,
        totalRewardEthAmount: season.totalRewardEthAmount,
        totalRewardTokenAmount: season.totalRewardTokenAmount,
        totalEthWeightValue: season.totalEthWeightValue,
        totalTokenWeightValue: season.totalTokenWeightValue,
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

    const record = await staking.stakeRecords(address);
    return {
      ethStakedSeasonId: record.ethStakedSeasonId,
      tokenStakedSeasonId: record.tokenStakedSeasonId,
      ethStakedTimestamp: record.ethStakedTimestamp,
      tokenStakedTimestamp: record.tokenStakedTimestamp,
      stakedEthAmount: record.stakedEthAmount,
      stakedTokenAmount: record.stakedTokenAmount,
      ethWeightValue: record.ethWeightValue,
      tokenWeightValue: record.tokenWeightValue,
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
    return await staking.addressToSeasonClaimedEth(address, seasonId);
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
    return await staking.addressToSeasonClaimedToken(address, seasonId);
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
