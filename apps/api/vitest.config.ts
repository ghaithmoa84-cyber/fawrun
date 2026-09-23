import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--require', 'ts-node/register'],
      },
    },
    alias: {
      '@prisma/client': resolve(__dirname, './node_modules/@prisma/client'),
    },
    include: ['test/**/*.spec.ts'],
    exclude: ['test/integration/**/*.spec.ts'],
    globals: true,
    environment: 'node',
  },
});