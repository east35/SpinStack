const path = require('path');
// Load env from backend/.env (run migrations from backend directory)
require('dotenv').config();
const fs = require('fs');
const db = require('./index');

async function migrate() {
  try {
    console.log('Running database migrations...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await db.query(schema);

    console.log('✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
