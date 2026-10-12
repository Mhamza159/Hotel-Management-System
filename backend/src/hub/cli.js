#!/usr/bin/env node
/**
 * =========================================================================
 * HUB CLI — hotel Hub installer ke helper commands
 * =========================================================================
 *
 *   node src/hub/cli.js init-replset [--host=127.0.0.1:27017] [--name=rs0]
 *   node src/hub/cli.js create-admin [--allow-additional]
 *   node src/hub/cli.js status
 *   node src/hub/cli.js rotate-logs
 *   node src/hub/cli.js sync-backfill   (sync se pehle ka data; cloud par bhi ek dafa)
 *
 * create-admin details environment se leta hai (command line se nahi, taake
 * password shell history / process list me na aaye):
 *   HUB_ADMIN_NAME, HUB_ADMIN_EMAIL, HUB_ADMIN_PASSWORD
 *
 * Database ka address HOTEL_ENV_FILE (ya .env) ke MONGO_URI se aata hai.
 * Har command aakhir me ek line "HUB_RESULT {json}" print karti hai jo
 * PowerShell installer parse karta hai. Exit code 0 = kamyab.
 */

const parseArgs = (argv) => {
  const [command, ...rest] = argv;
  const flags = {};
  for (const arg of rest) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (match) flags[match[1]] = match[2] === undefined ? true : match[2];
  }
  return { command, flags };
};

const printResult = (result) => {
  process.stdout.write(`HUB_RESULT ${JSON.stringify(result)}\n`);
};

const withDatabase = async (fn) => {
  const mongoose = require("mongoose");
  const config = require("../config/env");
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  try {
    return await fn(mongoose);
  } finally {
    await mongoose.disconnect();
  }
};

const commands = {
  "init-replset": async (flags) => {
    const { ensureReplicaSet } = require("./replicaSet");
    const host = typeof flags.host === "string" ? flags.host : "127.0.0.1:27017";
    const replSetName = typeof flags.name === "string" ? flags.name : "rs0";
    const result = await ensureReplicaSet({ host, replSetName });
    return { ok: true, ...result, host };
  },

  "create-admin": async (flags) => {
    const { createHubAdmin } = require("./createAdmin");
    return withDatabase(async () => {
      const result = await createHubAdmin({
        name: process.env.HUB_ADMIN_NAME,
        email: process.env.HUB_ADMIN_EMAIL,
        password: process.env.HUB_ADMIN_PASSWORD,
        allowAdditional: flags["allow-additional"] === true,
      });
      return { ok: true, ...result };
    });
  },

  // Sync se pehle ke documents ko is node (SYNC_NODE) ki muhar do — ek dafa chalana kafi
  "sync-backfill": async () =>
    withDatabase(async () => {
      const { backfillLegacyDocuments } = require("../sync/syncStore");
      const config = require("../config/env");
      return { ok: true, node: config.sync.node, stamped: await backfillLegacyDocuments() };
    }),

  // Rozana backup task chalata hai: mongod.log ko rename kar ke naya shuru karta hai
  "rotate-logs": async () =>
    withDatabase(async (mongoose) => {
      await mongoose.connection.db.admin().command({ logRotate: 1 });
      return { ok: true };
    }),

  status: async () =>
    withDatabase(async (mongoose) => {
      const User = require("../models/User");
      const { ROLES } = require("../config/constants");
      const hello = await mongoose.connection.db.admin().command({ hello: 1 });
      const config = require("../config/env");
      const SyncState = require("../models/SyncState");
      const Booking = require("../models/Booking");
      const { ROOM_HOLDING_STATUSES } = require("../sync/bookingRanges");
      const syncState = (await SyncState.findById("hub").lean()) || {};
      return {
        sync: {
          node: config.sync.node,
          enabled: Boolean(config.sync.cloudUrl && config.sync.sharedKey),
          cloudUrl: config.sync.cloudUrl || null,
          lastSuccessAt: syncState.lastSuccessAt || null,
          lastError: syncState.lastError || null,
          conflictBookings: await Booking.countDocuments({
            syncConflict: { $ne: null },
            status: { $in: ROOM_HOLDING_STATUSES },
          }),
        },
        ok: true,
        database: mongoose.connection.name,
        replicaSet: hello.setName || null,
        isWritablePrimary: Boolean(hello.isWritablePrimary),
        superAdmins: await User.countDocuments({ role: ROLES.SUPER_ADMIN }),
        staff: await User.countDocuments({ role: { $ne: ROLES.GUEST } }),
      };
    }),
};

const main = async () => {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const handler = commands[command];
  if (!handler) {
    process.stderr.write(`Usage: node src/hub/cli.js <${Object.keys(commands).join("|")}>\n`);
    process.exitCode = 2;
    return;
  }
  try {
    printResult(await handler(flags));
  } catch (error) {
    printResult({ ok: false, error: error.message });
    process.exitCode = 1;
  }
};

if (require.main === module) {
  main();
}

module.exports = { parseArgs, commands };
