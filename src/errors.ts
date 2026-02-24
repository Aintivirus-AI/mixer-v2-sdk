/**
 * Structured SDK errors for predictable handling (e.g. instanceof or code checks).
 */

export const ERROR_CODES = {
  SIGNER_REQUIRED: "SIGNER_REQUIRED",
  TRANSACTION: "TRANSACTION",
  SUBGRAPH: "SUBGRAPH",
  PROOF: "PROOF",
  MULTICALL: "MULTICALL",
} as const;

/**
 * Base error for all SDK errors. Has optional code and cause for programmatic handling.
 */
export class MixerSDKError extends Error {
  readonly code?: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    options?: { code?: string; cause?: unknown }
  ) {
    super(message);
    this.name = "MixerSDKError";
    this.code = options?.code;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, MixerSDKError.prototype);
  }
}

/** Thrown when a write operation is attempted without a signer (wallet). */
export class SignerRequiredError extends MixerSDKError {
  constructor(message = "Signer required for transactions") {
    super(message, { code: ERROR_CODES.SIGNER_REQUIRED });
    this.name = "SignerRequiredError";
    Object.setPrototypeOf(this, SignerRequiredError.prototype);
  }
}

/** Thrown when a transaction fails (missing hash, receipt timeout, revert). */
export class TransactionError extends MixerSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: ERROR_CODES.TRANSACTION, cause });
    this.name = "TransactionError";
    Object.setPrototypeOf(this, TransactionError.prototype);
  }
}

/** Thrown when subgraph request fails (HTTP or GraphQL errors). */
export class SubgraphError extends MixerSDKError {
  readonly status?: number;

  constructor(
    message: string,
    options?: { code?: string; cause?: unknown; status?: number }
  ) {
    super(message, { code: options?.code ?? ERROR_CODES.SUBGRAPH, cause: options?.cause });
    this.name = "SubgraphError";
    this.status = options?.status;
    Object.setPrototypeOf(this, SubgraphError.prototype);
  }
}

/** Thrown when proof generation or circuit fetch fails. */
export class ProofError extends MixerSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: ERROR_CODES.PROOF, cause });
    this.name = "ProofError";
    Object.setPrototypeOf(this, ProofError.prototype);
  }
}

/** Thrown when multicall aggregate or decode fails. */
export class MulticallError extends MixerSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: ERROR_CODES.MULTICALL, cause });
    this.name = "MulticallError";
    Object.setPrototypeOf(this, MulticallError.prototype);
  }
}
