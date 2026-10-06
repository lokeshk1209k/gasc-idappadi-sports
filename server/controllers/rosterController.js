const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const { storeInstance } = require('../data/localStore');

function syncRosterJsonFiles(rosterList) {
  try {
    const payload = JSON.stringify({
      success: true,
      count: rosterList.length,
      roster: rosterList
    }, null, 2);
    const rootDir = path.join(__dirname, '../..');
    const targets = [
      path.join(rootDir, 'student-client/public/roster.json'),
      path.join(rootDir, 'student-client/dist/roster.json'),
      path.join(rootDir, 'public/roster.json'),
      path.join(rootDir, 'dist/roster.json'),
      path.join(rootDir, 'client/public/roster.json')
    ];
    targets.forEach(t => {
      try {
        const dir = path.dirname(t);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(t, payload, 'utf8');
      } catch (e) {}
    });
  } catch (err) {}
}

// Helper function to map flexible column headers
function normalizeKeys(row) {
  const normalized = {};
  for (const key of Object.keys(row)) {
    const cleanKey = key.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = row[key];
  }
  return normalized;
}

function extractStudentFromRow(row) {
  const norm = normalizeKeys(row);

  // Find Register Number
  const regNo = norm['registerno'] || norm['registernumber'] || norm['regno'] || norm['rollno'] || norm['rollnumber'] || norm['register'] || norm['reg'] || '';
  
  // Find Name
  const name = norm['studentname'] || norm['name'] || norm['candidatename'] || norm['fullname'] || norm['student'] || '';

  // Find Department
  let dept = norm['department'] || norm['dept'] || norm['branch'] || norm['course'] || 'Computer Science';
  dept = dept.toString().trim();

  // PG Departments First (to avoid partial regex clashes)
  if (/m\.?com/i.test(dept)) dept = 'M.Com';
  else if (/m\.?a\.?\s*tam/i.test(dept)) dept = 'MA Tamil';
  else if (/m\.?a\.?\s*eng/i.test(dept)) dept = 'MA English';
  else if (/m\.?(sc|a)\.?\s*math/i.test(dept)) dept = 'MA Maths';
  else if (/m\.?b\.?a|b\.?m\.?a/i.test(dept)) dept = 'BMA';
  // UG Departments
  else if (/bot|botany|b\.?sc\s*bot/i.test(dept)) dept = 'Botany';
  else if (/cs|comp|b\.?sc\s*cs/i.test(dept)) dept = 'Computer Science';
  else if (/^com|b\.?com/i.test(dept)) dept = 'B.Com';
  else if (/math|b\.?sc\s*math/i.test(dept)) dept = 'Maths';
  else if (/eng|b\.?a\s*eng/i.test(dept)) dept = 'English';
  else if (/tam|b\.?a\s*tam/i.test(dept)) dept = 'Tamil';
  else if (/phy|b\.?sc\s*phy/i.test(dept)) dept = 'Physics';
  else if (/chem|b\.?sc\s*chem/i.test(dept)) dept = 'Chemistry';
  else if (/bba/i.test(dept)) dept = 'BBA';

  // Find Year (UG: I, II, III Year | PG: I, II PG)
  let year = norm['year'] || norm['yearofstudy'] || norm['batch'] || norm['currentyear'] || 'I Year';
  year = year.toString().trim();
  if (/i\s*pg|1\s*pg/i.test(year)) year = 'I PG';
  else if (/ii\s*pg|2\s*pg/i.test(year)) year = 'II PG';
  else if (/^1|first|i(?!\w)/i.test(year)) year = 'I Year';
  else if (/^2|second|ii(?!\w)/i.test(year)) year = 'II Year';
  else if (/^3|third|iii(?!\w)/i.test(year)) year = 'III Year';

  // Find Section
  let section = norm['section'] || norm['sec'] || 'A';
  section = section.toString().trim().toUpperCase().substring(0, 5) || 'A';

  // Find Gender
  let gender = norm['gender'] || norm['sex'] || 'Male';
  gender = gender.toString().trim();
  if (/^f/i.test(gender)) gender = 'Female';
  else if (/^m/i.test(gender)) gender = 'Male';
  else gender = 'Other';

  if (!regNo || !name) return null;

  return {
    register_number: regNo.toString().trim().toUpperCase(),
    name: name.toString().trim(),
    department: dept,
    year,
    section,
    gender
  };
}

