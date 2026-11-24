import { expect, it } from "vitest";
import {
  canOptInHistoryRebalance,
  customizationCatalogPoolKey,
  describeIntegrationSuite,
  flattenCustomizationCatalog,
  integrationSdkConfig,
  isAsyncWithdrawalHistory,
  logIntegrationEvidence,
  type CustomizationCatalogPool,
} from "./utils";

const CHAIN_ID = 8453;
const HISTORY_LIMIT = 50;
const NOT_LIVE = "not live";

/**
 * PR 98: optional catalog flags and history `rebalanceLegs`.
 * Opt-in against the local execution API (`ZYFAI_ENV=local`).
 */
describeIntegrationSuite(
  "partner-catalog-history",
  { spendProfile: "readonly", timeout: 180_000 },
  () => {
    it("forwards pool catalog flags and history rebalanceLegs", async () => {
      const { ZyfaiSDK } = await import("../core/ZyfaiSDK");
      const sdk = new ZyfaiSDK(integrationSdkConfig());
      const startedAt = Date.now();

      const protocols = await sdk.getAvailableProtocols(CHAIN_ID);
      expect(protocols.success).toBe(true);
      expect(protocols.protocols.length).toBeGreaterThan(0);

      const ordered = [...protocols.protocols].sort((left, right) => {
        const rank = (name: string) => (/morpho/i.test(name) ? 0 : 1);
        return rank(left.name) - rank(right.name);
      });

      let selected:
        | {
            protocolId: string;
            protocolName: string;
            listed: CustomizationCatalogPool[];
            withStatus: CustomizationCatalogPool[];
          }
        | undefined;

      for (const protocol of ordered) {
        const listed = flattenCustomizationCatalog(
          await sdk.getAvailablePools(protocol.id),
        );
        if (listed.length === 0) continue;
        const withStatus = flattenCustomizationCatalog(
          await sdk.getAvailablePools(protocol.id, undefined, {
            includeStatus: true,
          }),
        );
        selected = {
          protocolId: protocol.id,
          protocolName: protocol.name,
          listed,
          withStatus,
        };
        if (withStatus.some((pool) => pool.status === NOT_LIVE)) break;
      }

      expect(selected, "expected a protocol with at least one pool").toBeTruthy();
      const catalog = selected!;
      const catalogAcceptedAt = Date.now();

      expect(catalog.listed.every((pool) => pool.status === undefined)).toBe(
        true,
      );
      expect(
        catalog.withStatus.every(
          (pool) => typeof pool.status === "string" && pool.status.length > 0,
        ),
      ).toBe(true);
      expect(catalog.withStatus.map(customizationCatalogPoolKey).sort()).toEqual(
        catalog.listed.map(customizationCatalogPoolKey).sort(),
      );

      const liveOnly = flattenCustomizationCatalog(
        await sdk.getAvailablePools(catalog.protocolId, undefined, {
          liveOnly: true,
        }),
      );
      const notLive = catalog.withStatus.filter(
        (pool) => pool.status === NOT_LIVE,
      );
      const liveKeys = new Set(liveOnly.map(customizationCatalogPoolKey));

      expect(liveOnly.every((pool) => pool.status === undefined)).toBe(true);
      expect(liveOnly.length).toBe(catalog.withStatus.length - notLive.length);
      for (const pool of notLive) {
        expect(liveKeys.has(customizationCatalogPoolKey(pool))).toBe(false);
      }
      for (const pool of liveOnly) {
        const match = catalog.withStatus.find(
          (candidate) =>
            customizationCatalogPoolKey(candidate) ===
            customizationCatalogPoolKey(pool),
        );
        expect(match?.status).not.toBe(NOT_LIVE);
      }

      const userAddress = await sdk.connectAccount(
        process.env.PRIVATE_KEY!,
        CHAIN_ID,
      );
      const profile = await sdk.getUserDetails();
      expect(profile.smartWallet).toBeTruthy();
      const smartWallet = profile.smartWallet!;

      const plain = await sdk.getHistory(smartWallet, CHAIN_ID, {
        limit: HISTORY_LIMIT,
      });
      const withLegs = await sdk.getHistory(smartWallet, CHAIN_ID, {
        limit: HISTORY_LIMIT,
        rebalanceLegs: true,
      });
      const finishedAt = Date.now();

      expect(plain.success).toBe(true);
      expect(withLegs.success).toBe(true);
      expect(withLegs.total).toBe(plain.total);
      expect(withLegs.data.map((row) => row.transactionHash)).toEqual(
        plain.data.map((row) => row.transactionHash),
      );

      let flippedToRebalance = 0;
      let asyncUserRowsUnchanged = 0;
      for (let index = 0; index < plain.data.length; index += 1) {
        const before = plain.data[index];
        const after = withLegs.data[index];
        const wasRebalance = before.rebalance === true;
        const nowRebalance = after.rebalance === true;
        if (wasRebalance === nowRebalance) {
          if (isAsyncWithdrawalHistory(before) && !nowRebalance) {
            asyncUserRowsUnchanged += 1;
          }
          continue;
        }
        expect(wasRebalance).toBe(false);
        expect(nowRebalance).toBe(true);
        expect(canOptInHistoryRebalance(before)).toBe(true);
        flippedToRebalance += 1;
      }

      logIntegrationEvidence("partner-catalog-history", {
        chainId: CHAIN_ID,
        userAddress,
        smartWallet,
        protocolName: catalog.protocolName,
        protocolId: catalog.protocolId,
        listedPools: catalog.listed.length,
        notLivePools: notLive.length,
        liveOnlyPools: liveOnly.length,
        historyRows: plain.data.length,
        historyTotal: plain.total,
        flippedToRebalance,
        asyncUserRowsUnchanged,
        acceptanceMs: catalogAcceptedAt - startedAt,
        terminalMs: finishedAt - startedAt,
      });
    });
  },
);
