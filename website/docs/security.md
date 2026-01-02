---
sidebar_position: 10
title: Security & Risks
---

# Security & Risks

Understanding security measures and potential risks is crucial when using any DeFi platform.

## Security Architecture

### Non-Custodial Design

Zyfai is built with a non-custodial architecture:

- **You control the keys**: Your smart account is controlled solely by you
- **No platform access**: Zyfai cannot access or move your funds without your permission
- **Session-based permissions**: Automated actions require your explicit approval via session keys

### ERC-7579 Smart Accounts

Zyfai utilizes ERC-7579 compliant smart accounts, providing:

- **Modular architecture**: Add or remove functionality as needed
- **Granular permissions**: Control exactly what actions can be automated
- **Multi-signature support**: Add additional security layers if desired
- **Recovery mechanisms**: Protect against key loss

### Smart Session Modules

Session keys enable automated actions with strict limitations:

- **Time-bound**: Sessions expire after a set period
- **Action-limited**: Only approved operations can be executed
- **Revocable**: Cancel session permissions anytime
- **Transparent**: All session activities are on-chain and auditable

## Security Audits

Zyfai undergoes regular security audits by reputable firms:

- **Smart contracts**: Comprehensive audits of all contract code
- **SDK security**: Review of client-side security practices
- **Infrastructure**: Backend and API security assessments

:::info
Audit reports will be published as they are completed. Check our [GitHub](https://github.com/ondefy/zyfai-sdk) for the latest reports.
:::

## Risks to Consider

### Smart Contract Risks

**What it is**: Bugs or vulnerabilities in smart contract code could lead to loss of funds.

**Mitigation**:
- Regular security audits
- Bug bounty program
- Gradual rollout with limited TVL caps
- Open-source code for community review

**Your responsibility**:
- Understand that smart contract risk exists in all DeFi
- Start with smaller amounts
- Diversify across multiple protocols

### Protocol Risks

**What it is**: The DeFi protocols Zyfai allocates to may have their own vulnerabilities or fail.

**Mitigation**:
- Diversification across multiple protocols
- Selection of established, audited protocols
- Continuous monitoring of protocol health
- Risk-adjusted strategy options (Safe vs. Degen)

**Your responsibility**:
- Review which protocols your funds are allocated to
- Understand the risk profile of each protocol
- Choose strategies matching your risk tolerance

### Oracle Risks

**What it is**: Price feeds or data sources could be manipulated or fail.

**Mitigation**:
- Use of multiple oracle sources
- Price deviation checks
- Time-weighted average pricing
- Circuit breakers for unusual market conditions

**Your responsibility**:
- Understand that oracle failures are possible
- Be aware during high volatility periods

### Gas Costs

**What it is**: Rebalancing transactions incur gas costs that may reduce net yields.

**Mitigation**:
- Gas-efficient contract design
- Strategic rebalancing (only when yield improvement exceeds costs)
- Layer 2 deployment (Arbitrum, Base) for lower fees

**Your responsibility**:
- Monitor your net returns after gas costs
- Consider gas costs relative to your position size
- Larger deposits generally have better gas efficiency

### Impermanent Loss (for LP strategies)

**What it is**: When providing liquidity, price divergence can lead to losses vs. holding assets.

**Mitigation**:
- Stable-to-stable pairs minimize this risk
- Yield from fees often compensates for IL
- Strategy selection based on volatility

**Your responsibility**:
- Understand impermanent loss before using LP strategies
- Choose stable pairs for lower IL risk
- Monitor your positions regularly

### Regulatory Risks

**What it is**: DeFi regulations are evolving and may impact accessibility or operations.

**Mitigation**:
- Monitoring regulatory developments
- Compliance with applicable laws
- Geographic restrictions where necessary

**Your responsibility**:
- Ensure DeFi usage is legal in your jurisdiction
- Comply with tax reporting requirements
- Stay informed about regulatory changes

## Best Practices

### API Key Security

```typescript
// ❌ BAD: Never hardcode API keys
const sdk = new ZyfaiSDK({ apiKey: "zyfai_12345..." });

// ✅ GOOD: Use environment variables
const sdk = new ZyfaiSDK({ apiKey: process.env.ZYFAI_API_KEY });
```

- Never commit API keys to version control
- Use `.env` files (add to `.gitignore`)
- Rotate keys regularly
- Use separate keys for development and production

### Private Key Security

```typescript
// ❌ BAD: Don't expose private keys in browser
await sdk.connectAccount("0xPrivateKey...", 8453);

// ✅ GOOD: Use wallet providers in browser
const provider = window.ethereum;
await sdk.connectAccount(provider);
```

- Never use private keys in frontend code
- Use wallet providers (MetaMask, WalletConnect, etc.) for browser apps
- Store private keys in secure environment variables for backend
- Consider using hardware wallets for large amounts

### Session Key Management

- Set appropriate expiration times
- Limit permissions to only necessary actions
- Revoke sessions when not needed
- Monitor session activity regularly

### Position Monitoring

- Check your positions regularly via the dashboard
- Review earnings and APY trends
- Be alert to unusual activity
- Set up notifications for large changes

### Gradual Onboarding

1. **Start small**: Test with a modest amount first
2. **Understand mechanics**: Learn how rebalancing works
3. **Monitor performance**: Watch your positions for a period
4. **Scale gradually**: Increase position size as you gain confidence

## Emergency Procedures

### Revoking Session Keys

If you suspect unauthorized activity:

```typescript
// Revoke session permissions immediately
// (Feature coming soon - for now, withdraw funds)
await sdk.withdrawFunds(userAddress, chainId);
```

### Withdrawing Funds

You can always withdraw your funds:

```typescript
// Full withdrawal
await sdk.withdrawFunds(userAddress, chainId);

// Partial withdrawal
await sdk.withdrawFunds(userAddress, chainId, "50000000"); // 50 USDC
```

Withdrawals are processed asynchronously by the backend. Monitor via:

```typescript
const history = await sdk.getHistory(walletAddress, chainId);
```

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** disclose it publicly
2. Email security@zyf.ai with details
3. Include steps to reproduce
4. Allow reasonable time for fixes

We appreciate responsible disclosure and offer rewards for valid findings.

## Insurance & Guarantees

:::caution
Zyfai does not currently offer insurance for funds. As with all DeFi:
- **No FDIC or government insurance**
- **No guaranteed returns**
- **Past performance ≠ future results**
- **Use only funds you can afford to lose**
:::

## Questions?

- Read the [FAQ](/docs/faq)
- Ask in [Discord](https://discord.gg/zyfai)
- Review [audit reports](https://github.com/ondefy/zyfai-sdk/audits)
- Contact: security@zyf.ai
