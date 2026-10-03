const { supabase, toCamelCase } = require('../utils/supabaseHelper');

// @desc    Generate Master Sports Department Reports
// @route   GET /api/reports/:type
// @access  Private/Admin
exports.getReportData = async (req, res) => {
  try {
    const { type } = req.params;

    const { data: settingsRaw } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .single();

    const settings = settingsRaw ? toCamelCase(settingsRaw) : {
      collegeName: 'Government Arts and Science College, Idappadi',
      departmentName: 'Department of Physical Education & Sports',
      sportsInchargeName: 'Dr. K. Malathi, M.P.Ed., M.Phil., Ph.D.'
    };

    let reportTitle = '';
    let data = [];

    switch (type) {
      case 'players': {
        reportTitle = 'Official Registered Players Directory';
        const { data: playersRaw } = await supabase
          .from('users')
          .select('name, register_number, department, year, section, gender, mobile, email, status, created_at')
          .eq('role', 'student')
          .order('department', { ascending: true })
          .order('name', { ascending: true });
        data = (playersRaw || []).map(toCamelCase);
        break;
      }

      case 'equipment-stock': {
        reportTitle = 'Sports Equipment Inventory & Stock Reserve Report';
        const { data: eqRaw } = await supabase
          .from('equipment')
          .select('*')
          .order('sport_name', { ascending: true })
          .order('name', { ascending: true });
        data = (eqRaw || []).map(toCamelCase);
        break;
      }

      case 'equipment-transactions': {
        reportTitle = 'Equipment Issue & Return Audit Log';
        const { data: txsRaw } = await supabase
          .from('equipment_transactions')
          .select('*, users(name, register_number, department), equipment(name, code)')
          .order('issue_date', { ascending: false });
        data = (txsRaw || []).map(t => {
          const item = toCamelCase(t);
          if (t.users) item.studentId = toCamelCase(t.users);
          if (t.equipment) item.equipmentId = toCamelCase(t.equipment);
          return item;
        });
        break;
      }

      case 'competitions': {
        reportTitle = 'Collegiate & Zonal Competitions Summary Report';
        const { data: compsRaw } = await supabase
          .from('competitions')
          .select('*')
          .order('date', { ascending: false });
        data = (compsRaw || []).map(toCamelCase);
        break;
      }

      case 'teams': {
        reportTitle = 'College Sports Teams & Captains Directory';
        const { data: teamsRaw } = await supabase
          .from('teams')
          .select('*')
          .order('sport_name', { ascending: true })
          .order('department', { ascending: true });
        data = (teamsRaw || []).map(toCamelCase);
        break;
      }

      case 'achievements': {
        reportTitle = 'Hall of Fame & Medalist Honours Report';
        const { data: achsRaw } = await supabase
          .from('achievements')
          .select('*')
          .order('date', { ascending: false });
        data = (achsRaw || []).map(toCamelCase);
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type requested.' });
    }

    res.json({
      success: true,
      reportType: type,
      reportTitle,
      college: settings.collegeName,
      department: settings.departmentName,
      incharge: settings.sportsInchargeName,
      generatedAt: new Date(),
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
