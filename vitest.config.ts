import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { config } from "dotenv";

config();
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    globalSetup: ["./tests/setup/global-setup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST!, UPLOAD_DIR: "./.test-uploads" },
  },
});
