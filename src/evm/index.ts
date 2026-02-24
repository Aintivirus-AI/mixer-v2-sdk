import {
  Contract,
  Signer,
  Provider,
  type InterfaceAbi,
  keccak256,
  toUtf8Bytes,
} from "ethers";
import {
  AssetMode,
  WithdrawalProof,
  TransactionResult,
  EVMStakeSeason,
  EVMStakerRecord,
} from "../types";
import { SignerRequiredError, TransactionError } from "../errors";
import { bigIntToBytes32 } from "../utils/crypto";
import {
  multicall as multicallAggregate,
  MULTICALL3_ADDRESS,
} from "./multicall";

import factoryAbi from "./abis/AintiVirusFactory.json";
import stakingAbi from "./abis/AintiVirusStaking.json";
import paymentAbi from "./abis/AintiVirusPayment.json";
import wethGatewayAbi from "./abis/WETHGateway.json";

type AbiArtifact = { abi: unknown };
const FACTORY_ABI = (factoryAbi as AbiArtifact).abi as InterfaceAbi;
const STAKING_ABI = (stakingAbi as AbiArtifact).abi as InterfaceAbi;
const PAYMENT_ABI = (paymentAbi as AbiArtifact).abi as InterfaceAbi;
const WETH_GATEWAY_ABI = (wethGatewayAbi as AbiArtifact).abi as InterfaceAbi;

/** Minimal ERC20 ABI for allowance/approve/balanceOf/decimals (not in contract artifacts). */
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

/** Normalize contract return value to bigint (handles ethers Result / { data } from viem-backed provider). */
function toBigint(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (
    value != null &&
    typeof value === "object" &&
    "data" in value &&
    typeof (value as { data: unknown }).data === "string"
  ) {
    return BigInt((value as { data: string }).data);
  }
  throw new Error(`Expected bigint-like value, got: ${typeof value}`);
}

/**
 * Normalize orderId to bytes32 (0x + 64 hex chars).
 * If already 0x + 64 hex, returns as-is; otherwise hashes with keccak256.
 */
