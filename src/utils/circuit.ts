/**
 * SDK config file. Set circuit URLs here (or mutate at runtime).
 * Proof generation imports from this file directly.
 *
 * Values may be:
 * - HTTPS URLs (fetched at proof generation time)
 * - base64-encoded WASM/zkey strings
 */

export const config = {
  /** Withdrawal circuit WASM: URL or base64. */
  circuitWasm:
    "https://pink-academic-gamefowl-968.mypinata.cloud/ipfs/bafybeifpgekrvxkgkbmujprycyilsewxenmeatn5db5kugejycvvslra64",
  /** Withdrawal circuit zkey: URL or base64. */
  circuitZkey:
    "https://pink-academic-gamefowl-968.mypinata.cloud/ipfs/bafybeiga7tetzh7oiwrkeje2vlgqfvme6clvkfzdlgnoknfa5ujswzdmyi",
};
