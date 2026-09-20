const PRIVATE_KEY_RE = /^0x[a-fA-F0-9]{64}$/;

export function integrationEnvReady(): boolean {
  return skipIntegrationReason() === undefined;
}

export function skipIntegrationReason(): string | undefined {
  const apiKey = process.env.ZYFAI_API_KEY?.trim();
  const privateKey = process.env.PRIVATE_KEY?.trim();

  if (!apiKey) {
    return "missing ZYFAI_API_KEY — copy env.test.example to .env.test";
  }
  if (!privateKey) {
    return "missing PRIVATE_KEY — copy env.test.example to .env.test";
  }
  if (!PRIVATE_KEY_RE.test(privateKey)) {
    return "PRIVATE_KEY must be a 32-byte hex string (0x...) in .env.test";
  }
  return undefined;
}
