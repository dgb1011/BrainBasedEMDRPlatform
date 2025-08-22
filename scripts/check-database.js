#!/usr/bin/env node

/**
 * BrainBased EMDR Platform - Database State Checker
 * 
 * This script checks the current state of the database
 * and provides a summary of all data.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDatabaseState() {
  console.log('🔍 CHECKING DATABASE STATE...');
  console.log('');
  
  const tables = [
    { name: 'users', description: 'All platform users' },
    { name: 'students', description: 'Student profiles' },
    { name: 'consultants', description: 'Consultant profiles' },
    { name: 'consultation_sessions', description: 'Consultation sessions' },
    { name: 'notifications', description: 'User notifications' },
    { name: 'notification_preferences', description: 'Notification settings' },
    { name: 'certificates', description: 'Generated certificates' },
    { name: 'consultant_availability', description: 'Consultant schedules' }
  ];
  
  let totalRecords = 0;
  let hasData = false;
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`⚠️  ${table.name}: Could not check (${error.message})`);
      } else {
        const recordCount = count || 0;
        const status = recordCount === 0 ? '✅' : '📊';
        console.log(`${status} ${table.name.padEnd(25)} ${recordCount.toString().padStart(4)} records - ${table.description}`);
        totalRecords += recordCount;
        if (recordCount > 0) hasData = true;
      }
    } catch (err) {
      console.log(`⚠️  ${table.name}: Error checking (${err.message})`);
    }
  }
  
  console.log('');
  console.log(`📊 TOTAL RECORDS: ${totalRecords}`);
  console.log('');
  
  if (totalRecords === 0) {
    console.log('🎉 DATABASE IS COMPLETELY CLEAN!');
    console.log('');
    console.log('✅ Perfect for:');
    console.log('   • Client demonstration');
    console.log('   • Production deployment');  
    console.log('   • Fresh user registrations');
    console.log('   • Zero test data contamination');
  } else if (hasData) {
    console.log('📋 DATABASE CONTAINS DATA');
    console.log('');
    console.log('This includes seeded/test data that you may want to clean.');
    console.log('');
    console.log('To clean the database, run:');
    console.log('  node scripts/clean-database.js --confirm');
  }
  
  // Check for some sample users to show what data exists
  if (hasData) {
    console.log('');
    console.log('📋 SAMPLE DATA PREVIEW:');
    
    try {
      const { data: sampleUsers, error } = await supabase
        .from('users')
        .select('email, first_name, last_name, role, created_at')
        .limit(5);
      
      if (!error && sampleUsers && sampleUsers.length > 0) {
        console.log('');
        console.log('👥 Sample Users:');
        sampleUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email}) - ${user.role}`);
        });
      }
    } catch (err) {
      // Ignore sample data errors
    }
  }
}

checkDatabaseState();
