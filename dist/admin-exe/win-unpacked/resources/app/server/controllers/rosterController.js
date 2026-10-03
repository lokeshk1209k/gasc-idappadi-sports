const xlsx = require('xlsx');
const fs = require('fs');
const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

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

    for (const row of sheetData) {
      const student = extractStudentFromRow(row);
      if (!student || !student.register_number) {
        skippedCount++;
        continue;
      }

      // Check if user has already created a login account
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .ilike('register_number', student.register_number)
        .single();

      // Check if already in roster
      const { data: existing } = await supabase
        .from('college_student_roster')
        .select('id')
        .ilike('register_number', student.register_number)
        .single();

      if (existing) {
        await supabase
          .from('college_student_roster')
          .update({
            name: student.name,
            department: student.department,
            year: student.year,
            section: student.section,
            gender: student.gender,
            is_registered: !!userExists,
            registered_user_id: userExists ? userExists.id : null
          })
          .eq('id', existing.id);
        updatedCount++;
      } else {
        await supabase
          .from('college_student_roster')
          .insert({
            ...student,
            is_registered: !!userExists,
            registered_user_id: userExists ? userExists.id : null
          });
        insertedCount++;
      }
    }

    const { count: totalStudents } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true });
    const { count: registeredCount } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true }).eq('is_registered', true);

    res.json({
      success: true,
      message: `Excel import successful! Added ${insertedCount} new, updated ${updatedCount} existing records.`,
      stats: {
        insertedCount,
        updatedCount,
        skippedCount,
        totalInRoster: totalStudents || 0,
        registeredCount: registeredCount || 0,
        pendingCount: (totalStudents || 0) - (registeredCount || 0)
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

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const { count: totalCount } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true });
    const { count: registeredCount } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true }).eq('is_registered', true);

    const students = (studentsRaw || []).map(toCamelCase);

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
    const { registerNumber, name, department, year, section, gender } = req.body;
    if (!registerNumber || !name) {
      return res.status(400).json({ success: false, message: 'Register Number and Student Name are required.' });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();
    const { data: existing } = await supabase
      .from('college_student_roster')
      .select('id')
      .ilike('register_number', cleanRegNo)
      .single();

    if (existing) {
      return res.status(400).json({ success: false, message: `Student with Register No "${cleanRegNo}" is already in the roster.` });
    }

    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .ilike('register_number', cleanRegNo)
      .single();

    const newRecord = {
      register_number: cleanRegNo,
      name: name.trim(),
      department: department || 'Computer Science',
      year: year || 'I Year',
      section: section ? section.trim().toUpperCase() : 'A',
      gender: gender || 'Male',
      is_registered: !!userExists,
      registered_user_id: userExists ? userExists.id : null
    };

    const { data: createdRaw, error } = await supabase
      .from('college_student_roster')
      .insert(newRecord)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const { count: totalCount } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true });
    const { count: registeredCount } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true }).eq('is_registered', true);

    res.status(201).json({
      success: true,
      message: `Student "${createdRaw.name}" (${createdRaw.register_number}) successfully added to college roster!`,
      student: toCamelCase(createdRaw),
      stats: {
        totalCount: totalCount || 0,
        registeredCount: registeredCount || 0,
        pendingCount: (totalCount || 0) - (registeredCount || 0)
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

    const { data: studentRaw, error } = await supabase
      .from('college_student_roster')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !studentRaw) {
      return res.status(404).json({ success: false, message: 'Student not found in roster.' });
    }

    const { count: totalCount } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true });
    const { count: registeredCount } = await supabase.from('college_student_roster').select('*', { count: 'exact', head: true }).eq('is_registered', true);

    res.json({
      success: true,
      message: `Removed ${studentRaw.name} (${studentRaw.register_number}) from college roster.`,
      stats: {
        totalCount: totalCount || 0,
        registeredCount: registeredCount || 0,
        pendingCount: (totalCount || 0) - (registeredCount || 0)
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
    const { registerNumber, name, department, year, section, gender } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (registerNumber) updates.register_number = registerNumber.trim().toUpperCase();
    if (department) updates.department = department;
    if (year) updates.year = year;
    if (section !== undefined) updates.section = section.trim().toUpperCase() || 'A';
    if (gender) updates.gender = gender;

    const { data: updatedRaw, error } = await supabase
      .from('college_student_roster')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedRaw) {
      return res.status(404).json({ success: false, message: 'Student not found in roster.' });
    }

    res.json({
      success: true,
      message: `Student "${updatedRaw.name}" (${updatedRaw.register_number}) updated successfully!`,
      student: toCamelCase(updatedRaw)
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