// @desc    Upload & parse Excel / CSV student roster
// @route   POST /api/roster/upload
// @access  Private (Admin only)
exports.uploadExcelRoster = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an Excel (.xlsx, .xls) or CSV file to upload.' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp excel file:', err);
    });

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty or has no readable rows.' });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    let localRoster = storeInstance.getTable('college_student_roster') || [];

    for (const row of sheetData) {
      const student = extractStudentFromRow(row);
      if (!student || !student.register_number) {
        skippedCount++;
        continue;
      }

      // Check if user has already created a real login account
      let userExists = null;
      try {
        const { data: u } = await supabase
          .from('users')
          .select('id, role, password')
          .ilike('register_number', student.register_number)
          .maybeSingle();
        if (u && u.role === 'student' && u.password) {
          userExists = u;
        }
      } catch (e) {}

      const cleanReg = student.register_number.toUpperCase();
      const existingIdx = localRoster.findIndex(r => (r.register_number || '').toUpperCase() === cleanReg);

      const record = {
        id: existingIdx >= 0 ? localRoster[existingIdx].id : `ros_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        register_number: cleanReg,
        name: student.name,
        department: student.department,
        year: student.year,
        section: student.section,
        gender: student.gender,
        is_registered: !!userExists,
        registered_user_id: userExists ? userExists.id : null,
        updated_at: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        localRoster[existingIdx] = { ...localRoster[existingIdx], ...record };
        updatedCount++;
      } else {
        record.created_at = new Date().toISOString();
        localRoster.push(record);
        insertedCount++;
      }

      // Real-time sync to Supabase
      try {
        if (!userExists) {
          const rosterUser = {
            id: `roster_${record.register_number}`,
            name: record.name,
            register_number: record.register_number,
            email: `${record.register_number.toLowerCase()}@roster.internal`,
            role: 'roster',
            department: record.department,
            year: record.year,
            section: record.section,
            gender: record.gender,
            status: 'Pending Registration',
            created_at: new Date().toISOString()
          };
          await supabase.from('users').upsert(rosterUser);
        }

        // Real-time sync to notifications table (100% accessible to student-client via anon key)
        const notifRecord = {
          id: `roster_${record.register_number}`,
          title: record.register_number,
          category: 'roster',
          type: 'roster_student',
          target_type: record.department || 'Computer Science',
          target_audience: record.year || 'I Year',
          priority: record.gender || 'Male',
          sender: record.is_registered ? 'registered' : 'unregistered',
          message: JSON.stringify({
            registerNumber: record.register_number,
            name: record.name,
            department: record.department,
            year: record.year,
            section: record.section,
            gender: record.gender,
            isRegistered: !!record.is_registered
          })
        };
        await supabase.from('notifications').upsert(notifRecord, { onConflict: 'id' });
      } catch (e) {}
    }

    storeInstance.db['college_student_roster'] = localRoster;
    storeInstance.save();
    syncRosterJsonFiles(localRoster);

    const totalStudents = localRoster.length;
    const registeredCount = localRoster.filter(r => r.is_registered).length;

    res.json({
      success: true,
      message: `Excel import successful! Added ${insertedCount} new, updated ${updatedCount} existing records.`,
      stats: {
        insertedCount,
        updatedCount,
        skippedCount,
        totalInRoster: totalStudents,
        registeredCount: registeredCount,
        pendingCount: totalStudents - registeredCount
      }
    });
  } catch (error) {
    console.error('Error importing Excel roster:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process Excel file.' });
  }
};

// @desc    Get all students in official roster
// @route   GET /api/roster
// @access  Private (Admin only)
exports.getRosterStudents = async (req, res) => {
  try {
    const { search, department, year, status } = req.query;

    let students = null;
    let totalCount = 0;
    let registeredCount = 0;

    // 1. Try Supabase
    try {
      let query = supabase.from('college_student_roster').select('*');

      if (search) {
        query = query.or(`register_number.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%`);
      }

      if (department && department !== 'All') {
        if (department === 'Maths' || department === 'Mathematics') {
          query = query.in('department', ['Maths', 'Mathematics']);
        } else if (department === 'B.Com' || department === 'Commerce' || department === 'B COM') {
          query = query.in('department', ['B.Com', 'Commerce', 'B COM']);
        } else if (department === 'BBA' || department === 'Business Administration') {
          query = query.in('department', ['BBA', 'Business Administration']);
        } else if (department === 'BMA' || department === 'MBA') {
          query = query.in('department', ['BMA', 'MBA']);
        } else if (department === 'M.Com' || department === 'MCOM') {
          query = query.in('department', ['M.Com', 'MCOM']);
        } else if (department === 'MA Tamil' || department === 'M.A. Tamil') {
          query = query.in('department', ['MA Tamil', 'M.A. Tamil']);
        } else if (department === 'MA English' || department === 'M.A. English') {
          query = query.in('department', ['MA English', 'M.A. English']);
        } else if (department === 'MA Maths' || department === 'M.Sc. Mathematics') {
          query = query.in('department', ['MA Maths', 'M.Sc. Mathematics']);
        } else {
          query = query.eq('department', department);
        }
      }

      if (year && year !== 'All') {
        query = query.eq('year', year);
      }

      if (status === 'registered') {
        query = query.eq('is_registered', true);
      } else if (status === 'unregistered') {
        query = query.eq('is_registered', false);
      }

      query = query.order('register_number', { ascending: true });

      const { data: studentsRaw, error } = await query;
      if (!error && studentsRaw && studentsRaw.length > 0) {
        students = studentsRaw.map(toCamelCase);
        const { count: tc } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true });
        const { count: rc } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true }).eq('is_registered', true);
        totalCount = tc || students.length;
        registeredCount = rc || 0;
      }
    } catch (e) {
      // Supabase table not created yet, fall through to localStore
    }

    // 2. Fallback to localStore
    if (!students) {
      let allRoster = storeInstance.getTable('college_student_roster') || [];

      // Update is_registered status by checking registered users
      let userRegNos = new Set();
      try {
        const { data: supUsers } = await supabase.from('users').select('register_number');
        if (supUsers && supUsers.length > 0) {
          supUsers.forEach(u => {
            if (u.register_number) userRegNos.add(u.register_number.trim().toUpperCase());
          });
        }
      } catch(e) {}

      if (userRegNos.size === 0) {
        const allUsers = storeInstance.getTable('users') || [];
        allUsers.forEach(u => {
          const rn = u.register_number || u.registerNumber;
          if (rn) userRegNos.add(rn.trim().toUpperCase());
        });
      }

      allRoster = allRoster.map(s => {
        const regNo = (s.register_number || s.registerNumber || '').trim().toUpperCase();
        const isReg = s.is_registered || s.isRegistered || userRegNos.has(regNo);
        return {
          ...s,
          is_registered: isReg,
          isRegistered: isReg
        };
      });

      totalCount = allRoster.length;
      registeredCount = allRoster.filter(s => s.is_registered || s.isRegistered).length;

      let filtered = [...allRoster];
      if (search) {
        const sLower = search.trim().toLowerCase();
        filtered = filtered.filter(s =>
          (s.register_number || s.registerNumber || '').toLowerCase().includes(sLower) ||
          (s.name || '').toLowerCase().includes(sLower)
        );
      }
      if (department && department !== 'All') {
        const dLower = department.trim().toLowerCase();
        filtered = filtered.filter(s => (s.department || '').toLowerCase().includes(dLower));
      }
      if (year && year !== 'All') {
        filtered = filtered.filter(s => (s.year || '').toLowerCase() === year.toLowerCase());
      }
      if (status === 'registered') {
        filtered = filtered.filter(s => s.is_registered || s.isRegistered);
      } else if (status === 'unregistered') {
        filtered = filtered.filter(s => !s.is_registered && !s.isRegistered);
      }

      filtered.sort((a, b) => (a.register_number || a.registerNumber || '').localeCompare(b.register_number || b.registerNumber || ''));
      students = filtered.map(toCamelCase);
    }

    res.json({
      success: true,
      students,
      totalCount: totalCount || students.length,
      registeredCount: registeredCount || 0,
      pendingCount: (totalCount || students.length) - (registeredCount || 0)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add single student to roster manually
// @route   POST /api/roster/manual
// @access  Private (Admin only)
exports.addSingleStudent = async (req, res) => {
  try {
    const { registerNumber, name, department, year, section, gender, status } = req.body;
    if (!registerNumber || !name) {
      return res.status(400).json({ success: false, message: 'Register Number and Student Name are required.' });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();
    const studentStatus = (status && status.toUpperCase() === 'INACTIVE') ? 'Inactive' : 'Active';
    let localRoster = storeInstance.getTable('college_student_roster') || [];

    if (localRoster.some(r => (r.register_number || '').toUpperCase() === cleanRegNo)) {
      return res.status(400).json({ success: false, message: `Student with Register No "${cleanRegNo}" is already in the roster.` });
    }

    let userExists = null;
    try {
      const { data: u } = await supabase
        .from('users')
        .select('id, role, password')
        .ilike('register_number', cleanRegNo)
        .maybeSingle();
      if (u && u.role === 'student' && u.password) {
        userExists = u;
      }
    } catch (e) {}

    const newRecord = {
      id: `ros_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      register_number: cleanRegNo,
      name: name.trim(),
      department: department || 'Computer Science',
      year: year || 'I Year',
      section: section ? section.trim().toUpperCase() : 'A',
      gender: gender || 'Male',
      status: studentStatus,
      is_registered: !!userExists,
      registered_user_id: userExists ? userExists.id : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localRoster.push(newRecord);
    storeInstance.db['college_student_roster'] = localRoster;
    storeInstance.save();
    syncRosterJsonFiles(localRoster);

    // Instant real-time sync to Supabase so Student Portal detects it the very next second!
    try {
      const rosterUser = {
        id: `roster_${cleanRegNo}`,
        name: newRecord.name,
        register_number: cleanRegNo,
        email: `${cleanRegNo.toLowerCase()}@roster.internal`,
        role: 'roster',
        department: newRecord.department,
        year: newRecord.year,
        section: newRecord.section,
        gender: newRecord.gender,
        status: studentStatus === 'Inactive' ? 'Inactive' : 'Pending Registration',
        created_at: new Date().toISOString()
      };
      await supabase.from('users').upsert(rosterUser);

      // Real-time sync to notifications table (100% accessible to student-client via anon key)
      const notifRecord = {
        id: `roster_${cleanRegNo}`,
        title: cleanRegNo,
        category: 'roster',
        type: 'roster_student',
        target_type: newRecord.department || 'Computer Science',
        target_audience: newRecord.year || 'I Year',
        priority: newRecord.gender || 'Male',
        sender: newRecord.is_registered ? 'registered' : 'unregistered',
        message: JSON.stringify({
          registerNumber: cleanRegNo,
          name: newRecord.name,
          department: newRecord.department,
          year: newRecord.year,
          section: newRecord.section,
          gender: newRecord.gender,
          status: studentStatus,
          isRegistered: !!newRecord.is_registered
        })
      };
      await supabase.from('notifications').upsert(notifRecord, { onConflict: 'id' });
    } catch (e) {
      console.warn('Real-time Supabase roster user sync error:', e.message);
    }

    const totalCount = localRoster.length;
    const registeredCount = localRoster.filter(r => r.is_registered).length;

    res.status(201).json({
      success: true,
      message: `Student "${newRecord.name}" (${newRecord.register_number}) successfully added to college roster!`,
      student: toCamelCase(newRecord),
      stats: {
        totalCount,
        registeredCount,
        pendingCount: totalCount - registeredCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete student from roster
// @route   DELETE /api/roster/:id
// @access  Private (Admin only)
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    let localRoster = storeInstance.getTable('college_student_roster') || [];
    const target = localRoster.find(r => r.id === id || r.register_number === id);

    if (!target) {
      return res.status(404).json({ success: false, message: 'Student not found in roster.' });
    }

    storeInstance.db['college_student_roster'] = localRoster.filter(r => r.id !== id && r.register_number !== id);
    storeInstance.save();

    try {
      await supabase.from('users').delete().eq('register_number', target.register_number).eq('role', 'roster');
      await supabase.from('notifications').delete().eq('id', `roster_${target.register_number}`);
    } catch (e) {}

    const updatedRoster = storeInstance.db['college_student_roster'];
    const totalCount = updatedRoster.length;
    const registeredCount = updatedRoster.filter(r => r.is_registered).length;

    res.json({
      success: true,
      message: `Removed ${target.name} (${target.register_number}) from college roster.`,
      stats: {
        totalCount,
        registeredCount,
        pendingCount: totalCount - registeredCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student in roster
// @route   PUT /api/roster/:id
// @access  Private (Admin only)
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { registerNumber, name, department, year, section, gender, status } = req.body;

    let localRoster = storeInstance.getTable('college_student_roster') || [];
    const idx = localRoster.findIndex(r => r.id === id || r.register_number === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Student not found in roster.' });
    }

    if (name) localRoster[idx].name = name.trim();
    if (registerNumber) localRoster[idx].register_number = registerNumber.trim().toUpperCase();
    if (department) localRoster[idx].department = department;
    if (year) localRoster[idx].year = year;
    if (section !== undefined) localRoster[idx].section = section.trim().toUpperCase() || 'A';
    if (gender) localRoster[idx].gender = gender;
    if (status !== undefined) localRoster[idx].status = status.toUpperCase() === 'INACTIVE' ? 'Inactive' : 'Active';
    localRoster[idx].updated_at = new Date().toISOString();

    storeInstance.save();

    try {
      const reg = localRoster[idx].register_number;
      const curStatus = localRoster[idx].status || 'Active';
      await supabase.from('users').update({
        status: curStatus === 'Inactive' ? 'Inactive' : 'Active',
        name: localRoster[idx].name,
        department: localRoster[idx].department,
        year: localRoster[idx].year,
        gender: localRoster[idx].gender
      }).eq('register_number', reg);

      const notifRecord = {
        id: `roster_${reg}`,
        title: reg,
        category: 'roster',
        type: 'roster_student',
        target_type: localRoster[idx].department || 'Computer Science',
        target_audience: localRoster[idx].year || 'I Year',
        priority: localRoster[idx].gender || 'Male',
        sender: localRoster[idx].is_registered ? 'registered' : 'unregistered',
        message: JSON.stringify({
          registerNumber: reg,
          name: localRoster[idx].name,
          department: localRoster[idx].department,
          year: localRoster[idx].year,
          section: localRoster[idx].section,
          gender: localRoster[idx].gender,
          status: curStatus,
          isRegistered: !!localRoster[idx].is_registered
        })
      };
      await supabase.from('notifications').upsert(notifRecord, { onConflict: 'id' });
    } catch (e) {}

    res.json({
      success: true,
      message: `Student "${localRoster[idx].name}" (${localRoster[idx].register_number}) updated successfully!`,
      student: toCamelCase(localRoster[idx])
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle student Active/Inactive status
// @route   PUT /api/roster/:id/status or PATCH /api/roster/:id/status
// @access  Private (Admin only)
exports.toggleStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let localRoster = storeInstance.getTable('college_student_roster') || [];
    const idx = localRoster.findIndex(r => r.id === id || r.register_number === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Student not found in roster.' });
    }

    const newStatus = status 
      ? (status.toUpperCase() === 'INACTIVE' ? 'Inactive' : 'Active')
      : ((localRoster[idx].status || 'Active') === 'Active' ? 'Inactive' : 'Active');

    localRoster[idx].status = newStatus;
    localRoster[idx].updated_at = new Date().toISOString();
    storeInstance.save();

    const reg = localRoster[idx].register_number;

    // Real-time Supabase sync
    try {
      await supabase.from('users').update({
        status: newStatus
      }).eq('register_number', reg);

      const notifRecord = {
        id: `roster_${reg}`,
        title: reg,
        category: 'roster',
        type: 'roster_student',
        target_type: localRoster[idx].department || 'Computer Science',
        target_audience: localRoster[idx].year || 'I Year',
        priority: localRoster[idx].gender || 'Male',
        sender: localRoster[idx].is_registered ? 'registered' : 'unregistered',
        message: JSON.stringify({
          registerNumber: reg,
          name: localRoster[idx].name,
          department: localRoster[idx].department,
          year: localRoster[idx].year,
          section: localRoster[idx].section,
          gender: localRoster[idx].gender,
          status: newStatus,
          isRegistered: !!localRoster[idx].is_registered
        })
      };
      await supabase.from('notifications').upsert(notifRecord, { onConflict: 'id' });
    } catch (e) {
      console.warn('Status toggle Supabase sync error:', e);
    }

    res.json({
      success: true,
      message: `Student "${localRoster[idx].name}" (${reg}) status changed to ${newStatus.toUpperCase()}`,
      student: toCamelCase(localRoster[idx])
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download sample Excel roster template (.xlsx)
// @route   GET /api/roster/template
// @access  Private (Admin only)
exports.downloadTemplate = async (req, res) => {
  try {
    const sampleRows = [
      { 'Register Number': '24UGTA101', 'Student Name': 'Anbarasan M', 'Department': 'Tamil', 'Year': 'I Year', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '24UGEN101', 'Student Name': 'Deepika S', 'Department': 'English', 'Year': 'I Year', 'Section': 'A', 'Gender': 'Female' },
      { 'Register Number': '23UGMA101', 'Student Name': 'Karthik R', 'Department': 'Maths', 'Year': 'II Year', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '23UGPH101', 'Student Name': 'Sanjay V', 'Department': 'Physics', 'Year': 'II Year', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '23UGCH101', 'Student Name': 'Kavitha R', 'Department': 'Chemistry', 'Year': 'II Year', 'Section': 'A', 'Gender': 'Female' },
      { 'Register Number': '23UGBO101', 'Student Name': 'Praveen T', 'Department': 'Botany', 'Year': 'II Year', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '22UGBA101', 'Student Name': 'Naveen Prasath S', 'Department': 'BBA', 'Year': 'III Year', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '22UGCS101', 'Student Name': 'Arun Kumar S', 'Department': 'Computer Science', 'Year': 'III Year', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '22UGCO101', 'Student Name': 'Manoj K', 'Department': 'B.Com', 'Year': 'III Year', 'Section': 'B', 'Gender': 'Male' },
      { 'Register Number': '25PGMC101', 'Student Name': 'Gowtham N', 'Department': 'M.Com', 'Year': 'I PG', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '25PGTA101', 'Student Name': 'Murugan P', 'Department': 'MA Tamil', 'Year': 'I PG', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '25PGEN101', 'Student Name': 'Pooja K', 'Department': 'MA English', 'Year': 'I PG', 'Section': 'A', 'Gender': 'Female' },
      { 'Register Number': '24PGMA101', 'Student Name': 'Suresh V', 'Department': 'MA Maths', 'Year': 'II PG', 'Section': 'A', 'Gender': 'Male' },
      { 'Register Number': '24PGBA101', 'Student Name': 'Vigneshwaran T', 'Department': 'BMA', 'Year': 'II PG', 'Section': 'A', 'Gender': 'Male' }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleRows);
    
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 }
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Students_Roster');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="gasc_idappadi_students_roster_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel template.' });
  }
};
