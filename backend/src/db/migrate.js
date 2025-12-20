const path = require('path');
// Load env from backend/.env (run migrations from backend directory)
require('dotenv').config();
const fs = require('fs');
const db = require('./index');

async function migrate() {
  try {
    console.log('Running database migrations...');

    // Run main schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.query(schema);
    console.log('✅ Base schema applied');

    // Run migration files in order
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        console.log(`Running migration: ${file}`);
        const migrationPath = path.join(migrationsDir, file);
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await db.query(migration);
        console.log(`✅ ${file} applied`);
      }
    }

    console.log('✅ All database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
