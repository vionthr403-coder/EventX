require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,

  // Render PostgreSQL / remote PostgreSQL-ku SSL
  ssl: {
    rejectUnauthorized: false,
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// PostgreSQL connection test
pool
  .query("SELECT NOW()")
  .then((result) => {
    console.log("PostgreSQL Connected Successfully!");
    console.log("Database Time:", result.rows[0].now);
  })
  .catch((error) => {
    console.error("PostgreSQL Connection Failed:");
    console.error(error);
  });

// Pool errors
pool.on("error", (error) => {
  console.error("PostgreSQL Pool Error:");
  console.error(error);
});

module.exports = pool;