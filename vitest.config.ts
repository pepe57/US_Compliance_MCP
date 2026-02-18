import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run test files sequentially to avoid SQLite database locking
    // (node-sqlite3-wasm doesn't support concurrent access to the same file)
    fileParallelism: false,
  },
});
