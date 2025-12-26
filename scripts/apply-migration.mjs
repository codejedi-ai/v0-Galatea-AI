#!/usr/bin/env node

/**
 * Script to apply the fix_missing_profiles migration
 * Uses Supabase client with service role key to execute SQL
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const migrationFile = join(__dirname, '../supabase/migrations/20241201000005_fix_missing_profiles.sql');
const sql = readFileSync(migrationFile, 'utf8');

console.log('Applying migration: fix_missing_profiles');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('');

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Execute the SQL
try {
  // Split SQL into individual statements (simple approach)
  // Note: This is a simplified parser - for production, use a proper SQL parser
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...`);
  
  // For Supabase, we need to use RPC or direct PostgreSQL connection
  // Since we can't execute raw SQL directly via JS client, we'll use the REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    // If RPC doesn't exist, try alternative approach
    console.log('RPC method not available. Please run the migration manually:');
    console.log('');
    console.log('Option 1: Use Supabase Studio');
    console.log('  1. Open http://127.0.0.1:54323 (Supabase Studio)');
    console.log('  2. Go to SQL Editor');
    console.log('  3. Paste the contents of:');
    console.log(`     ${migrationFile}`);
    console.log('  4. Click "Run"');
    console.log('');
    console.log('Option 2: Use psql');
    console.log(`  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f ${migrationFile}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log('Migration applied successfully!');
  console.log(result);
} catch (error) {
  console.error('Error applying migration:', error.message);
  console.log('');
  console.log('Please run the migration manually using one of these methods:');
  console.log('');
  console.log('1. Supabase Studio (http://127.0.0.1:54323) -> SQL Editor');
  console.log(`2. psql: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f ${migrationFile}`);
  process.exit(1);
}

