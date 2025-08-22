#!/usr/bin/env node

/**
 * BrainBased EMDR Platform - Database Reset Script
 * 
 * This script will completely reset the database to a clean state.
 * USE WITH EXTREME CAUTION - this will delete ALL data!
 * 
 * Usage:
 *   node scripts/reset-database.js [--confirm]
 * 
 * The --confirm flag is required to prevent accidental execution.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for confirmation flag
const args = process.argv.slice(2);
const isConfirmed = args.includes('--confirm');

if (!isConfirmed) {
  console.log('🚨 DATABASE RESET SCRIPT');
  console.log('');
  console.log('This script will PERMANENTLY DELETE ALL DATA in the database!');
  console.log('');
  console.log('This includes:');
  console.log('• All users (students, consultants, admins)');
  console.log('• All consultation sessions');
  console.log('• All notifications');
  console.log('• All certificates');
  console.log('• All availability schedules');
  console.log('• ALL other data');
  console.log('');
  console.log('To proceed, run:');
  console.log('  node scripts/reset-database.js --confirm');
  console.log('');
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required environment variables:');
  console.error('  SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetDatabase() {
  try {
    console.log('🚨 STARTING DATABASE RESET...');
    console.log('');
    
    // Read the SQL reset script
    const sqlScript = readFileSync(join(__dirname, 'reset-database.sql'), 'utf8');
    
    console.log('📋 Executing database reset script...');
    
    // Execute the reset script
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlScript 
    });
    
    if (error) {
      // If the RPC doesn't exist, try direct SQL execution
      console.log('📋 Trying direct SQL execution...');
      
      // Split the script into individual statements and execute them
      const statements = sqlScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.toLowerCase().includes('delete from')) {
          console.log(`🗑️  Executing: ${statement.substring(0, 50)}...`);
          
          // For DELETE statements, we need to handle them specially
          const tableName = statement.match(/delete from (\w+)/i)?.[1];
          if (tableName) {
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
            
            if (deleteError && !deleteError.message.includes('no rows')) {
              console.warn(`⚠️  Warning deleting from ${tableName}:`, deleteError.message);
            } else {
              console.log(`✅ Cleared table: ${tableName}`);
            }
          }
        }
      }
    } else {
      console.log('✅ Database reset script executed successfully');
    }
    
    // Verify the reset by checking key tables
    console.log('');
    console.log('🔍 Verifying database reset...');
    
    const tables = ['users', 'students', 'consultants', 'consultation_sessions', 'notifications'];
    let allEmpty = true;
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`⚠️  Could not verify ${table}: ${error.message}`);
        } else {
          console.log(`📊 ${table}: ${count || 0} records`);
          if (count && count > 0) {
            allEmpty = false;
          }
        }
      } catch (err) {
        console.log(`⚠️  Could not verify ${table}: ${err.message}`);
      }
    }
    
    console.log('');
    if (allEmpty) {
      console.log('🎉 DATABASE SUCCESSFULLY RESET TO CLEAN STATE!');
      console.log('');
      console.log('✅ The database is now completely clean and ready for:');
      console.log('   • Fresh production deployment');
      console.log('   • Client demonstration');
      console.log('   • Real user registrations');
      console.log('   • Zero test data contamination');
    } else {
      console.log('⚠️  DATABASE RESET MAY BE INCOMPLETE');
      console.log('   Some tables still contain data.');
      console.log('   You may need to manually clean remaining records.');
    }
    
  } catch (error) {
    console.error('💥 Database reset failed:', error);
    process.exit(1);
  }
}

// Execute the reset
resetDatabase();
