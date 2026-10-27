// Thin wrapper that runs the `tern` migration tool with this project's
// conventions baked in:
//
//   * loads `.env` so DATABASE_URL / TEST_DATABASE_URL are available
//     (tern does not read .env itself), which tern.conf interpolates via
//     `{{ env "DATABASE_URL" }}`.
//   * a leading `--test` flag points tern at TEST_DATABASE_URL instead of
//     DATABASE_URL (used to migrate the dsc_test database).
//   * always passes `-m ./migrations`, and `-c ./migrations/tern.conf` for
//     the subcommands that connect to the database.
//
// All remaining arguments are forwarded verbatim to tern, e.g.:
//   node scripts/tern.mjs migrate            -> migrate dev DB to latest
//   node scripts/tern.mjs --test migrate     -> migrate the test DB
//   node scripts/tern.mjs migrate -d -1      -> roll back one migration
//   node scripts/tern.mjs status             -> show current version
//   node scripts/tern.mjs new add_products   -> scaffold a new migration
//
// Requires the `tern` binary on PATH (install: `go install
// github.com/jackc/tern/v2@latest`). Override the binary via TERN_BIN.

import "dotenv/config";
import { spawnSync } from "node:child_process";

const MIGRATIONS_DIR = "./migrations";
const CONFIG_FILE = "./migrations/tern.conf";
const TERN_BIN = process.env.TERN_BIN ?? "tern";

const args = process.argv.slice(2);

// `--test` (anywhere in the args) targets the test database.
const testIndex = args.indexOf("--test");
if (testIndex !== -1) {
  args.splice(testIndex, 1);
  if (!process.env.TEST_DATABASE_URL) {
    console.error("tern.mjs: --test given but TEST_DATABASE_URL is not set");
    process.exit(1);
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

const subcommand = args[0];
if (!subcommand) {
  console.error(
    'tern.mjs: no subcommand given (try "migrate", "status", "new", ...)',
  );
  process.exit(1);
}

// Subcommands that open a database connection need the config file; scaffolding
// commands like `new`/`init` do not (and tern rejects `-c` for them).
const CONNECTING = new Set([
  "migrate",
  "status",
  "code",
  "version",
  "override-version",
]);

const ternArgs = [...args, "-m", MIGRATIONS_DIR];
if (CONNECTING.has(subcommand)) {
  ternArgs.push("-c", CONFIG_FILE);
}

const result = spawnSync(TERN_BIN, ternArgs, {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error(
      `tern.mjs: could not find the "${TERN_BIN}" binary on PATH.\n` +
        "Install it with: go install github.com/jackc/tern/v2@latest",
    );
  } else {
    console.error(`tern.mjs: ${result.error.message}`);
  }
  process.exit(1);
}

process.exit(result.status ?? 1);
