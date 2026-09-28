require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      }
);

pool.connect()
  .then(() => console.log("PostgreSQL Connected Successfully!"))
  .catch((error) =>
    console.error("PostgreSQL Connection Failed:", error.message)
  );

module.exports = pool;