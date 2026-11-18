import { version } from "../package.json";

/**
 * Installed `@zyfai/sdk` version.
 * Sent on every execution and data API request as `X-Zyfai-Sdk-Version`.
 */
export const SDK_VERSION: string = version;

/** @internal */
export const SDK_VERSION_HEADER = "X-Zyfai-Sdk-Version";
