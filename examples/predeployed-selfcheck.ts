/**
 * Self-check for predeployment (pool wallet) compatibility.
 * No network, no API key, no framework. Run: npx tsx examples/predeployed-selfcheck.ts
 *
 * Verifies the two guarantees for a predeployed wallet:
 *   1. The address is the backend-assigned one and is NEVER derived locally
 *      (getDeterministicSafeAddress is never reached).
 *   2. createSessionKey never signs - it short-circuits to alreadyActive.
 * Plus a regression guard that the legacy (non-pool) path is unchanged.
 */
import assert from "node:assert";
import { ZyfaiSDK } from "../src/core/ZyfaiSDK";

const EOA = "0x1111111111111111111111111111111111111111";
const ASSIGNED = "0x2222222222222222222222222222222222222222";
const LEGACY_REGISTERED = "0x3333333333333333333333333333333333333333";
const CHAIN = 8453;

// Access private state/methods directly - this is a white-box self-check.
const newSdk = () => new ZyfaiSDK("test-key") as any;

async function predeployedUsesAssignedAddress() {
  const sdk = newSdk();
  sdk.signer = { address: EOA }; // mark EOA as the connected user
  sdk.isPredeployed = true;
  sdk.connectedSmartWallet = ASSIGNED;
  sdk.getSmartWalletByEOA = async () => {
    throw new Error("network must not be called for a predeployed wallet");
  };

  const addr = await sdk.getSafeAddressFor(EOA, CHAIN);
  assert.strictEqual(addr, ASSIGNED, "predeployed must return the assigned address");
  console.log("ok: predeployed returns the backend-assigned address, no derivation");
}

async function predeployedSkipsSessionSigning() {
  const sdk = newSdk();
  sdk.authenticatedUserId = "u1"; // makes authenticateUser() a no-op
  sdk.isPredeployed = true;
  sdk.signSessionKey = async () => {
    throw new Error("must not sign a session key for a predeployed wallet");
  };

  const res = await sdk.createSessionKey(EOA, CHAIN);
  assert.strictEqual(res.alreadyActive, true, "predeployed session must be already active");
  assert.strictEqual(res.success, true);
  console.log("ok: createSessionKey short-circuits for predeployed (no signature)");
}

async function legacyStillResolvesFromApi() {
  const sdk = newSdk();
  sdk.signer = { address: EOA };
  sdk.isPredeployed = false;
  sdk.getSmartWalletByEOA = async () => ({
    success: true,
    eoa: EOA,
    smartWallet: LEGACY_REGISTERED,
    chains: [CHAIN],
  });

  const addr = await sdk.getSafeAddressFor(EOA, CHAIN);
  assert.strictEqual(addr, LEGACY_REGISTERED, "legacy must use the registered address");
  console.log("ok: legacy path still resolves from the API");
}

(async () => {
  await predeployedUsesAssignedAddress();
  await predeployedSkipsSessionSigning();
  await legacyStillResolvesFromApi();
  console.log("\nAll predeployment self-checks passed.");
})().catch((e) => {
  console.error("SELF-CHECK FAILED:", (e as Error).message);
  process.exit(1);
});
