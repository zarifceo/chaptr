import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const testFile = resolve(
  "node_modules/.cache/chaptr-personalization-tests/tests/personalization.test.js",
);

const result = spawnSync(process.execPath, ["--test", testFile], {
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
