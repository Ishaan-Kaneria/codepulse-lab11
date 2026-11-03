// server/index.js - start the Express server locally (or in a Codespace).
const app = require('./app');
const { run } = require('./db');

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, async () => {
  console.log(`CodePulse is running at http://localhost:${PORT}`);
  try {
    const { rows } = await run('SELECT version()');
    console.log('Connected to:', rows[0].version);
  } catch (err) {
    console.error('Could not reach PostgreSQL:', err.message);
    console.error('Check the PG* values (or DATABASE_URL) in your .env file.');
  }
});
