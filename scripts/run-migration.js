#!/usr/bin/env node

/**
 * Script to run the fix_missing_profiles migration
 * This can be run when npx/psql are not available
 */

const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '../supabase/migrations/20241201000005_fix_missing_profiles.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log('Migration file loaded. SQL content:');
console.log('---');
console.log(sql.substring(0, 500) + '...');
console.log('---');
console.log('\nTo apply this migration, you can:');
console.log('1. Use Supabase Studio: Go to SQL Editor and paste the contents of:');
console.log(`   ${migrationFile}`);
console.log('\n2. Or use psql directly:');
console.log(`   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f ${migrationFile}`);
console.log('\n3. Or use Supabase CLI:');
console.log(`   npx supabase migration up --db-url postgresql://postgres:postgres@127.0.0.1:54322/postgres`);

