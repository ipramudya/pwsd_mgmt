/** #!/usr/bin/env node */

/** biome-ignore-all lint/suspicious/noConsole: log the commands and informations */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIR = path.join(__dirname, '../src/lib/migrations');
const DB_NAME = 'DB';

function exec(command, silent = false) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    });

    if (silent && result.trim()) {
      try {
        // Extract JSON from wrangler output
        const lines = result.split('\n');
        const jsonStartIndex = lines.findIndex((line) =>
          line.trim().startsWith('[')
        );
        if (jsonStartIndex !== -1) {
          const jsonLines = lines.slice(jsonStartIndex);
          const jsonEndIndex = jsonLines.findIndex(
            (line) => line.trim() === ']'
          );
          if (jsonEndIndex !== -1) {
            const jsonString = jsonLines.slice(0, jsonEndIndex + 1).join('\n');
            return JSON.parse(jsonString);
          }
        }
        // Fallback to parsing entire result
        return JSON.parse(result);
      } catch {
        // If JSON parse fails, return raw result
        return { raw: result };
      }
    }

    return result;
  } catch (error) {
    if (!silent) {
      console.error(`❌ Command failed: ${command}`);
      console.error(error.message);
    }
    throw error;
  }
}

function showHelp() {
  console.log(`
📚 Database Management Commands

Usage: npm run db <command> [options]

Commands:
  generate              Generate new migration from schema
  migrate               Apply all pending migrations (local + remote)
  migrate:local         Apply migrations to local database only  
  migrate:remote        Apply migrations to remote database only
  status                Show migration status and database info
  schema [table]        Compare schemas or check specific table
  reset:local           Reset local database and reapply all migrations
  info                  Show Cloudflare D1 database information
  help                  Show this help message

Examples:
  npm run db generate
  npm run db migrate
  npm run db status
  npm run db schema blocks
  npm run db reset:local
`);
}

function generateMigration() {
  console.log('🔧 Generating migration...');
  exec('npx drizzle-kit generate');
}

function migrateLocal() {
  console.log('🔄 Migrating local database...');
  exec('npx drizzle-kit migrate');
}

function migrateRemote() {
  console.log('🚀 Migrating remote database...');

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  // Get applied migrations
  let appliedMigrations = [];
  try {
    exec(
      `npx wrangler d1 execute --remote ${DB_NAME} --command "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, tag TEXT NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);"`,
      true
    );
    const result = exec(
      `npx wrangler d1 execute --remote ${DB_NAME} --command "SELECT tag FROM d1_migrations ORDER BY id;"`,
      true
    );
    appliedMigrations = result[0]?.results?.map((row) => row.tag) || [];
  } catch {
    console.log('ℹ️ No previous migrations found');
  }

  // Apply pending migrations
  const pending = files.filter(
    (file) => !appliedMigrations.includes(file.replace('.sql', ''))
  );

  if (pending.length === 0) {
    console.log('✅ All migrations are up to date!');
    return;
  }

  console.log(`🔄 Applying ${pending.length} pending migrations...`);

  for (const file of pending) {
    const migrationName = file.replace('.sql', '');
    const filePath = path.join(MIGRATIONS_DIR, file);

    console.log(`   📄 ${migrationName}`);

    // Execute migration file
    try {
      exec(
        `npx wrangler d1 execute --remote ${DB_NAME} --file "${filePath}"`,
        true
      );
      exec(
        `npx wrangler d1 execute --remote ${DB_NAME} --command "INSERT INTO d1_migrations (tag) VALUES ('${migrationName}');"`,
        true
      );
      console.log('   ✅ Applied successfully');
    } catch (error) {
      console.error(`   ❌ Failed to apply ${migrationName}`);
      throw error;
    }
  }

  console.log('🎉 Remote migration completed!');
}

