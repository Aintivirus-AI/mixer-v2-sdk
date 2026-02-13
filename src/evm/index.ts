import { Contract, Signer, Provider } from "ethers";
import {
  AssetMode,
  WithdrawalProof,
  TransactionResult,
  EVMStakeSeason,
  EVMStakerRecord,
} from "../types";
import { bigIntToBytes32 } from "../utils/crypto";

/** Normalize contract return value to bigint (handles ethers Result / { data } from viem-backed provider). */
function toBigint(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (value != null && typeof value === "object" && "data" in value && typeof (value as { data: unknown }).data === "string") {
    return BigInt((value as { data: string }).data);
  }
  throw new Error(`Expected bigint-like value, got: ${typeof value}`);
}

/** Canonical address for native ETH in asset-based APIs (same as subgraph). */
export const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

/**
 * EVM SDK for AintiVirus Mixer
 */
export class AintiVirusEVM {
  private factory: Contract;
  private token: Contract;
  private signer: Signer;
  private provider: Provider;

  // Factory ABI – matches AintiVirusFactory.sol (asset-based: address _asset, uint256 _amount)
  private static readonly FACTORY_ABI = [
    "function deployMixer(address _asset, uint256 _amount) returns (address)",
    "function mixers(address _asset, uint256 _amount) view returns (address)",
    "function deposit(address _asset, uint256 _amount, bytes32 _commitment) payable",
    "function withdraw(tuple(uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[3] pubSignals) _proof, uint256 _fee, uint256 _amount, address _asset)",
    "function calculateDepositAmount(uint256 _amount) view returns (uint256)",
    "function feeRate() view returns (uint256)",
    "function staking() view returns (address)",
    "function stake(address _asset, uint256 amount) payable",
    "function claim(address _asset, uint256 seasonId) returns (uint256)",
    "function unstake(address _asset) returns (uint256)",
    "function updateNextSeasonDuration(uint256 _duration)",
    "function startNewSeason()",
    "function currentStakeSeasonId() view returns (uint256)",
    "function setFeeRate(uint256 _feeRate)",
    "event MixerDeployed(address indexed mixer, address indexed asset, uint256 indexed amount)",
    "event Deposit(address indexed asset, uint256 amount, uint256 fee, bytes32 indexed commitment)",
    "event Withdrawal(address indexed asset, uint256 amount, address to, bytes32 nullifierHash)",
    "event FeeRateUpdated(uint256 oldFeeRate, uint256 newFeeRate)",
  ];

  // ERC20 ABI
  private static readonly ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  // Staking ABI – matches IAintiVirusStaking (asset-based)
  private static readonly STAKING_ABI = [
    "function seasonAndTotals(uint256 seasonId_, address asset_) view returns (uint256 seasonId, uint256 start, uint256 end, uint256 duration, uint256 totalStaked, uint256 totalReward, uint256 totalWeight)",
    "function seasons(uint256 seasonId_) view returns (uint256 seasonId, uint256 start, uint256 end, uint256 duration)",
    "function records(address staker_, address asset_) view returns (uint64 seasonId, uint64 stakedAt, uint128 claimedCount, uint256 staked, uint256 weight)",
    "function wasSeasonClaimed(address staker, uint256 seasonId, address asset) view returns (bool)",
    "function nextSeasonDuration() view returns (uint256)",
    "function currentSeasonId() view returns (uint256)",
  ];

