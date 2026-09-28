require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      }
);

// Prevent Neon idle connection errors from crashing the server
pool.on("error", (error) => {
  console.error("PostgreSQL Pool Error:", error.message);
});

// Test database connection
pool
  .query("SELECT 1")
  .then(() => {
    console.log("PostgreSQL Connected Successfully!");
  })
  .catch((error) => {
    console.error("PostgreSQL Connection Failed:", error.message);
  });

module.exports = pool;