function showStatus() {
  console.log('📊 Database Status Report');
  console.log('='.repeat(50));

  // Local status
  try {
    console.log('\n🏠 Local Database:');
    const localMigrations = exec(
      `npx wrangler d1 execute --local ${DB_NAME} --command "SELECT name as tag FROM d1_migrations ORDER BY id DESC LIMIT 3;"`,
      true
    );
    const localTables = exec(
      `npx wrangler d1 execute --local ${DB_NAME} --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_METADATA') ORDER BY name;"`,
      true
    );

    console.log(
      `   📋 Recent migrations: ${localMigrations[0]?.results?.map((r) => r.tag).join(', ') || 'None'}`
    );
    const localTableNames = localTables[0]?.results?.map((r) => r.name) || [];
    console.log(
      `   📊 Tables: ${localTableNames.length > 0 ? localTableNames.join(', ') : 'None'}`
    );
    // console.log('Debug localTables:', JSON.stringify(localTables, null, 2));
  } catch {
    console.log('   ❌ Could not access local database');
  }

  // Remote status
  try {
    console.log('\n☁️ Remote Database:');

    // Try different migration table formats
    let remoteMigrations;
    try {
      remoteMigrations = exec(
        `npx wrangler d1 execute --remote ${DB_NAME} --command "SELECT tag FROM d1_migrations ORDER BY id DESC LIMIT 3;"`,
        true
      );
    } catch {
      try {
        remoteMigrations = exec(
          `npx wrangler d1 execute --remote ${DB_NAME} --command "SELECT hash as tag FROM \\"orm-migrations\\" ORDER BY id DESC LIMIT 3;"`,
          true
        );
      } catch {
        remoteMigrations = [{ results: [] }];
      }
    }

    const remoteTables = exec(
      `npx wrangler d1 execute --remote ${DB_NAME} --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_KV', 'orm-migrations') ORDER BY name;"`,
      true
    );

    console.log(
      `   📋 Recent migrations: ${remoteMigrations[0]?.results?.map((r) => r.tag).join(', ') || 'None'}`
    );
    const remoteTableNames = remoteTables[0]?.results?.map((r) => r.name) || [];
    console.log(
      `   📊 Tables: ${remoteTableNames.length > 0 ? remoteTableNames.join(', ') : 'None'}`
    );
  } catch {
    console.log('   ❌ Could not access remote database');
  }
}

function checkSchema(tableName) {
  if (tableName) {
    checkSingleTableSchema(tableName);
  } else {
    checkAllSchemas();
  }
}

function checkSingleTableSchema(tableName) {
  console.log(`🔍 Schema for table: ${tableName}`);
  console.log('='.repeat(40));

  try {
    const local = exec(
      `npx wrangler d1 execute --local ${DB_NAME} --command "PRAGMA table_info(${tableName});"`,
      true
    );
    const remote = exec(
      `npx wrangler d1 execute --remote ${DB_NAME} --command "PRAGMA table_info(${tableName});"`,
      true
    );

    console.log('\n🏠 Local Schema:');
    console.table(local[0]?.results || []);

    console.log('\n☁️ Remote Schema:');
    console.table(remote[0]?.results || []);

    const match =
      JSON.stringify(local[0]?.results) === JSON.stringify(remote[0]?.results);
    console.log(match ? '\n✅ Schemas match!' : '\n❌ Schemas differ!');
  } catch {
    console.error('❌ Failed to check schema');
  }
}

function checkAllSchemas() {
  console.log('🔍 Schema Comparison');
  console.log('='.repeat(30));

  try {
    const localTables = exec(
      `npx wrangler d1 execute --local ${DB_NAME} --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_METADATA') ORDER BY name;"`,
      true
    );
    const remoteTables = exec(
      `npx wrangler d1 execute --remote ${DB_NAME} --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_KV', 'orm-migrations') ORDER BY name;"`,
      true
    );

    const local = localTables[0]?.results?.map((r) => r.name) || [];
    const remote = remoteTables[0]?.results?.map((r) => r.name) || [];

    console.log(`\n🏠 Local tables:  [${local.join(', ')}]`);
    console.log(`☁️ Remote tables: [${remote.join(', ')}]`);

    const match = JSON.stringify(local) === JSON.stringify(remote);
    console.log(match ? '\n✅ Table lists match!' : '\n❌ Table lists differ!');

    if (!match) {
      console.log(
        '\nℹ️ Run "npm run db schema <table-name>" to check specific table schemas'
      );
    }
  } catch {
    console.error('❌ Failed to compare schemas');
  }
}

function resetLocal() {
  console.log('🔥 Resetting local database...');
  try {
    exec(
      `npx wrangler d1 execute --local ${DB_NAME} --command "DROP TABLE IF EXISTS accounts; DROP TABLE IF EXISTS blocks; DROP TABLE IF EXISTS fields; DROP TABLE IF EXISTS text_fields; DROP TABLE IF EXISTS password_fields; DROP TABLE IF EXISTS todo_fields; DELETE FROM d1_migrations WHERE 1=1;"`,
      true
    );
    console.log('🔄 Reapplying migrations...');
    migrateLocal();
    console.log('✅ Local database reset complete!');
  } catch {
    console.error('❌ Failed to reset local database');
  }
}

function showInfo() {
  console.log('📊 Database Information:');
  exec(`npx wrangler d1 info ${DB_NAME}`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'generate':
      generateMigration();
      break;
    case 'migrate':
      migrateLocal();
      migrateRemote();
      break;
    case 'migrate:local':
      migrateLocal();
      break;
    case 'migrate:remote':
      migrateRemote();
      break;
    case 'status':
      showStatus();
      break;
    case 'schema':
      checkSchema(args[1]);
      break;
    case 'reset:local':
      resetLocal();
      break;
    case 'info':
      showInfo();
      break;
    case 'help':
    case undefined:
      showHelp();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "npm run db help" for available commands');
      process.exit(1);
  }
}

main();
