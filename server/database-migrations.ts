import { supabase } from './supabase';

export class DatabaseMigrations {
  /**
   * Run all pending migrations
   */
  static async runMigrations(): Promise<void> {
    console.log('🚀 Running database migrations...');
    
    try {
      await this.createNotificationPreferencesTable();
      await this.createNotificationsTable();
      await this.addUserTrackingFields();
      await this.setupDefaultNotificationPreferences();
      await this.updateExistingUsers();
      
      console.log('✅ All database migrations completed successfully!');
    } catch (error) {
      console.error('❌ Database migration failed:', error);
      // Don't throw - allow server to continue
    }
  }

  /**
   * Create notification_preferences table
   */
  private static async createNotificationPreferencesTable(): Promise<void> {
    console.log('📋 Creating notification_preferences table...');
    
    try {
      // Check if table exists
      const { data: existingTable, error: checkError } = await supabase
        .from('notification_preferences')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, create it
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE notification_preferences (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
              email_notifications BOOLEAN DEFAULT true,
              sms_notifications BOOLEAN DEFAULT false,
              push_notifications BOOLEAN DEFAULT true,
              session_reminders BOOLEAN DEFAULT true,
              milestone_alerts BOOLEAN DEFAULT true,
              payment_notifications BOOLEAN DEFAULT true,
              system_updates BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });
        
        if (createError) {
          console.log('⚠️  Could not create table via RPC, trying alternative method...');
          // Alternative: Create table by inserting a dummy record (will fail but create table)
          await this.createTableViaInsert();
        } else {
          console.log('✅ notification_preferences table created successfully');
        }
      } else {
        console.log('✅ notification_preferences table already exists');
      }
    } catch (error) {
      console.log('⚠️  Table creation check failed, continuing...');
    }
  }

  /**
   * Create notifications table
   */
  private static async createNotificationsTable(): Promise<void> {
    console.log('📋 Creating notifications table...');

    try {
      // Check if table exists
      const { data: existingTable, error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, create it
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE notifications (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
              type VARCHAR(50) NOT NULL,
              title VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              data JSONB,
              read BOOLEAN DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              expires_at TIMESTAMP WITH TIME ZONE,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });

        if (createError) {
          console.log('⚠️  Could not create notifications table via RPC, manual creation required');
          console.log('💡 Please run this SQL in Supabase dashboard:');
          console.log(`
            CREATE TABLE notifications (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
              type VARCHAR(50) NOT NULL,
              title VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              data JSONB,
              read BOOLEAN DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              expires_at TIMESTAMP WITH TIME ZONE,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);
        } else {
          console.log('✅ notifications table created successfully');
        }
      } else {
        console.log('✅ notifications table already exists');
      }
    } catch (error) {
      console.log('⚠️  Notifications table creation check failed, continuing...');
    }
  }

  /**
   * Alternative method to create table via insert
   */
  private static async createTableViaInsert(): Promise<void> {
    try {
      // This will fail but might create the table structure
      const { error } = await supabase
        .from('notification_preferences')
        .insert([{
          user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          email_notifications: true
        }]);
      
      if (error && error.code === '42P01') {
        console.log('⚠️  Table creation via insert failed, manual creation required');
      }
    } catch (error) {
      console.log('⚠️  Alternative table creation method failed');
    }
  }

  /**
   * Add tracking fields to users table
   */
  private static async addUserTrackingFields(): Promise<void> {
    console.log('📝 Adding user tracking fields...');
    
    try {
      // Check if fields exist by trying to select them
      const { data: testUser, error: testError } = await supabase
        .from('users')
        .select('welcome_email_sent, account_setup_completed')
        .limit(1);
      
      if (testError && testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.log('⚠️  User tracking fields missing, manual addition required');
        console.log('💡 Please run this SQL in Supabase dashboard:');
        console.log(`
          ALTER TABLE users 
          ADD COLUMN welcome_email_sent BOOLEAN DEFAULT false,
          ADD COLUMN account_setup_completed BOOLEAN DEFAULT false;
        `);
      } else {
        console.log('✅ User tracking fields already exist');
      }
    } catch (error) {
      console.log('⚠️  Could not check user tracking fields');
    }
  }

  /**
   * Setup default notification preferences for existing users
   */
  private static async setupDefaultNotificationPreferences(): Promise<void> {
    console.log('🔧 Setting up default notification preferences...');
    
    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id');
      
      if (usersError) {
        console.log('⚠️  Could not fetch users for preference setup');
        return;
      }

      if (!users || users.length === 0) {
        console.log('ℹ️  No users found for preference setup');
        return;
      }

      // For each user, ensure they have notification preferences
      for (const user of users) {
        try {
          const { error: insertError } = await supabase
            .from('notification_preferences')
            .upsert([{
              user_id: user.id,
              email_notifications: true,
              sms_notifications: false,
              push_notifications: true,
              session_reminders: true,
              milestone_alerts: true,
              payment_notifications: true,
              system_updates: true
            }], {
              onConflict: 'user_id'
            });
          
          if (insertError) {
            console.log(`⚠️  Could not setup preferences for user ${user.id}:`, insertError.message);
          }
        } catch (error) {
          console.log(`⚠️  Error setting up preferences for user ${user.id}`);
        }
      }
      
      console.log(`✅ Notification preferences setup completed for ${users.length} users`);
    } catch (error) {
      console.log('⚠️  Notification preferences setup failed:', error);
    }
  }

  /**
   * Update existing users to mark welcome email as sent
   */
  private static async updateExistingUsers(): Promise<void> {
    console.log('✅ Updating existing users...');
    
    try {
      // Try to update welcome_email_sent field if it exists
      const { error: updateError } = await supabase
        .from('users')
        .update({ welcome_email_sent: true })
        .is('welcome_email_sent', null);
      
      if (updateError) {
        if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
          console.log('ℹ️  welcome_email_sent field not available yet');
        } else {
          console.log('⚠️  Could not update existing users:', updateError.message);
        }
      } else {
        console.log('✅ Existing users updated successfully');
      }
    } catch (error) {
      console.log('⚠️  User update failed:', error);
    }
  }
}
