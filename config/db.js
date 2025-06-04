// config/db.js
const pgp = require('pg-promise')();
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ypeer_sherubtse',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS,
  max: 30 // Maximum number of clients in the pool
};

// Create the main database connection pool
const db = pgp(config);

const initializeDatabase = async () => {
  // Create a separate connection for initialization
  const initDb = pgp({
    ...config,
    database: 'postgres' // Connect to default database for initialization
  });

  try {
    // Check if our target database exists
    const dbExists = await initDb.oneOrNone(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database]
    );

    if (!dbExists) {
      // Create the database if it doesn't exist
      await initDb.none('CREATE DATABASE $1:name', [config.database]);
      console.log(`✅ Database ${config.database} created successfully`);
    }

    // Test the main connection
    const mainConn = await db.connect();
    console.log('✅ Connected to PostgreSQL server');
    mainConn.done(); // Release the connection back to the pool

    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    // Only cleanup the initialization database connection
    if (initDb.$pool) {
      await initDb.$pool.end();
    }
  }
};

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;
