const pool = require("./db");

async function check() {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("DATABASE TABLES:");
    console.table(result.rows);
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await pool.end();
  }
}

check();