const { MongoClient } = require('mongodb');

let client = null;
let clientPromise = null;
let db = null;

/**
 * Connect to MongoDB with cached client and database connection.
 * Reuses the existing connection across invocations.
 */
async function connectDB() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in server/.env');
  }

  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  const connectedClient = await clientPromise;
  const dbName = process.env.DB_NAME || 'ordersaathi';
  db = connectedClient.db(dbName);
  return db;
}

function getClient() {
  return client;
}

function getDb() {
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    clientPromise = null;
    db = null;
  }
}

module.exports = {
  connectDB,
  getClient,
  getDb,
  closeDB
};
