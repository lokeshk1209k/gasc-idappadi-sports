const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gasc_sports_db';
  try {
    console.log(`Connecting to MongoDB at: ${uri}...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`Standard MongoDB connection to ${uri} failed: ${error.message}`);
    console.log('Attempting in-memory MongoDB fallback for seamless demonstration...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      console.log(`In-Memory MongoDB Server started at: ${memUri}`);
      const conn = await mongoose.connect(memUri);
      console.log(`In-Memory MongoDB Connected successfully!`);
      return conn;
    } catch (memErr) {
      console.error('In-memory MongoDB could not be started:', memErr.message);
      console.error('Please ensure MongoDB is running or install mongodb-memory-server.');
      // Re-throw so server or caller knows
      throw error;
    }
  }
};

module.exports = connectDB;
