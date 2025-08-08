import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://sqisjjtapmujcjmxlzjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxaXNqanRhcG11amNqbXhsemp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyODg3MywiZXhwIjoyMDY5OTA0ODczfQ.yvLUzfOx73P8ITSeN0gKp5r_umxfAcXf1RYyGMVL_1M';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running migration to add password_hash column...');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync('supabase/migrations/add_password_hash_and_bypass_auth.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err.message);
      }
    }
    
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
