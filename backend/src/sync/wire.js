const mongoose = require('mongoose');

/**
 * Sync payloads JSON me ObjectId / Date kho dete hain. Extended JSON (EJSON) unhein
 * { $oid } / { $date } bana kar bhejta hai aur doosri taraf wapis asal types banata hai.
 */
const { EJSON } = mongoose.mongo.BSON;

const encode = (value) => EJSON.serialize(value, { relaxed: true });
const decode = (value) => EJSON.deserialize(value || {}, { relaxed: true });

module.exports = { encode, decode };
