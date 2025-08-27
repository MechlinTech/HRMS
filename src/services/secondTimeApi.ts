import { secondSupabase } from './secondSupabase';

// Explicitly export interfaces
export interface TimeEntry {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface UserTimeData {
  totalHoursToday: number;
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  todayEntries: TimeEntry[];
  weeklyEntries: TimeEntry[];
  monthlyEntries: TimeEntry[];
  error?: string; // Optional error message
}

// Export the API object
export const secondTimeApi = {
  // Debug function to check database structure - back to Supabase client
  async debugDatabase(): Promise<void> {
    try {
      console.log('=== DEBUGGING SECOND DATABASE ===');
      
      // Try to access profiles table directly
      try {
        const { data: profileCount, error: countError } = await secondSupabase
          .from('profiles')
          .select('*')
          .limit(5);
        
        if (countError) {
          console.log('Profiles table error:', countError);
        } else {
          console.log('Profiles table accessible, count:', profileCount?.length || 0);
          if (profileCount && profileCount.length > 0) {
            console.log('Sample profile:', profileCount[0]);
          }
        }
      } catch (e) {
        console.log('Profiles table not accessible:', e);
      }
      
      // Try to access time_entries table directly
      try {
        const { data: timeCount, error: timeError } = await secondSupabase
          .from('time_entries')
          .select('*')
          .limit(5);
        
        if (timeError) {
          console.log('Time entries table error:', timeError);
        } else {
          console.log('Time entries table accessible, count:', timeCount?.length || 0);
          if (timeCount && timeCount.length > 0) {
            console.log('Sample time entry:', timeCount[0]);
          }
        }
      } catch (e) {
        console.log('Time entries table not accessible:', e);
      }
      
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.log('Debug function error:', error);
    }
  },

  // Get user ID from profiles table using email - back to Supabase client
  async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      console.log('Looking for email in profiles table:', email);
      
      // First, let's check what's in the profiles table
      console.log('Checking profiles table structure...');
      
      // Try a simple select first
      const { data: allProfiles, error: allError } = await secondSupabase
        .from('profiles')
        .select('*')
        .limit(5);
      
      if (allError) {
        console.error('Error accessing profiles table:', allError);
        return null;
      }
      
      console.log('Profiles table accessible, total profiles found:', allProfiles?.length || 0);
      if (allProfiles && allProfiles.length > 0) {
        console.log('Sample profile structure:', allProfiles[0]);
        console.log('Sample profile email:', allProfiles[0].email);
      }
      
      // Now try our specific query
      console.log('Executing specific query for email:', email);
      const { data: profiles, error: profileError } = await secondSupabase
        .from('profiles')
        .select('id')
        .eq('email', email);

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      console.log('Query result - profiles found:', profiles?.length || 0);
      console.log('Raw query response:', profiles);

      // Check if we got any profiles
      if (profiles && profiles.length > 0) {
        console.log('Found user ID from profiles table:', profiles[0].id);
        return profiles[0].id;
      }

      console.log('Profile not found for email:', email);
      console.log('Profiles returned:', profiles);
      return null;
    } catch (error) {
      console.error('Error in getUserIdByEmail:', error);
      return null;
    }
  },

  // Get latest time entry for a specific user - back to Supabase client
  async getLatestTimeEntry(userId: string): Promise<TimeEntry | null> {
    try {
      console.log('=== getLatestTimeEntry START ===');
      console.log('Fetching latest time entry for user:', userId);
      
      // First, let's check if the table exists and has data
      console.log('Step 1: Checking time_entries table accessibility...');
      
      // Try a simple select first
      const { data: allEntries, error: allError } = await secondSupabase
        .from('time_entries')
        .select('*')
        .limit(5);
      
      console.log('Step 1 Result - allError:', allError);
      console.log('Step 1 Result - allEntries:', allEntries);
      console.log('Step 1 Result - allEntries length:', allEntries?.length || 0);
      
      if (allError) {
        console.error('❌ Error accessing time_entries table:', allError);
        console.log('❌ This suggests the anon key cannot access time_entries table');
        return null;
      }
      
      if (allEntries && allEntries.length > 0) {
        console.log('✅ Time_entries table accessible, total entries found:', allEntries.length);
        console.log('✅ Sample entry structure:', allEntries[0]);
        console.log('✅ Sample entry user_id:', allEntries[0].user_id);
        console.log('✅ Sample entry start_time:', allEntries[0].start_time);
        console.log('✅ Sample entry user_id type:', typeof allEntries[0].user_id);
        console.log('✅ Our userId type:', typeof userId);
        console.log('✅ userId === sample user_id:', userId === allEntries[0].user_id);
      } else {
        console.log('⚠️ Time_entries table accessible but no data found');
      }
      
      // Now try our specific query
      console.log('Step 2: Executing specific query for user:', userId);
      console.log('Step 2: Query: SELECT * FROM time_entries WHERE user_id = ? ORDER BY start_time DESC LIMIT 1');
      
      const { data: entries, error } = await secondSupabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(1);

      console.log('Step 2 Result - error:', error);
      console.log('Step 2 Result - entries:', entries);
      console.log('Step 2 Result - entries length:', entries?.length || 0);

      if (error) {
        console.error('❌ Error fetching latest time entry:', error);
        return null;
      }

      // Check if we got any entries
      if (entries && entries.length > 0) {
        console.log('✅ Latest time entry found:', entries[0]);
        console.log('=== getLatestTimeEntry END ===');
        return entries[0];
      }

      console.log('⚠️ No time entries found for user:', userId);
      console.log('⚠️ This could mean:');
      console.log('   - No entries exist for this user_id');
      console.log('   - user_id format mismatch');
      console.log('   - RLS policies blocking access');
      console.log('=== getLatestTimeEntry END ===');
      return null;
    } catch (error) {
      console.error('❌ Exception in getLatestTimeEntry:', error);
      console.log('=== getLatestTimeEntry END ===');
      return null;
    }
  },

  // Calculate total hours from time entries
  calculateTotalHours(entries: TimeEntry[]): number {
    const now = new Date();
    
    return entries.reduce((total, entry) => {
      // Convert start_time to UTC
      const start = new Date(entry.start_time);
      const startUTC = new Date(start.getTime() + start.getTimezoneOffset() * 60000);
      
      // If end_time exists, convert to UTC; otherwise use current UTC time for ongoing sessions
      let end: Date;
      if (entry.end_time) {
        const endLocal = new Date(entry.end_time);
        end = new Date(endLocal.getTime() + endLocal.getTimezoneOffset() * 60000);
      } else {
        // Use current UTC time for incomplete sessions
        end = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        console.log(`Entry ${entry.id} has no end_time, using current UTC time:`, end.toISOString());
      }
      
      const durationMs = end.getTime() - startUTC.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      // Only count positive durations (avoid future start times)
      if (durationHours > 0) {
        return total + durationHours;
      } else {
        console.log(`Entry ${entry.id} has invalid duration: ${durationHours}h (start UTC: ${startUTC.toISOString()}, end UTC: ${end.toISOString()})`);
        return total;
      }
    }, 0);
  },

  // Get comprehensive time data for a user
  async getUserTimeData(email: string): Promise<UserTimeData | null> {
    try {
      console.log('=== getUserTimeData START ===');
      console.log('Attempting to fetch user ID for email:', email);
      
      const userId = await this.getUserIdByEmail(email);
      console.log('✅ User ID result:', userId);
      
      if (!userId) {
        // console.error('❌ User not found in second database');
        console.log('=== getUserTimeData END ===');
        // Return a proper error response instead of null
        return {
          totalHoursToday: 0,
          totalHoursThisWeek: 0,
          totalHoursThisMonth: 0,
          todayEntries: [],
          weeklyEntries: [],
          monthlyEntries: [],
          error: 'User not found in time tracking database'
        };
      }

      console.log('🔄 Fetching latest time entry for user:', userId);
      console.log('🔄 Calling getLatestTimeEntry...');
      
      const latestEntry = await this.getLatestTimeEntry(userId);
      console.log('🔄 getLatestTimeEntry returned:', latestEntry);
      
      if (!latestEntry) {
        console.log('⚠️ No time entries found for user');
        console.log('=== getUserTimeData END ===');
        return {
          totalHoursToday: 0,
          totalHoursThisWeek: 0,
          totalHoursThisMonth: 0,
          todayEntries: [],
          weeklyEntries: [],
          monthlyEntries: [],
          error: 'No time tracking data found for this user'
        };
      }

      // Check if the latest entry is within 8 hours of current time
      const now = new Date();
      const startTime = new Date(latestEntry.start_time);
      const timeDiffMs = now.getTime() - startTime.getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
      
      console.log('Latest entry start time:', startTime.toISOString());
      console.log('Current time:', now.toISOString());
      console.log('Time difference (hours):', timeDiffHours);

      // Only include the entry if it's within 8 hours
      let todayEntries: TimeEntry[] = [];
      let totalHoursToday = 0;
      
      if (timeDiffHours <= 12 && timeDiffHours >= 0) {
        todayEntries = [latestEntry];
        
        // Calculate duration: current time - start time
        if (latestEntry.end_time) {
          const endTime = new Date(latestEntry.end_time);
          const durationMs = endTime.getTime() - startTime.getTime();
          totalHoursToday = durationMs / (1000 * 60 * 60);
        } else {
          // No end time, use current time
          totalHoursToday = timeDiffHours;
        }
        
        console.log('Entry is within 12 hours, duration:', totalHoursToday, 'hours');
      } else {
        console.log('Entry is outside 12-hour window or in the future');
        return {
          totalHoursToday: 0,
          totalHoursThisWeek: 0,
          totalHoursThisMonth: 0,
          todayEntries: [],
          weeklyEntries: [],
          monthlyEntries: [],
          error: `Latest time entry is ${timeDiffHours.toFixed(1)} hours old (outside 12-hour window)`
        };
      }

      return {
        totalHoursToday,
        totalHoursThisWeek: totalHoursToday,
        totalHoursThisMonth: totalHoursToday,
        todayEntries,
        weeklyEntries: todayEntries,
        monthlyEntries: todayEntries
      };
    } catch (error) {
      console.error('Error in getUserTimeData:', error);
      return null;
    }
  }
};
