/**
 * Buffer polyfill for browser. Must load before any SDK or Solana code.
 * SDK hooks pull in solana/index.js which uses Buffer; some deps expect global Buffer.
 */
import { Buffer } from "buffer";
if (
  typeof (globalThis as unknown as { Buffer?: unknown }).Buffer === "undefined"
) {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}
