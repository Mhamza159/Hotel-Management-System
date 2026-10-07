const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connects to an in-memory MongoDB instance.
 * Ensures isolated, ultra-fast test runs.
 */
const connect = async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: {
      checkMD5: false,
    },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Drops the database, closes the mongoose connection, and stops MongoMemoryServer.
 */
const disconnect = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  } else if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Clears all collections in the in-memory database between test cases.
 */
const clearDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

module.exports = {
  connect,
  disconnect,
  clearDatabase,
};