  constructor(
    factoryAddress: string,
    tokenAddress: string,
    signerOrProvider: Signer | Provider,
  ) {
    // Treat as Signer if it has a non-null provider (ethers v6 or viem adapter)
    const isSigner =
      signerOrProvider &&
      "provider" in signerOrProvider &&
      (signerOrProvider as { provider?: unknown }).provider != null;
    this.provider = isSigner
      ? (signerOrProvider as Signer).provider!
      : (signerOrProvider as Provider);
    this.signer = isSigner ? (signerOrProvider as Signer) : (null as any);

    this.factory = new Contract(
      factoryAddress,
      AintiVirusEVM.FACTORY_ABI,
      signerOrProvider,
    );
    this.token = new Contract(
      tokenAddress,
      AintiVirusEVM.ERC20_ABI,
      signerOrProvider,
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
    const result = await this.factory.calculateDepositAmount(amount);
    return toBigint(result);
  }

  /**
   * Get fee rate
   */
  async getFeeRate(): Promise<bigint> {
    return await this.factory.feeRate();
  }

  /**
   * Get mixer address (contract: mixers(asset, amount)).
   * @param assetOrMode - asset address (0x...) or AssetMode.ETH / AssetMode.TOKEN for backward compat
   */
  async getMixer(
    assetOrMode: string | AssetMode,
    amount: bigint,
  ): Promise<string> {
    const asset =
      typeof assetOrMode === "number"
        ? assetOrMode === AssetMode.ETH
          ? ETH_ADDRESS
          : (this.token.target as string)
        : assetOrMode.toLowerCase().startsWith("0x")
          ? assetOrMode
          : assetOrMode;
    return await this.factory.mixers(asset, amount);
  }

  /**
   * Check if mixer exists (asset address or AssetMode).
   */
  async mixerExists(
    assetOrMode: string | AssetMode,
    amount: bigint,
  ): Promise<boolean> {
    const addr = await this.getMixer(assetOrMode, amount);
    return addr !== "0x0000000000000000000000000000000000000000";
  }

  /**
   * Deposit ETH into the mixer
   */
  async depositEth(
    amount: bigint,
    commitment: bigint,
  ): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const totalAmountRaw = await this.calculateDepositAmount(amount);
    const totalAmount = toBigint(totalAmountRaw);
    const tx = await this.factory.deposit(
      ETH_ADDRESS,
      amount,
      bigIntToBytes32(toBigint(commitment)),
      { value: totalAmount },
    );
    const txHash = typeof tx.hash === "string" ? tx.hash : (tx as { hash?: string }).hash;
    if (!txHash) throw new Error("Transaction hash missing");
    const receipt = await this.waitForTransactionReceipt(txHash);

    return {
      txHash: receipt.hash ?? txHash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Deposit tokens into the mixer
   */
  async depositToken(
    amount: bigint,
    commitment: bigint,
  ): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const totalAmountRaw = await this.calculateDepositAmount(amount);
    const totalAmount = toBigint(totalAmountRaw);
    const factoryAddress = await this.factory.getAddress();

    // Check and approve if needed
    const allowanceRaw = await this.token.allowance(
      await this.signer.getAddress(),
      factoryAddress,
    );
    const allowance = toBigint(allowanceRaw);
    if (allowance < totalAmount) {
      const approveTx = await this.token.approve(factoryAddress, totalAmount);
      const approveHash = typeof approveTx.hash === "string" ? approveTx.hash : (approveTx as { hash?: string }).hash;
      if (approveHash) await this.waitForTransactionReceipt(approveHash);
    }

    const tx = await this.factory.deposit(
      this.token.target as string,
      amount,
      bigIntToBytes32(toBigint(commitment)),
    );
    const txHash = typeof tx.hash === "string" ? tx.hash : (tx as { hash?: string }).hash;
    if (!txHash) throw new Error("Transaction hash missing");
    const receipt = await this.waitForTransactionReceipt(txHash);

    return {
      txHash: receipt.hash ?? txHash,
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
    mode: AssetMode,
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

    const asset =
      mode === AssetMode.ETH ? ETH_ADDRESS : (this.token.target as string);
    const tx = await this.factory.withdraw(formattedProof, 0n, amount, asset);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  }

  /**
   * Withdraw via relayer (same as withdraw with fee 0).
   */
  async withdrawRelayed(
    proof: WithdrawalProof,
    amount: bigint,
    mode: AssetMode,
  ): Promise<TransactionResult> {
    return this.withdraw(proof, amount, mode);
  }

  /**
   * Stake ETH
   */
  async stakeEther(amount: bigint): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }

    const tx = await this.factory.stake(ETH_ADDRESS, amount, {
      value: amount,
    });
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
      factoryAddress,
    );
    if (allowance < amount) {
      const approveTx = await this.token.approve(factoryAddress, amount);
      await approveTx.wait();
    }

    const tx = await this.factory.stake(this.token.target as string, amount);
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

    const tx = await this.factory.claim(ETH_ADDRESS, seasonId);
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

    const tx = await this.factory.claim(this.token.target as string, seasonId);
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

    const tx = await this.factory.unstake(ETH_ADDRESS);
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

    const tx = await this.factory.unstake(this.token.target as string);
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
    return await this.factory.currentStakeSeasonId();
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

