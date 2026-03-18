const mongoose = require('mongoose');

let connectPromise = null;

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) return '';
  return String(uri);
};

const connectMongo = async () => {
  const uri = getMongoUri();
  if (!uri) return null;
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectPromise) return connectPromise;

  connectPromise = mongoose.connect(uri, { autoIndex: true }).then(() => mongoose.connection);
  return connectPromise;
};

module.exports = { connectMongo, getMongoUri };
