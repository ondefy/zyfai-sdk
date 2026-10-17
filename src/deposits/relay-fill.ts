const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type RelayTxHashRef = { txHash: string; chainId: number };

export type RelayExecutionSteps = {
  steps?: {
    items?: {
      txHashes?: RelayTxHashRef[];
      internalTxHashes?: RelayTxHashRef[];
    }[];
  }[];
};

export type RelayReceiptLog = {
  address: string;
  topics: readonly string[];
  data: string;
};

export type RelayCreditReceipt = {
  status: string;
  logs: readonly RelayReceiptLog[];
};

const collectTxHashes = (execution: RelayExecutionSteps): RelayTxHashRef[] => {
  const out: RelayTxHashRef[] = [];
  for (const step of execution.steps ?? []) {
    for (const item of step.items ?? []) {
      for (const row of item.txHashes ?? []) {
        if (row.txHash) out.push(row);
      }
      for (const row of item.internalTxHashes ?? []) {
        if (row.txHash) out.push(row);
      }
    }
  }
  return out;
};

export const collectRelaySourceTxHashes = (
  execution: RelayExecutionSteps,
  originChainId: number,
): string[] => {
  const hashes = new Set<string>();
  for (const row of collectTxHashes(execution)) {
    if (row.chainId === originChainId) hashes.add(row.txHash);
  }
  return [...hashes];
};

export const collectRelayDestinationTxHashes = (
  execution: RelayExecutionSteps,
  destinationChainId: number,
): string[] => {
  const hashes = new Set<string>();
  for (const row of collectTxHashes(execution)) {
    if (row.chainId === destinationChainId && row.txHash) {
      hashes.add(row.txHash);
    }
  }
  return [...hashes];
};

/** Sum of ERC-20 `Transfer` value of `token` to `recipient` in one receipt. */
export const transferAmountTo = (
  logs: readonly RelayReceiptLog[],
  token: string,
  recipient: string,
): bigint => {
  const tokenAddr = token.toLowerCase();
  const recipientAddr = recipient.toLowerCase();
  let total = 0n;
  for (const log of logs) {
    if (log.address.toLowerCase() !== tokenAddr) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    const toTopic = log.topics[2];
    if (!toTopic) continue;
    const to = `0x${toTopic.slice(-40)}`.toLowerCase();
    if (to !== recipientAddr) continue;
    try {
      const value = BigInt(log.data);
      if (value > 0n) total += value;
    } catch {
      // Malformed log data is not a credit.
    }
  }
  return total;
};

export const receiptTransfersTokenTo = (
  logs: readonly RelayReceiptLog[],
  token: string,
  recipient: string,
): boolean => transferAmountTo(logs, token, recipient) > 0n;

/** First successful receipt that transfers `token` to `recipient`. */
export const selectRelayCreditTxHash = (params: {
  candidates: readonly string[];
  receipts: ReadonlyMap<string, RelayCreditReceipt>;
  token: string;
  recipient: string;
}): string | null => {
  const seen = new Set<string>();
  for (const hash of params.candidates) {
    if (!hash) continue;
    const key = hash.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const receipt = params.receipts.get(key);
    if (!receipt || receipt.status !== "success") continue;
    if (
      receiptTransfersTokenTo(receipt.logs, params.token, params.recipient)
    ) {
      return hash;
    }
  }
  return null;
};
