const mongoose = require("mongoose");

/**
 * =========================================================================
 * HUB: SINGLE-NODE REPLICA SET BOOTSTRAP
 * =========================================================================
 *
 * Hotel Hub PC par MongoDB `--replSet rs0` ke saath chalta hai taake
 * transactions (createBooking ka transactional path) aur baad me sync engine
 * ke change streams kaam karein. Pehli dafa mongod start hone par replica set
 * "uninitialized" hota hai — ye helper usay initiate karta hai aur PRIMARY
 * banne tak intezar karta hai. Dobara chalane par kuch nahi badalta (idempotent).
 *
 * Mongoose ka apna driver use hota hai (alag `mongodb` package nahi), aur
 * connection `directConnection` hota hai kyun ke uninitialized replica set ke
 * saath normal replica-set discovery kaam nahi karti.
 */

const NOT_YET_INITIALIZED = 94; // MongoDB error code: NotYetInitialized
const ALREADY_INITIALIZED = 23; // MongoDB error code: AlreadyInitialized

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {Object} options
 * @param {string} options.host - mongod ka address jaisa member list me likha jaye, e.g. "127.0.0.1:27017"
 * @param {string} [options.replSetName="rs0"]
 * @param {number} [options.timeoutMs=60000] - PRIMARY banne ka max intezar
 * @returns {Promise<{ initiated: boolean, replSetName: string }>}
 *   initiated = true agar is call ne replica set banaya, false agar pehle se tha
 */
const ensureReplicaSet = async ({ host, replSetName = "rs0", timeoutMs = 60000 }) => {
  if (!host) {
    throw new Error("ensureReplicaSet: host is required (e.g. 127.0.0.1:27017)");
  }

  const conn = mongoose.createConnection(`mongodb://${host}/admin`, {
    directConnection: true,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await conn.asPromise();
    const admin = conn.db.admin();
    let initiated = false;

    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      if (status.set !== replSetName) {
        throw new Error(
          `mongod already belongs to replica set "${status.set}", expected "${replSetName}"`
        );
      }
    } catch (error) {
      if (error.code !== NOT_YET_INITIALIZED) {
        throw error;
      }
      try {
        await admin.command({
          replSetInitiate: { _id: replSetName, members: [{ _id: 0, host }] },
        });
        initiated = true;
      } catch (initError) {
        if (initError.code !== ALREADY_INITIALIZED) {
          throw initError;
        }
      }
    }

    // PRIMARY election me kuch seconds lagte hain — writable hone tak poll karein
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const hello = await admin.command({ hello: 1 });
      if (hello.isWritablePrimary && hello.setName === replSetName) {
        break;
      }
      if (Date.now() > deadline) {
        throw new Error(`Replica set "${replSetName}" did not elect a primary within ${timeoutMs}ms`);
      }
      await sleep(500);
    }

    return { initiated, replSetName };
  } finally {
    await conn.close();
  }
};

module.exports = { ensureReplicaSet };
