require('dotenv').config();
const { supabase, isSupabaseConfigured } = require('../config/supabase');
const connectDB = require('../config/db');

// MongoDB Models
const User = require('../models/User');
const Sport = require('../models/Sport');
const Equipment = require('../models/Equipment');
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const Achievement = require('../models/Achievement');
const Notification = require('../models/Notification');
const Gallery = require('../models/Gallery');
const AdminSettings = require('../models/AdminSettings');
const CollegeStudentRoster = require('../models/CollegeStudentRoster');

async function runSync() {
  console.log('\n===============================================================');
  console.log('⚡ SUPABASE DATABASE SYNC & CONNECTION UTILITY');
  console.log('🏛️ GASC Idappadi Sports Management System');
  console.log('===============================================================\n');

  if (!isSupabaseConfigured()) {
    console.error('❌ Error: Supabase credentials are missing or invalid in .env!');
    console.log('\n👉 Please open .env file and set:');
    console.log('SUPABASE_URL=https://<your-project-ref>.supabase.co');
    console.log('SUPABASE_ANON_KEY=<your-anon-or-service-role-key>\n');
    process.exit(1);
  }

  console.log('🔍 Testing Supabase connection...');
  const { data: testData, error: testErr } = await supabase.from('admin_settings').select('*').limit(1);

  if (testErr) {
    console.error('\n❌ Supabase Connection Failed:', testErr.message);
    console.log('\n💡 Tip: Please make sure you have:');
    console.log('1. Created a Supabase project at https://supabase.com');
    console.log('2. Opened Supabase SQL Editor and executed the queries from "supabase_schema.sql"');
    console.log('3. Pasted correct SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.\n');
    process.exit(1);
  }

  console.log('✅ Supabase connected successfully!');
  console.log('🔄 Connecting to MongoDB to fetch local data for syncing...');

  try {
    await connectDB();

    // 1. Sync Sports
    const sports = await Sport.find().lean();
    console.log(`\n📦 Syncing ${sports.length} Sports to Supabase...`);
    for (const s of sports) {
      await supabase.from('sports').upsert({
        name: s.name,
        description: s.description,
        category: s.category,
        indoor_outdoor: s.indoorOutdoor,
        player_count: s.playerCount,
        coach: s.coach,
        rules: s.rules,
        icon: s.icon,
        status: s.status
      }, { onConflict: 'name' });
    }
    console.log('✅ Sports synced!');

    // 2. Sync Admin Settings
    const settings = await AdminSettings.findOne().lean();
    if (settings) {
      console.log('📦 Syncing Admin Settings to Supabase...');
      await supabase.from('admin_settings').upsert({
        college_name: settings.collegeName,
        department_name: settings.departmentName,
        sports_incharge_name: settings.sportsInchargeName,
        sports_incharge_role: settings.sportsInchargeRole,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
        office_hours: settings.officeHours
      });
      console.log('✅ Admin Settings synced!');
    }

    // 3. Sync Roster
    const roster = await CollegeStudentRoster.find().lean();
    if (roster.length > 0) {
      console.log(`📦 Syncing ${roster.length} Student Roster records to Supabase...`);
      for (const r of roster) {
        await supabase.from('college_student_roster').upsert({
          register_number: r.registerNumber,
          name: r.name,
          department: r.department,
          year: r.year,
          section: r.section,
          gender: r.gender,
          college_name: r.collegeName,
          is_registered: r.isRegistered
        }, { onConflict: 'register_number' });
      }
      console.log('✅ Roster records synced!');
    }

    console.log('\n🎉 ALL DATA SUCCESSFULLY SYNCED TO SUPABASE!\n');
    process.exit(0);
  } catch (err) {
    console.error('⚠️ Sync encountered an issue:', err.message);
    process.exit(1);
  }
}

runSync();
