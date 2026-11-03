// scripts/test-connection.js - proves the connection works (Lab 11, section A).
const { pool } = require('../server/db');

(async () => {
  try {
    const { rows } = await pool.query('SELECT version()');
    console.log('Connection OK');
    console.log(rows[0].version);
    const t = await pool.query(
      "SELECT COUNT(*)::int AS tables FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log(`Tables in public schema: ${t.rows[0].tables}`);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
