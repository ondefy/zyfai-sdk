import {
  encodeFunctionData,
  encodePacked,
  pad,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import {
  MERKL_DISTRIBUTOR_ABI,
  MERKL_DISTRIBUTOR_ADDRESS,
  RZFI_TOKEN_ADDRESS,
  SAFE_ABI,
} from "../config/abis";

const MERKL_API_URL = "https://api.merkl.xyz/v4";

export interface MerklRzfiReward {
  /** Cumulative rZFI ever earned (wei); the distributor pays amount minus claimed. */
  amount: bigint;
  root: Hex;
  proofs: Hex[];
}

/** The Safe's cumulative rZFI reward on Base from the Merkl API, or null when it has none. */
export async function fetchMerklRzfiReward(
  safe: Address,
): Promise<MerklRzfiReward | null> {
  const response = await fetch(
    `${MERKL_API_URL}/users/${safe}/rewards?chainId=8453`,
  );
  if (!response.ok) {
    throw new Error(`Merkl API error: ${response.status}`);
  }
  const body = (await response.json()) as Array<{
    rewards?: Array<{
      amount: string;
      root: Hex;
      proofs: Hex[];
      token: { address: string };
    }>;
  }>;
  const reward = body[0]?.rewards?.find(
    (r) => r.token.address.toLowerCase() === RZFI_TOKEN_ADDRESS.toLowerCase(),
  );
  return reward
    ? { amount: BigInt(reward.amount), root: reward.root, proofs: reward.proofs }
    : null;
}

/**
 * Safe `execTransaction` calldata that claims the Safe's rZFI. The signature is
 * Safe's "approved by the sender" form (r = owner, v = 1), so the transaction
 * only succeeds when `owner` itself sends it.
 */
export function encodeRzfiClaimExecTransaction(params: {
  safe: Address;
  owner: Address;
  amount: bigint;
  proofs: Hex[];
}): Hex {
  const { safe, owner, amount, proofs } = params;
  const claimData = encodeFunctionData({
    abi: MERKL_DISTRIBUTOR_ABI,
    functionName: "claim",
    args: [[safe], [RZFI_TOKEN_ADDRESS], [amount], [proofs]],
  });
  const signature = encodePacked(
    ["bytes32", "bytes32", "uint8"],
    [pad(owner), pad("0x00"), 1],
  );
  return encodeFunctionData({
    abi: SAFE_ABI,
    functionName: "execTransaction",
    args: [
      MERKL_DISTRIBUTOR_ADDRESS,
      0n,
      claimData,
      0,
      0n,
      0n,
      0n,
      zeroAddress,
      zeroAddress,
      signature,
    ],
  });
}