    const tx = await this.factory.startNewSeason();
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
        this.provider,
      );

      const [ethTotals, tokenTotals] = await Promise.all([
        staking.seasonAndTotals(seasonId, ETH_ADDRESS),
        staking.seasonAndTotals(seasonId, this.token.target as string),
      ]);
      return {
        seasonId: BigInt(ethTotals.seasonId.toString()),
        startTimestamp: BigInt(ethTotals.start.toString()),
        endTimestamp: BigInt(ethTotals.end.toString()),
        totalStakedEthAmount: BigInt(ethTotals.totalStaked.toString()),
        totalStakedTokenAmount: BigInt(tokenTotals.totalStaked.toString()),
        totalRewardEthAmount: BigInt(ethTotals.totalReward.toString()),
        totalRewardTokenAmount: BigInt(tokenTotals.totalReward.toString()),
        totalEthWeightValue: BigInt(ethTotals.totalWeight.toString()),
        totalTokenWeightValue: BigInt(tokenTotals.totalWeight.toString()),
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
  async getStakerRecord(address: string): Promise<EVMStakerRecord> {
    const stakingAddress = await this.getStakingAddress();
    const staking = new Contract(
      stakingAddress,
      AintiVirusEVM.STAKING_ABI,
      this.provider,
    );

    const [ethRecord, tokenRecord] = await Promise.all([
      staking.records(address, ETH_ADDRESS),
      staking.records(address, this.token.target as string),
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
      this.provider,
    );
    return await staking.wasSeasonClaimed(address, seasonId, ETH_ADDRESS);
  }

  /**
   * Check if user has claimed token rewards for a season
   */
  async hasClaimedToken(address: string, seasonId: bigint): Promise<boolean> {
    const stakingAddress = await this.getStakingAddress();
    const staking = new Contract(
      stakingAddress,
      AintiVirusEVM.STAKING_ABI,
      this.provider,
    );
    return await staking.wasSeasonClaimed(
      address,
      seasonId,
      this.token.target as string,
    );
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
   * Get the decimals for an asset (for converting human amount to raw amount).
   * - ETH (ETH_ADDRESS): always 18.
   * - ERC20: read from the token contract's decimals().
   * Use with parseUnits(amount, decimals) so deploy/deposit amounts are in the token's smallest unit.
   */
  async getAssetDecimals(assetAddress: string): Promise<number> {
    const addr = assetAddress.toLowerCase().startsWith("0x")
      ? assetAddress.toLowerCase()
      : assetAddress;
    if (addr === ETH_ADDRESS.toLowerCase()) return 18;
    const tokenContract = new Contract(
      addr,
      AintiVirusEVM.ERC20_ABI,
      this.provider,
    );
    const decimals = await tokenContract.decimals();
    return typeof decimals === "bigint" ? Number(decimals) : decimals;
  }

  /**
   * Deploy a new mixer (contract: deployMixer(address _asset, uint256 _amount)).
   * @param assetAddress - ETH_ADDRESS for native ETH, or any ERC20 token address
   */
  async deployMixer(
    assetAddress: string,
    amount: bigint,
  ): Promise<TransactionResult & { mixerAddress: string }> {
    if (!this.signer) {
      throw new Error("Signer required for transactions");
    }
    const asset = assetAddress.toLowerCase().startsWith("0x")
      ? assetAddress
      : assetAddress;
    const tx = await this.factory.deployMixer(asset, amount);
    const txHash = typeof tx.hash === "string" ? tx.hash : (tx as { hash?: string }).hash;
    if (!txHash) throw new Error("Transaction hash missing");
    const receipt = await this.waitForTransactionReceipt(txHash);
    const mixerAddress = this.parseMixerDeployedFromReceipt(receipt);
    return {
      txHash: receipt.hash ?? txHash,
      blockNumber: receipt.blockNumber,
      blockTime: (await this.provider.getBlock(receipt.blockNumber))?.timestamp,
      mixerAddress: mixerAddress ?? "",
    };
  }

  /**
   * Poll for transaction receipt with retries. Avoids TransactionReceiptNotFoundError
   * when the node hasn't seen the block yet (common with viem/wagmi adapter).
   */
  private async waitForTransactionReceipt(
    hash: string,
    maxWaitMs = 90_000,
    pollIntervalMs = 2_000,
  ): Promise<{ hash: string; blockNumber: number; logs: Array<{ topics: string[]; data: string }> }> {
    const start = Date.now();
    for (;;) {
      try {
        const receipt = await this.provider.getTransactionReceipt(hash);
        if (receipt != null) {
          const blockNumber =
            typeof receipt.blockNumber === "bigint"
              ? Number(receipt.blockNumber)
              : (receipt.blockNumber as number);
          const logs = (receipt.logs ?? []).map((log: { topics?: readonly string[] | string[]; data?: string }) => ({
            topics: Array.isArray(log.topics) ? [...log.topics] : [],
            data: typeof log.data === "string" ? log.data : "0x",
          }));
          return { hash, blockNumber, logs };
        }
      } catch {
        // Receipt not found yet (e.g. viem TransactionReceiptNotFoundError)
      }
      if (Date.now() - start >= maxWaitMs) {
        throw new Error(
          `Transaction receipt for ${hash} not found after ${maxWaitMs}ms. The transaction may still succeed; check the block explorer.`,
        );
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  /**
   * Parse MixerDeployed event from receipt (ethers v6 compatible).
   * Supports both (mixer, mode, amount) and (mixer, asset, amount) event shapes.
   */
  private parseMixerDeployedFromReceipt(receipt: {
    logs: Array<{ topics: string[]; data: string }>;
  }): string | null {
    const iface = this.factory.interface;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "MixerDeployed") {
          const args = parsed.args as unknown as {
            mixer?: string;
            [k: string]: unknown;
          };
          return typeof args.mixer === "string"
            ? args.mixer
            : (args[0] as string);
        }
      } catch {
        // not this contract's event or wrong shape
      }
    }
    return null;
  }
}

// The Graph (EVM-only) helpers
export * from "./subgraph";
