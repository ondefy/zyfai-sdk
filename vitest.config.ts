import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    // Vitest test mode loads .env, .env.local, .env.test, .env.test.local
    // loadEnv exposes non-VITE_ vars (PRIVATE_KEY, ZYFAI_API_KEY) to tests
    env: loadEnv(mode, process.cwd(), ""),
    include: ["src/**/*.test.ts", "src/integration/**/*.integration.test.ts"],
  },
}));
