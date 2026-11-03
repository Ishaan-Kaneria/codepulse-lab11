// scripts/load-db.js - creates the 42 tables and loads all rows into the database in .env.
// Handy for a hosted database (Neon / Supabase) when psql is not installed.
// WARNING: 01_create_tables.sql drops and recreates the public schema.
const fs = require('fs');
const path = require('path');
const { pool } = require('../server/db');

(async () => {
  const files = ['01_create_tables.sql', '02_insert_data.sql'];
  try {
    for (const f of files) {
      const sql = fs.readFileSync(path.join(__dirname, '..', 'db', f), 'utf8');
      process.stdout.write(`Running ${f} ... `);
      await pool.query(sql);
      console.log('done');
    }
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM submissions');
    console.log(`Loaded. submissions = ${rows[0].n}`);
  } catch (err) {
    console.error('\nLoad failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
