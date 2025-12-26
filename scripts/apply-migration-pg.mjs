#!/usr/bin/env node

/**
 * Script to apply the fix_missing_profiles migration
 * Connects directly to PostgreSQL to execute SQL
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationFile = join(__dirname, '../supabase/migrations/20241201000005_fix_missing_profiles.sql');
const sql = readFileSync(migrationFile, 'utf8');

console.log('Migration file location:');
console.log(migrationFile);
console.log('');
console.log('To apply this migration, please use one of these methods:');
console.log('');
console.log('METHOD 1: Supabase Studio (Recommended)');
console.log('  1. Open http://127.0.0.1:54323 in your browser');
console.log('  2. Navigate to SQL Editor');
console.log('  3. Copy and paste the contents of the migration file');
console.log('  4. Click "Run" to execute');
console.log('');
console.log('METHOD 2: psql command line');
console.log(`  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f "${migrationFile}"`);
console.log('');
console.log('METHOD 3: Copy SQL below and run in any PostgreSQL client:');
console.log('─'.repeat(80));
console.log(sql);
console.log('─'.repeat(80));