function normalizeOrderIdToBytes32(orderId: string): string {
  const trimmed = orderId.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return trimmed.toLowerCase();
  return keccak256(toUtf8Bytes(trimmed));
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
  private wethGateway: Contract | null = null;
  private wethAddress: string | null = null;
  private readonly useMulticall: boolean;
  private readonly multicallAddress: string;

  constructor(
    factoryAddress: string,
    tokenAddress: string,
    signerOrProvider: Signer | Provider,
    wethGatewayAddress?: string | null,
    wethAddress?: string | null,
    useMulticall?: boolean,
    multicallAddress?: string | null,
  ) {
    this.useMulticall = useMulticall ?? false;
    this.multicallAddress = multicallAddress ?? MULTICALL3_ADDRESS;
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
      FACTORY_ABI,
      signerOrProvider,
    );
    this.token = new Contract(
      tokenAddress,
      ERC20_ABI,
      signerOrProvider,
    );

    if (wethGatewayAddress) {
      this.wethGateway = new Contract(
        wethGatewayAddress,
        WETH_GATEWAY_ABI,
        signerOrProvider,
      );
    }
    if (wethAddress) {
      this.wethAddress = wethAddress;
    }
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
   * Get WETH address (config or from factory.weth()).
   */
  async getWethAddress(): Promise<string | null> {
    if (this.wethAddress) {
      return this.wethAddress;
    }
    try {
      const w = await this.factory.weth();
      const out = w && typeof w === "string" ? w : (w?.toString?.() ?? null);
      return out;
    } catch {
      return null;
    }
  }

  /**
   * Check if an address is the WETH asset (for "ETH" pools).
   * Treats both the actual WETH contract and the canonical ETH placeholder (ETH_ADDRESS) as WETH.
   */
  async isWethAsset(assetAddress: string): Promise<boolean> {
    const weth = await this.getWethAddress();
    if (!weth) return false;
    const a = assetAddress.toLowerCase();
    const w = weth.toLowerCase();
    return a === w || a === ETH_ADDRESS.toLowerCase();
  }

  /**
   * Get the provider instance
   */
  getProvider(): Provider {
    return this.provider;
  }

  /**
   * Calculate total deposit amount including protocol fee and partner fee.
   * @param amount Base deposit amount
   * @param partnerAddress Partner address for extra fee; use zero address for no partner
   */
  async calculateDepositAmount(
    amount: bigint,
    partnerAddress: string = "0x0000000000000000000000000000000000000000",
  ): Promise<bigint> {
    const result = await this.factory.calculateDepositAmount(
      amount,
      partnerAddress,
    );
    return toBigint(result);
  }

  /**
   * Get fee rate in basis points (contract: feeBps)
   */
  async getFeeRate(): Promise<bigint> {
    return toBigint(await this.factory.feeBps());
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
          ? (this.wethAddress ?? (this.token.target as string))
          : (this.token.target as string)
        : assetOrMode.toLowerCase().startsWith("0x")
          ? assetOrMode
          : assetOrMode;
    return await this.factory.mixers(asset, amount);
  }

  /** Max calls per multicall batch to avoid RPC/network limits across different EVM chains. */
  private static readonly MULTICALL_BATCH_SIZE = 100;

  /**
   * Get mixer addresses for multiple (asset, amount) pairs in one or few RPCs when useMulticall is enabled.
   * Chunks requests by MULTICALL_BATCH_SIZE for networks with strict RPC limits. Uses chain-specific multicall address.
   * Falls back to Promise.all of getMixer when useMulticall is false or multicall fails.
   */
  async getMixersBatch(
    entries: Array<{ asset: string; amount: bigint }>,
  ): Promise<string[]> {
    if (entries.length === 0) return [];

    const normalizeAsset = (a: string) =>
      a.toLowerCase().startsWith("0x") ? a : a;

    if (this.useMulticall) {
      try {
        const factoryAddress = await this.factory.getAddress();
        const iface = this.factory.interface;
        const zero = "0x0000000000000000000000000000000000000000";
        const batchSize = AintiVirusEVM.MULTICALL_BATCH_SIZE;
        const results: string[] = [];

        for (let i = 0; i < entries.length; i += batchSize) {
          const chunk = entries.slice(i, i + batchSize);
          const calls = chunk.map(({ asset, amount }) => ({
            target: factoryAddress,
            callData: iface.encodeFunctionData("mixers", [
              normalizeAsset(asset),
              amount,
            ]),
          }));
          const chunkResults = await multicallAggregate(
            this.provider,
            calls,
            this.multicallAddress,
          );
          for (const r of chunkResults) {
            if (!r.success) {
              results.push(zero);
              continue;
            }
            try {
              const decoded = iface.decodeFunctionResult("mixers", r.returnData);
              const addr = decoded?.[0] ?? decoded;
              results.push(
                typeof addr === "string" ? addr : String(addr),
              );
            } catch {
              results.push(zero);
            }
          }
        }
        return results;
      } catch {
        // Fallback to single calls
      }
    }

    return Promise.all(
      entries.map((e) => this.getMixer(normalizeAsset(e.asset), e.amount)),
    );
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
   * Deposit into the mixer. For WETH pools with WETHGateway configured, uses native ETH.
   * Otherwise uses ERC20 (approve + Factory.deposit).
   * @param assetAddress ERC20 asset (WETH or token). When WETH + gateway, user pays native ETH.
   * @param amount Deposit amount
   * @param commitment Commitment hash
   * @param partnerAddress Partner for white-label extra fee; use zero address for none
   */
  async deposit(
    assetAddress: string,
    amount: bigint,
    commitment: bigint,
    partnerAddress: string = "0x0000000000000000000000000000000000000000",
  ): Promise<TransactionResult> {
    this.assertSigner();

    const totalAmount = await this.calculateDepositAmount(
      amount,
      partnerAddress,
    );

    const gateway = this.wethGateway;
    const isWeth = gateway && (await this.isWethAsset(assetAddress));
    if (isWeth && gateway) {
      // Use explicit overload: deposit(uint256,bytes32) or deposit(uint256,bytes32,address)
      const commitmentBytes32 = bigIntToBytes32(toBigint(commitment));
      const tx =
        partnerAddress === "0x0000000000000000000000000000000000000000"
          ? await gateway.getFunction("deposit(uint256,bytes32)")(
              amount,
              commitmentBytes32,
              { value: totalAmount },
            )
          : await gateway.getFunction(
              "deposit(uint256,bytes32,address)",
            )(amount, commitmentBytes32, partnerAddress, {
              value: totalAmount,
            });
      return this.sendAndWait(tx);
    }

    const factoryAddress = await this.factory.getAddress();
    const assetContract =
      assetAddress.toLowerCase() === (this.token.target as string).toLowerCase()
        ? this.token
        : new Contract(assetAddress, ERC20_ABI, this.signer);

    const allowanceRaw = await assetContract.allowance(
      await this.signer.getAddress(),
      factoryAddress,
    );
    const allowance = toBigint(allowanceRaw);
    if (allowance < totalAmount) {
      const approveTx = await assetContract.approve(
        factoryAddress,
        totalAmount,
      );
      const approveHash =
        typeof approveTx.hash === "string"
          ? approveTx.hash
          : (approveTx as { hash?: string }).hash;
      if (approveHash) await this.waitForTransactionReceipt(approveHash);
    }

    const tx = await this.factory.deposit(
      assetAddress,
      amount,
      bigIntToBytes32(toBigint(commitment)),
      partnerAddress,
    );
    return this.sendAndWait(tx);
  }

  /**
   * Deposit native ETH via WETHGateway. Requires wethAddress + wethGatewayAddress in config.
   * @deprecated Use deposit(wethAddress, amount, commitment) instead.
   */
  async depositEth(
    amount: bigint,
    commitment: bigint,
  ): Promise<TransactionResult> {
    if (!this.wethAddress) {
      throw new Error(
        "WETH address not configured; use deposit(wethAddress, amount, commitment)",
      );
    }
    return this.deposit(this.wethAddress, amount, commitment);
  }

  /**
   * @deprecated Use deposit(assetAddress, amount, commitment) instead.
   */
  async depositToken(
    amount: bigint,
    commitment: bigint,
  ): Promise<TransactionResult> {
    return this.deposit(this.token.target as string, amount, commitment);
  }

  /**
   * Withdraw from the mixer.
   * @param proof Withdrawal proof (fee must be proof.pubSignals[3] when using relayer).
   * @param fee Relayer fee; must equal proof.pubSignals[3] (use 0n for no relayer).
   * @param amount Withdrawal amount (pool fixed amount).
   * @param assetAddress Pool asset address.
   */
  async withdraw(
    proof: WithdrawalProof,
    fee: bigint,
    amount: bigint,
    assetAddress: string,
  ): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.getFunction(
      "withdraw(tuple(uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[5] pubSignals),uint256,uint256,address)",
    )(proof, fee, amount, assetAddress);
    return this.sendAndWait(tx);
  }

  /**
   * Withdraw via relayer (fee from proof).
   */
  async withdrawRelayed(
    proof: WithdrawalProof,
    amount: bigint,
    assetAddress: string,
  ): Promise<TransactionResult> {
    const fee = BigInt(proof.pubSignals[3]);
    return this.withdraw(proof, fee, amount, assetAddress);
  }

  /**
   * Stake native ETH via WETHGateway. Requires wethGatewayAddress in config.
   * Falls back to stakeToken (config token) if no gateway.
   */
  async stakeEther(amount: bigint): Promise<TransactionResult> {
    this.assertSigner();
    if (this.wethGateway) {
      const tx = await this.wethGateway.stake({ value: amount });
      return this.sendAndWait(tx);
    }
    return this.stakeToken(amount);
  }

  /**
   * Stake tokens
   */
  async stakeToken(amount: bigint): Promise<TransactionResult> {
    this.assertSigner();

    const factoryAddress = await this.factory.getAddress();
    const allowance = await this.token.allowance(
      await this.signer.getAddress(),
      factoryAddress,
    );
    if (allowance < amount) {
      const approveTx = await this.token.approve(factoryAddress, amount);
      const approveHash =
        typeof approveTx.hash === "string"
          ? approveTx.hash
          : (approveTx as { hash?: string }).hash;
      if (approveHash) await this.sendAndWait(approveTx);
    }

    const tx = await this.factory.stake(this.token.target as string, amount);
    return this.sendAndWait(tx);
  }

  /**
   * Claim ETH rewards (WETH asset)
   */
  async claimEth(seasonId: bigint): Promise<TransactionResult> {
    this.assertSigner();
    const weth = await this.getWethAddress();
    if (!weth)
      throw new Error("WETH address not available (config or factory.weth())");

    const tx = await this.factory.claim(weth, seasonId);
    return this.sendAndWait(tx);
  }

  /**
   * Claim token rewards
   */
  async claimToken(seasonId: bigint): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.claim(this.token.target as string, seasonId);
    return this.sendAndWait(tx);
  }

  /**
   * Unstake ETH (WETH asset)
   */
  async unstakeEth(): Promise<TransactionResult> {
    this.assertSigner();
    const weth = await this.getWethAddress();
    if (!weth)
      throw new Error("WETH address not available (config or factory.weth())");

    const tx = await this.factory.unstake(weth);
    return this.sendAndWait(tx);
  }

  /**
   * Unstake tokens
   */
  async unstakeToken(): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.unstake(this.token.target as string);
    return this.sendAndWait(tx);
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
    this.assertSigner();

    const tx = await this.factory.startNewSeason();
    return this.sendAndWait(tx);
  }

  /**
   * Set fee rate (admin only; requires OPERATOR_ROLE)
   * @param feeRate Fee rate in basis points (e.g., 250 for 0.25%)
   */
  async setFeeRate(feeRate: bigint): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.setFeeRate(feeRate);
    return this.sendAndWait(tx);
  }

  /**
   * Set staking season period for the next season (admin only; requires OPERATOR_ROLE)
   * @param duration Duration in seconds (e.g., 86400 for 1 day)
   */
  async updateNextSeasonDuration(duration: bigint): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.updateNextSeasonDuration(duration);
    return this.sendAndWait(tx);
  }

  /**
   * Set fee collector that receives the fee collector share of deposit fees (requires DEFAULT_ADMIN_ROLE)
   */
  async setFeeCollector(feeCollector: string): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.setFeeCollector(feeCollector);
    return this.sendAndWait(tx);
  }

  /**
   * Set share of deposit fees that go to the reward pool; rest goes to admin wallet (requires OPERATOR_ROLE)
   * @param bps Share in basis points (e.g., 5000 = 50%), max 10000
   */
  async setRewardPoolShareBps(bps: bigint): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.setRewardPoolShareBps(bps);
    return this.sendAndWait(tx);
  }

  /**
   * Add a partner and set their extra fee (requires OPERATOR_ROLE)
   */
  async addPartner(
    partner: string,
    extraFee: bigint,
  ): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.addPartner(partner, extraFee);
    return this.sendAndWait(tx);
  }

  /**
   * Update a registered partner's extra fee (requires OPERATOR_ROLE)
   */
  async setPartnerExtraFee(
    partner: string,
    extraFee: bigint,
  ): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.setPartnerExtraFee(partner, extraFee);
    return this.sendAndWait(tx);
  }

  /**
   * Allow a registered partner to set their own extra fee (caller must be a registered partner)
   */
  async setMyExtraFee(extraFee: bigint): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.setMyExtraFee(extraFee);
    return this.sendAndWait(tx);
  }

  /**
   * Remove a partner (requires OPERATOR_ROLE)
   */
  async removePartner(partner: string): Promise<TransactionResult> {
    this.assertSigner();

    const tx = await this.factory.removePartner(partner);
    return this.sendAndWait(tx);
  }

  /**
   * Get fee collector address
   */
  async getFeeCollector(): Promise<string> {
    return await this.factory.feeCollector();
  }

  /**
   * Get reward pool share in basis points (contract: rewardsShareBps)
   */
  async getRewardPoolShareBps(): Promise<bigint> {
    return toBigint(await this.factory.rewardsShareBps());
  }

  /**
   * Get payment contract address (for gift card withdrawals).
   */
  async getPaymentAddress(): Promise<string> {
    return await this.factory.payment();
  }

  /** Lazy-loaded payment contract (from factory.payment()). Returns null if not set. */
  private async getPaymentContract(): Promise<Contract | null> {
    const addr = await this.getPaymentAddress();
    if (!addr || addr === "0x0000000000000000000000000000000000000000")
      return null;
    return new Contract(addr, PAYMENT_ABI, this.signer ?? this.provider);
  }

  /**
   * Process payment with recipient (buyer) via the payment contract (ERC20).
   * Use for any allowed token including WETH (caller must hold WETH and approve the payment contract).
   * For native ETH, use payWithRecipientViaGateway instead.
   * @param orderId bytes32 (0x-prefixed 64-char hex)
   * @param token ERC20 token address (e.g. WETH or other allowed token)
   * @param buyer recipient/buyer address
   * @param amount token amount in token's smallest unit
   */
  async payWithRecipient(
    orderId: string,
    token: string,
    buyer: string,
    amount: bigint,
  ): Promise<TransactionResult> {
    this.assertSigner();
    const paymentAddr = await this.getPaymentAddress();
    if (!paymentAddr || paymentAddr === "0x0000000000000000000000000000000000000000") {
      throw new Error("Payment contract not set on factory");
    }
    const payment = await this.getPaymentContract();
    if (!payment) throw new Error("Payment contract not set on factory");
    const signerAddr = await (this.signer as { getAddress?: () => Promise<string> }).getAddress?.();
    const tokenContractWithSigner = new Contract(token, ERC20_ABI, this.signer);
    if (signerAddr) {
      const allowanceRaw = await tokenContractWithSigner.allowance(signerAddr, paymentAddr).catch(() => null);
      const allowance = allowanceRaw != null ? toBigint(allowanceRaw) : null;
      if (allowance != null && amount > allowance) {
        const approveTx = await tokenContractWithSigner.approve(paymentAddr, amount);
        await this.sendAndWait(approveTx);
      }
    }
    const tx = await payment.payWithRecipient(orderId, token, buyer, amount);
    return this.sendAndWait(tx);
  }

  /**
   * Pay with native ETH via WETHGateway (wrap ETH → approve payment → payWithRecipient with WETH).
   * Use this when the user pays in ETH; amount is in wei (msg.value).
   */
  async payWithRecipientViaGateway(
    orderId: string,
    buyer: string,
    amountWei: bigint,
  ): Promise<TransactionResult> {
    this.assertSigner();
    if (!this.wethGateway) throw new Error("WETH Gateway not configured for this chain");
    if (amountWei <= 0n) throw new Error("Amount must be positive");
    const wethAddr = await this.getWethAddress();
    if (!wethAddr) throw new Error("WETH address not configured for gateway payment");
    const tx = await this.wethGateway.payWithRecipient(orderId, wethAddr, buyer, {
      value: amountWei,
    });
    return this.sendAndWait(tx);
  }

  /**
   * Get a single payment record by order ID. Returns zeroed record if not found.
   */
  async getPayment(orderId: string): Promise<{
    orderId: string;
    buyer: string;
    token: string;
    amount: bigint;
    paidAt: bigint;
  }> {
    const payment = await this.getPaymentContract();
    if (!payment) {
      return {
        orderId: "0x" + "0".repeat(64),
        buyer: "0x0000000000000000000000000000000000000000",
        token: "0x0000000000000000000000000000000000000000",
        amount: 0n,
        paidAt: 0n,
      };
    }
    const r = await payment.getPayment(orderId);
    return {
      orderId: typeof r.orderId === "string" ? r.orderId : "0x" + BigInt(r.orderId).toString(16).padStart(64, "0"),
      buyer: typeof r.buyer === "string" ? r.buyer : String(r.buyer),
      token: typeof r.token === "string" ? r.token : String(r.token),
      amount: toBigint(r.amount),
      paidAt: toBigint(r.paidAt),
    };
  }

  /**
   * Get all payment records for a user (buyer).
   */
  async getPaymentDetailsOf(user: string): Promise<
    Array<{
      orderId: string;
      buyer: string;
      token: string;
      amount: bigint;
      paidAt: bigint;
    }>
  > {
    const payment = await this.getPaymentContract();
    if (!payment) return [];
    const records = await payment.paymentDetailsOf(user);
    return (records ?? []).map((r: any) => ({
      orderId: typeof r.orderId === "string" ? r.orderId : "0x" + BigInt(r.orderId).toString(16).padStart(64, "0"),
      buyer: typeof r.buyer === "string" ? r.buyer : String(r.buyer),
      token: typeof r.token === "string" ? r.token : String(r.token),
      amount: toBigint(r.amount),
      paidAt: toBigint(r.paidAt),
    }));
  }

  /**
   * Check if a token is allowed for payments.
   */
  async isAllowedToken(token: string): Promise<boolean> {
    const payment = await this.getPaymentContract();
    if (!payment) return false;
    return await payment.allowedTokens(token);
  }

  /**
   * Get payment contract treasury address.
   */
  async getPaymentTreasury(): Promise<string> {
    const payment = await this.getPaymentContract();
    if (!payment) return "0x0000000000000000000000000000000000000000";
    return await payment.treasury();
  }

  /**
   * Add or remove a token from the allowed list (DEFAULT_ADMIN_ROLE on payment contract).
   */
  async updateAllowedToken(token: string, allowed: boolean): Promise<TransactionResult> {
    this.assertSigner();
    const payment = await this.getPaymentContract();
    if (!payment) throw new Error("Payment contract not set on factory");
    const tx = await payment.updateAllowedToken(token, allowed);
    return this.sendAndWait(tx);
  }

  /**
   * Check if gift card withdrawals are enabled for a mixer (by mixer contract address).
   */
  async isGiftCardWithdrawEnabled(mixerAddress: string): Promise<boolean> {
    return await this.factory.giftCardWithdrawEnabled(mixerAddress);
  }

  /**
   * Check if gift card withdrawals are enabled for a pool (by asset + amount).
   * Returns false if the mixer does not exist.
   */
  async isGiftCardWithdrawEnabledForPool(
    asset: string,
    amount: bigint,
  ): Promise<boolean> {
    const mixerAddress = await this.getMixer(asset, amount);
    const zero = "0x0000000000000000000000000000000000000000";
    if (!mixerAddress || mixerAddress.toLowerCase() === zero) return false;
    return this.isGiftCardWithdrawEnabled(mixerAddress);
  }

  /**
   * Set payment contract (OPERATOR_ROLE).
   */
  async setPayment(paymentAddress: string): Promise<TransactionResult> {
    this.assertSigner();
    const tx = await this.factory.setPayment(paymentAddress);
    return this.sendAndWait(tx);
  }

  /**
   * Enable or disable gift card withdrawals for a mixer (OPERATOR_ROLE).
   */
  async setMixerGiftCardEnabled(
    asset: string,
    amount: bigint,
    enabled: boolean,
  ): Promise<TransactionResult> {
    this.assertSigner();
    const tx = await this.factory.setMixerGiftCardEnabled(
      asset,
      amount,
      enabled,
    );
    return this.sendAndWait(tx);
  }

  /**
   * Batch enable/disable gift card withdrawals (OPERATOR_ROLE).
   */
  async batchSetMixerGiftCardEnabled(
    assets: string[],
    amounts: bigint[],
    enabled: boolean,
  ): Promise<TransactionResult> {
    this.assertSigner();
    if (assets.length !== amounts.length)
      throw new Error("assets and amounts length mismatch");
    const tx = await this.factory.batchSetMixerGiftCardEnabled(
      assets,
      amounts,
      enabled,
    );
    return this.sendAndWait(tx);
  }

  /**
   * Withdraw by gift card: factory pays order via payment contract (recipient from proof).
   * @param orderId Order ID: use 0x-prefixed 64-char hex for bytes32, or any string (will be keccak256-hashed to bytes32).
   */
  async withdrawByGiftCard(
    proof: WithdrawalProof,
    orderId: string,
    amount: bigint,
    assetAddress: string,
  ): Promise<TransactionResult> {
    this.assertSigner();
    const bytes32OrderId = normalizeOrderIdToBytes32(orderId);
    const tx = await this.factory.getFunction(
      "withdrawByGiftCard(tuple(uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[5] pubSignals),bytes32,uint256,address)",
    )(proof, bytes32OrderId, amount, assetAddress);
    return this.sendAndWait(tx);
  }

  /**
   * Check if an address is a registered partner
   */
  async isPartner(partner: string): Promise<boolean> {
    return await this.factory.isPartner(partner);
  }

  /**
   * Get partner extra fee in basis points
   */
  async getPartnersFee(partner: string): Promise<bigint> {
    return toBigint(await this.factory.partnersFee(partner));
  }

  /** @deprecated Use isPartner */
  async isWhiteLabelPartner(partner: string): Promise<boolean> {
    return this.isPartner(partner);
  }

  /** @deprecated Use getPartnersFee */
  async getPartnerExtraFee(partner: string): Promise<bigint> {
    return this.getPartnersFee(partner);
  }

  /**
   * Get stake season information
   */
  async getStakeSeason(seasonId: bigint): Promise<EVMStakeSeason> {
    try {
      const stakingAddress = await this.getStakingAddress();
      const staking = new Contract(
        stakingAddress,
        STAKING_ABI,
        this.provider,
      );
      const weth = await this.getWethAddress();
      const ethAsset = weth ?? (this.token.target as string);

      const [ethTotals, tokenTotals] = await Promise.all([
        staking.seasonAndTotals(seasonId, ethAsset),
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
      STAKING_ABI,
      this.provider,
    );
    const weth = await this.getWethAddress();
    const ethAsset = weth ?? (this.token.target as string);

    const [ethRecord, tokenRecord] = await Promise.all([
      staking.records(address, ethAsset),
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
      STAKING_ABI,
      this.provider,
    );
    const weth = await this.getWethAddress();
    const ethAsset = weth ?? (this.token.target as string);
    return await staking.wasSeasonClaimed(address, seasonId, ethAsset);
  }

  /**
   * Check if user has claimed token rewards for a season
   */
  async hasClaimedToken(address: string, seasonId: bigint): Promise<boolean> {
    const stakingAddress = await this.getStakingAddress();
    const staking = new Contract(
      stakingAddress,
      STAKING_ABI,
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
    if (this.wethAddress && addr === this.wethAddress.toLowerCase()) return 18;
    const tokenContract = new Contract(
      addr,
      ERC20_ABI,
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
    this.assertSigner();
    const asset = assetAddress.toLowerCase().startsWith("0x")
      ? assetAddress
      : assetAddress;
    const tx = await this.factory.deployMixer(asset, amount);
    const txHash =
      typeof tx.hash === "string" ? tx.hash : (tx as { hash?: string }).hash;
    if (!txHash) throw new TransactionError("Transaction hash missing");
    const receipt = await this.waitForTransactionReceipt(txHash);
    const mixerAddress = this.parseMixerDeployedFromReceipt(receipt);
    const blockTime = (
      await this.provider.getBlock(receipt.blockNumber)
    )?.timestamp;
    return {
      txHash: receipt.hash ?? txHash,
      blockNumber: receipt.blockNumber,
      blockTime:
        typeof blockTime === "bigint" ? Number(blockTime) : blockTime,
      mixerAddress: mixerAddress ?? "",
    };
  }

  /** Throws SignerRequiredError if no signer (for write methods). */
  private assertSigner(): void {
    if (!this.signer) throw new SignerRequiredError();
  }

  /**
   * Send tx, wait for receipt, return normalized TransactionResult.
   * Throws TransactionError if hash missing or receipt timeout.
   */
  private async sendAndWait(tx: { hash?: string }): Promise<TransactionResult> {
    const txHash =
      typeof tx.hash === "string" ? tx.hash : (tx as { hash?: string }).hash;
    if (!txHash) {
      throw new TransactionError("Transaction hash missing");
    }
    try {
      const receipt = await this.waitForTransactionReceipt(txHash);
      const blockTime = (
        await this.provider.getBlock(receipt.blockNumber)
      )?.timestamp;
      return {
        txHash: receipt.hash ?? txHash,
        blockNumber: receipt.blockNumber,
        blockTime:
          typeof blockTime === "bigint" ? Number(blockTime) : blockTime,
      };
    } catch (err) {
      throw err instanceof TransactionError
        ? err
        : new TransactionError(
            err instanceof Error ? err.message : String(err),
            err
          );
    }
  }

  /**
   * Poll for transaction receipt with retries. Avoids TransactionReceiptNotFoundError
   * when the node hasn't seen the block yet (common with viem/wagmi adapter).
   */
  private async waitForTransactionReceipt(
    hash: string,
    maxWaitMs = 90_000,
    pollIntervalMs = 2_000,
  ): Promise<{
    hash: string;
    blockNumber: number;
    logs: Array<{ topics: string[]; data: string }>;
  }> {
    const start = Date.now();
    for (;;) {
      try {
        const receipt = await this.provider.getTransactionReceipt(hash);
        if (receipt != null) {
          const blockNumber =
            typeof receipt.blockNumber === "bigint"
              ? Number(receipt.blockNumber)
              : (receipt.blockNumber as number);
          const logs = (receipt.logs ?? []).map(
            (log: {
              topics?: readonly string[] | string[];
              data?: string;
            }) => ({
              topics: Array.isArray(log.topics) ? [...log.topics] : [],
              data: typeof log.data === "string" ? log.data : "0x",
            }),
          );
          return { hash, blockNumber, logs };
        }
      } catch {
        // Receipt not found yet (e.g. viem TransactionReceiptNotFoundError)
      }
      if (Date.now() - start >= maxWaitMs) {
        throw new TransactionError(
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
