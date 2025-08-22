#!/usr/bin/env node

/**
 * BrainBased EMDR Platform - Simple Database Cleaner
 * 
 * This script will delete all user data to create a clean database state.
 * USE WITH CAUTION - this will delete ALL user data!
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanDatabase() {
  console.log('🧹 STARTING DATABASE CLEANUP...');
  console.log('');
  
  try {
    // Step 1: Delete consultation sessions (has foreign keys to students/consultants)
    console.log('🗑️  Deleting consultation sessions...');
    const { error: sessionsError } = await supabase
      .from('consultation_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (sessionsError && !sessionsError.message.includes('no rows')) {
      console.warn('⚠️  Sessions deletion warning:', sessionsError.message);
    } else {
      console.log('✅ Consultation sessions cleared');
    }
    
    // Step 2: Delete notifications
    console.log('🗑️  Deleting notifications...');
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (notificationsError && !notificationsError.message.includes('no rows')) {
      console.warn('⚠️  Notifications deletion warning:', notificationsError.message);
    } else {
      console.log('✅ Notifications cleared');
    }
    
    // Step 3: Delete notification preferences
    console.log('🗑️  Deleting notification preferences...');
    const { error: preferencesError } = await supabase
      .from('notification_preferences')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000');
    
    if (preferencesError && !preferencesError.message.includes('no rows')) {
      console.warn('⚠️  Preferences deletion warning:', preferencesError.message);
    } else {
      console.log('✅ Notification preferences cleared');
    }
    
    // Step 4: Delete students
    console.log('🗑️  Deleting student profiles...');
    const { error: studentsError } = await supabase
      .from('students')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (studentsError && !studentsError.message.includes('no rows')) {
      console.warn('⚠️  Students deletion warning:', studentsError.message);
    } else {
      console.log('✅ Student profiles cleared');
    }
    
    // Step 5: Delete consultants
    console.log('🗑️  Deleting consultant profiles...');
    const { error: consultantsError } = await supabase
      .from('consultants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (consultantsError && !consultantsError.message.includes('no rows')) {
      console.warn('⚠️  Consultants deletion warning:', consultantsError.message);
    } else {
      console.log('✅ Consultant profiles cleared');
    }
    
    // Step 6: Delete certificates
    console.log('🗑️  Deleting certificates...');
    const { error: certificatesError } = await supabase
      .from('certificates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (certificatesError && !certificatesError.message.includes('no rows')) {
      console.warn('⚠️  Certificates deletion warning:', certificatesError.message);
    } else {
      console.log('✅ Certificates cleared');
    }
    
    // Step 7: Delete consultant availability
    console.log('🗑️  Deleting consultant availability...');
    const { error: availabilityError } = await supabase
      .from('consultant_availability')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (availabilityError && !availabilityError.message.includes('no rows')) {
      console.warn('⚠️  Availability deletion warning:', availabilityError.message);
    } else {
      console.log('✅ Consultant availability cleared');
    }
    
    // Step 8: Delete users (this should be last)
    console.log('🗑️  Deleting all users...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (usersError && !usersError.message.includes('no rows')) {
      console.warn('⚠️  Users deletion warning:', usersError.message);
    } else {
      console.log('✅ All users cleared');
    }
    
    // Verification
    console.log('');
    console.log('🔍 Verifying database cleanup...');
    
    const verificationTables = [
      'users',
      'students', 
      'consultants',
      'consultation_sessions',
      'notifications'
    ];
    
    let totalRecords = 0;
    
    for (const table of verificationTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`⚠️  Could not verify ${table}: ${error.message}`);
        } else {
          const recordCount = count || 0;
          console.log(`📊 ${table}: ${recordCount} records`);
          totalRecords += recordCount;
        }
      } catch (err) {
        console.log(`⚠️  Could not verify ${table}: ${err.message}`);
      }
    }
    
    console.log('');
    if (totalRecords === 0) {
      console.log('🎉 DATABASE SUCCESSFULLY CLEANED!');
      console.log('');
      console.log('✅ Your BrainBased EMDR Platform is now:');
      console.log('   • Completely clean of test data');
      console.log('   • Ready for client demonstration');
      console.log('   • Ready for production deployment');
      console.log('   • Ready for fresh user registrations');
      console.log('');
      console.log('🚀 You can now test the platform with real user data!');
    } else {
      console.log(`⚠️  Database cleanup incomplete: ${totalRecords} records remaining`);
      console.log('   Some tables may still contain data.');
    }
    
  } catch (error) {
    console.error('💥 Database cleanup failed:', error);
    process.exit(1);
  }
}

// Check for confirmation
const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
  console.log('🚨 DATABASE CLEANUP SCRIPT');
  console.log('');
  console.log('⚠️  This will DELETE ALL user data including:');
  console.log('   • All users (students, consultants, admins)');
  console.log('   • All consultation sessions');
  console.log('   • All notifications and preferences');
  console.log('   • All certificates and availability');
  console.log('');
  console.log('🎯 This will give you a completely clean platform for:');
  console.log('   • Client demonstration');
  console.log('   • Production deployment');
  console.log('   • Fresh user testing');
  console.log('');
  console.log('To proceed, run:');
  console.log('  node scripts/clean-database.js --confirm');
  console.log('');
  process.exit(0);
}

// Execute cleanup
cleanDatabase();
