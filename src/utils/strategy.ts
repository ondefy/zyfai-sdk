export type PublicStrategy = "conservative" | "aggressive";
export type InternalStrategy = "safe_strategy" | "degen_strategy";

export function toInternalStrategy(
  publicStrategy: PublicStrategy
): InternalStrategy {
  switch (publicStrategy) {
    case "conservative":
      return "safe_strategy";
    case "aggressive":
      return "degen_strategy";
    default:
      throw new Error(
        `Invalid public strategy: ${publicStrategy}. Must be "conservative" or "aggressive".`
      );
  }
}

export function toPublicStrategy(
  internalStrategy: InternalStrategy | "safe" | "degen"
): PublicStrategy {
  if (internalStrategy === "safe_strategy" || internalStrategy === "safe") {
    return "conservative";
  }
  if (internalStrategy === "degen_strategy" || internalStrategy === "degen") {
    return "aggressive";
  }
  throw new Error(
    `Invalid internal strategy: ${internalStrategy}. Must be "safe_strategy" or "degen_strategy".`
  );
}

export function isValidPublicStrategy(
  strategy: string
): strategy is PublicStrategy {
  return strategy === "conservative" || strategy === "aggressive";
}

export function convertStrategyToPublic<T extends { strategy?: string }>(
  obj: T
): T {
  if (!obj.strategy) {
    return obj;
  }

  try {
    return {
      ...obj,
      strategy: toPublicStrategy(
        obj.strategy as InternalStrategy | "safe" | "degen"
      ),
    };
  } catch {
    // If conversion fails, keep original value
    return obj;
  }
}

export function convertStrategiesToPublic<T extends { strategy?: string }>(
  array: T[]
): T[] {
  return array.map((item) => convertStrategyToPublic(item));
}
