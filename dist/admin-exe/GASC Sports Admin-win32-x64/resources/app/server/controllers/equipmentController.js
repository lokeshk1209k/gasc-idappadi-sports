const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const StockService = require('../services/stockService');

// @desc    Get all equipment with search and filters
// @route   GET /api/equipment
// @access  Public / Private
exports.getAllEquipment = async (req, res) => {
  try {
    const { search, category, sportId, status, lowStock } = req.query;

    let query = supabase.from('equipment').select('*');

    if (category && category !== 'All') query = query.eq('category', category);
    if (sportId && sportId !== 'All') query = query.eq('sport_id', sportId);
    if (status && status !== 'All') query = query.eq('status', status);

    if (search) {
      query = query.or(`name.ilike.%${search.trim()}%,code.ilike.%${search.trim()}%,supplier.ilike.%${search.trim()}%`);
    }

    query = query.order('name', { ascending: true });

    let { data: itemsRaw, error } = await query;

    if (error || !itemsRaw || itemsRaw.length === 0) {
      try {
        const localStore = require('../data/localStore');
        const eqTable = localStore.storeInstance.getTable('equipment');
        if (eqTable && eqTable.length > 0) {
          itemsRaw = eqTable;
          error = null;
        }
      } catch (e) { /* ignore */ }
    }

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    let items = (itemsRaw || []).map(item => toCamelCase(item));

    if (lowStock === 'true') {
      items = items.filter(item => item.availableQuantity <= item.minimumStock);
    }

    res.json({
      success: true,
      count: items.length,
      equipment: items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single equipment
// @route   GET /api/equipment/:id
// @access  Private
exports.getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    let { data: itemRaw, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!itemRaw) {
      try {
        const localStore = require('../data/localStore');
        const eqTable = localStore.storeInstance.getTable('equipment');
        itemRaw = eqTable.find(e => e.id === id);
      } catch (e) { /* ignore */ }
    }

    if (!itemRaw) {
      return res.status(404).json({ success: false, message: 'Equipment item not found.' });
    }

    const equipment = toCamelCase(itemRaw);

    let { data: txRaw } = await supabase
      .from('equipment_transactions')
      .select('*')
      .eq('equipment_id', id)
      .order('issue_date', { ascending: false });

    if (!txRaw || txRaw.length === 0) {
      try {
        const localStore = require('../data/localStore');
        const txTable = localStore.storeInstance.getTable('equipment_transactions');
        txRaw = txTable.filter(t => t.equipment_id === id);
      } catch (e) { /* ignore */ }
    }

    const transactions = (txRaw || []).map(toCamelCase);

    res.json({
      success: true,
      equipment,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create equipment
// @route   POST /api/equipment
// @access  Private/Admin
exports.createEquipment = async (req, res) => {
  try {
    const {
      name,
      code,
      sportId,
      category,
      totalQuantity,
      minimumStock,
      purchaseDate,
      purchasePrice,
      supplier,
      storageLocation,
      condition,
      warranty,
      description
    } = req.body;

    if (!name || !code || totalQuantity === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check code uniqueness in localStore and Supabase
    try {
      const localStore = require('../data/localStore');
      const eqTable = localStore.storeInstance.getTable('equipment');
      const existing = eqTable.find(e => (e.code && e.code.toUpperCase() === cleanCode));
      if (existing) {
        return res.status(400).json({ success: false, message: 'Equipment code already exists. Use a unique code.' });
      }
    } catch (e) { /* ignore */ }

    let sport = null;
    if (sportId) {
      try {
        const { data: sData } = await supabase.from('sports').select('*').or(`id.eq.${sportId},name.ilike.%${sportId}%`).limit(1).maybeSingle();
        if (sData) sport = sData;
      } catch (e) {}

      if (!sport) {
        try {
          const localStore = require('../data/localStore');
          const sportsTable = localStore.storeInstance.getTable('sports');
          sport = sportsTable.find(s => String(s.id) === String(sportId) || (s.name && s.name.toLowerCase().includes(String(sportId).toLowerCase())));
        } catch (e) {}
      }
    }

    const sportName = sport ? sport.name : (req.body.sportName || sportId || 'General Sports');
    const sportIdVal = sport ? sport.id : (sportId || 'sp_general');

    const totalQty = parseInt(totalQuantity, 10);
    let image = '/images/equipment/default.jpg';
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    const eqId = 'eq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const condVal = condition || 'Good';

    // 1. Full rich object for localStore & API response
    const newRecord = {
      id: eqId,
      name: name.trim(),
      code: cleanCode,
      sport_id: sportIdVal,
      sport_name: sportName,
      category: category || 'Balls & Shuttles',
      total_quantity: totalQty,
      available_quantity: totalQty,
      issued_quantity: 0,
      damaged_quantity: 0,
      lost_quantity: 0,
      minimum_stock: minimumStock !== undefined ? parseInt(minimumStock, 10) : 5,
      purchase_date: purchaseDate ? new Date(purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : 0,
      supplier: supplier || 'Salem Sports Goods Co.',
      storage_location: storageLocation || 'Sports Room Shelf A1',
      condition: condVal,
      condition_status: condVal,
      warranty: warranty || '1 Year',
      description: description || '',
      image,
      status: 'In Stock',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 2. Safe Supabase schema insert
    const supabasePayload = {
      id: eqId,
      name: name.trim(),
      code: cleanCode,
      category: category || 'Balls & Shuttles',
      sport_name: sportName,
      total_quantity: totalQty,
      available_quantity: totalQty,
      issued_quantity: 0,
      condition_status: condVal,
      location: storageLocation || 'Sports Room Shelf A1'
    };

    try {
      await supabase.from('equipment').insert(supabasePayload);
    } catch (supaErr) {
      console.warn('Supabase equipment insert notice:', supaErr.message);
    }

    // 3. Save to localStore
    try {
      const localStore = require('../data/localStore');
      const storeInstance = localStore.storeInstance;
      const eqTable = storeInstance.getTable('equipment');
      eqTable.push(newRecord);
      storeInstance.save();
    } catch (e) {
      console.warn('localStore save notice:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'New equipment registered successfully!',
      equipment: toCamelCase(newRecord)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Private/Admin
exports.updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    let itemRaw = null;
    try {
      const { data } = await supabase.from('equipment').select('*').eq('id', id).maybeSingle();
      if (data) itemRaw = data;
    } catch (e) {}

    if (!itemRaw) {
      try {
        const localStore = require('../data/localStore');
        const eqTable = localStore.storeInstance.getTable('equipment');
        itemRaw = eqTable.find(e => String(e.id) === String(id));
      } catch (e) {}
    }

    if (!itemRaw) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    const {
      name,
      category,
      totalQuantity,
      minimumStock,
      purchasePrice,
      supplier,
      storageLocation,
      condition,
      warranty,
      description
    } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (category) updates.category = category;
    if (totalQuantity !== undefined) {
      const newTotal = parseInt(totalQuantity, 10);
      updates.total_quantity = newTotal;
      const issued = itemRaw.issued_quantity || itemRaw.issuedQuantity || 0;
      const damaged = itemRaw.damaged_quantity || itemRaw.damagedQuantity || 0;
      const lost = itemRaw.lost_quantity || itemRaw.lostQuantity || 0;
      const available = Math.max(0, newTotal - (issued + damaged + lost));
      updates.available_quantity = available;
      if (available === 0) updates.status = 'Out of Stock';
      else if (available <= (minimumStock !== undefined ? parseInt(minimumStock, 10) : (itemRaw.minimum_stock || 5))) updates.status = 'Low Stock';
      else updates.status = 'In Stock';
    }
    if (minimumStock !== undefined) updates.minimum_stock = parseInt(minimumStock, 10);
    if (purchasePrice !== undefined) updates.purchase_price = parseFloat(purchasePrice);
    if (supplier) updates.supplier = supplier;
    if (storageLocation) updates.storage_location = storageLocation;
    if (condition) {
      updates.condition = condition;
      updates.condition_status = condition;
    }
    if (warranty) updates.warranty = warranty;
    if (description !== undefined) updates.description = description;

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    // Update Supabase
    try {
      const supaUpdates = {};
      if (updates.name) supaUpdates.name = updates.name;
      if (updates.category) supaUpdates.category = updates.category;
      if (updates.total_quantity !== undefined) supaUpdates.total_quantity = updates.total_quantity;
      if (updates.available_quantity !== undefined) supaUpdates.available_quantity = updates.available_quantity;
      if (updates.condition_status) supaUpdates.condition_status = updates.condition_status;
      if (updates.storage_location) supaUpdates.location = updates.storage_location;
      await supabase.from('equipment').update(supaUpdates).eq('id', id);
    } catch (e) {}

    // Update localStore
    let updatedObj = { ...itemRaw, ...updates };
    try {
      const localStore = require('../data/localStore');
      const storeInstance = localStore.storeInstance;
      const eqTable = storeInstance.getTable('equipment');
      const idx = eqTable.findIndex(e => String(e.id) === String(id));
      if (idx >= 0) {
        eqTable[idx] = { ...eqTable[idx], ...updates };
        updatedObj = eqTable[idx];
        storeInstance.save();
      }
    } catch (e) {}

    res.json({
      success: true,
      message: 'Equipment updated successfully!',
      equipment: toCamelCase(updatedObj)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private/Admin
exports.deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    let itemRaw = null;
    try {
      const { data } = await supabase.from('equipment').select('*').eq('id', id).maybeSingle();
      if (data) itemRaw = data;
    } catch (e) {}

    if (!itemRaw) {
      try {
        const localStore = require('../data/localStore');
        const eqTable = localStore.storeInstance.getTable('equipment');
        itemRaw = eqTable.find(e => String(e.id) === String(id));
      } catch (e) {}
    }

    if (!itemRaw) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    const issuedQty = itemRaw.issued_quantity || itemRaw.issuedQuantity || 0;
    if (issuedQty > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${issuedQty} unit(s) of this equipment are currently issued to students.`
      });
    }

    try {
      await supabase.from('equipment').delete().eq('id', id);
    } catch (e) {}

    try {
      const localStore = require('../data/localStore');
      const storeInstance = localStore.storeInstance;
      const eqTable = storeInstance.getTable('equipment');
      const filtered = eqTable.filter(e => String(e.id) !== String(id));
      storeInstance.setTable('equipment', filtered);
      storeInstance.save();
    } catch (e) {}

    res.json({
      success: true,
      message: 'Equipment deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lookup student by register number for equipment issuing
// @route   GET /api/equipment/lookup-student/:regNo
// @access  Public / Private/Admin
exports.lookupStudent = async (req, res) => {
  try {
    const { regNo } = req.params;
    if (!regNo) {
      return res.status(400).json({ success: false, message: 'Register Number is required.' });
    }

    const cleanReg = regNo.trim();

    // 1. Look up in users table
    const { data: userRaw } = await supabase
      .from('users')
      .select('id, name, register_number, department, year, profile_photo, mobile, email, status, role')
      .or(`register_number.ilike.%${cleanReg}%,name.ilike.%${cleanReg}%,id.eq.${cleanReg}`)
      .neq('role', 'admin')
      .limit(1)
      .maybeSingle();

    let student = userRaw ? toCamelCase(userRaw) : null;

    // 2. If not found in users, look up in college_student_roster
    if (!student) {
      const { data: rosterRaw } = await supabase
        .from('college_student_roster')
        .select('*')
        .ilike('register_number', `%${cleanReg}%`)
        .limit(1)
        .maybeSingle();

      if (rosterRaw) {
        student = {
          id: `ros_${rosterRaw.id || rosterRaw.register_number}`,
          name: rosterRaw.name,
          registerNumber: rosterRaw.register_number,
          department: rosterRaw.department,
          year: rosterRaw.year,
          profilePhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
          mobile: '',
          status: 'Active'
        };
      }
    }

    // 3. Check localStore fallback
    if (!student) {
      try {
        const localStore = require('../data/localStore');
        const storeInstance = localStore.storeInstance;
        const uTable = storeInstance.getTable('users');
        const localUser = uTable.find(u => 
          (u.register_number && u.register_number.toLowerCase().includes(cleanReg.toLowerCase())) ||
          (u.name && u.name.toLowerCase().includes(cleanReg.toLowerCase()))
        );
        if (localUser) {
          student = toCamelCase(localUser);
        }
      } catch (e) { /* ignore */ }
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    // 4. Find active issues for this student (for duplicate check)
    let activeIssues = [];
    try {
      const { data: activeTxsRaw } = await supabase
        .from('equipment_transactions')
        .select('*')
        .or(`student_id.eq.${student.id},register_number.ilike.%${student.registerNumber}%`)
        .eq('status', 'Issued');

      if (activeTxsRaw && activeTxsRaw.length > 0) {
        activeIssues = activeTxsRaw.map(toCamelCase);
      } else {
        const localStore = require('../data/localStore');
        const storeInstance = localStore.storeInstance;
        const txTable = storeInstance.getTable('equipment_transactions');
        activeIssues = txTable
          .filter(t => (t.student_id === student.id || t.register_number === student.registerNumber) && t.status === 'Issued')
          .map(toCamelCase);
      }
    } catch (e) { /* ignore */ }

    res.json({
      success: true,
      message: 'Student Found ✓',
      student: {
        ...student,
        activeIssuesCount: activeIssues.length,
        activeIssues
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Issue equipment to student
// @route   POST /api/equipment/issue
// @access  Private/Admin
exports.issueEquipment = async (req, res) => {
  try {
    const { studentIdentifier, equipmentId, quantity, expectedReturnDate, purpose, remarks } = req.body;

    if (!studentIdentifier || !equipmentId || !quantity || !expectedReturnDate) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    // Date validation: expectedReturnDate cannot be before today
    const todayStr = new Date().toISOString().split('T')[0];
    const returnDateStr = new Date(expectedReturnDate).toISOString().split('T')[0];
    if (returnDateStr < todayStr) {
      return res.status(400).json({ success: false, message: 'Expected return date cannot be before today.' });
    }

    // Find student by registerNumber or ID
    let studentRaw = null;
    try {
      const cleanIdent = studentIdentifier.trim();
      const { data: userRaw } = await supabase
        .from('users')
        .select('*')
        .or(`register_number.ilike.%${cleanIdent}%,id.eq.${cleanIdent}`)
        .neq('role', 'admin')
        .limit(1)
        .maybeSingle();
      if (userRaw) studentRaw = userRaw;
    } catch (e) {}

    if (!studentRaw) {
      const { data: rosterRaw } = await supabase
        .from('college_student_roster')
        .select('*')
        .ilike('register_number', `%${studentIdentifier.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (rosterRaw) {
        studentRaw = {
          id: `ros_${rosterRaw.id || rosterRaw.register_number}`,
          name: rosterRaw.name,
          register_number: rosterRaw.register_number,
          department: rosterRaw.department,
          year: rosterRaw.year,
          role: 'student'
        };
      }
    }

    if (!studentRaw) {
      try {
        const localStore = require('../data/localStore');
        const storeInstance = localStore.storeInstance;
        const uTable = storeInstance.getTable('users');
        const localUser = uTable.find(u => 
          (u.register_number && u.register_number.toLowerCase().includes(studentIdentifier.trim().toLowerCase())) ||
          (u.name && u.name.toLowerCase().includes(studentIdentifier.trim().toLowerCase()))
        );
        if (localUser) studentRaw = localUser;
      } catch (e) { /* ignore */ }
    }

    if (!studentRaw) {
      return res.status(404).json({ success: false, message: `Student with Register Number "${studentIdentifier}" not found.` });
    }

    const student = toCamelCase(studentRaw);

    const result = await StockService.issueEquipment({
      student,
      equipmentId,
      quantity,
      expectedReturnDate,
      purpose,
      remarks,
      issuedBy: (req.user && req.user.name) || 'Sports Incharge'
    });

    res.json({
      success: true,
      message: `✓ Equipment Issued Successfully: ${quantity} unit(s) of ${result.equipment.name} issued to ${student.name} (${student.registerNumber})`,
      transaction: result.transaction,
      equipment: result.equipment
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Return equipment
// @route   POST /api/equipment/return
// @access  Private/Admin
exports.returnEquipment = async (req, res) => {
  try {
    const { transactionId, returnCondition, damageDescription, fineAmount, remarks } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
    }

    const result = await StockService.returnEquipment({
      transactionId,
      returnCondition: returnCondition || 'Good',
      damageDescription,
      fineAmount,
      remarks
    });

    res.json({
      success: true,
      message: `Equipment return processed successfully (${result.transaction.returnCondition}). Stock restored.`,
      transaction: result.transaction,
      equipment: result.equipment
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all transactions with search, filter & statistics
// @route   GET /api/equipment/transactions
// @access  Private/Admin
exports.getAllTransactions = async (req, res) => {
  try {
    const { status, studentId, equipmentId, search, date } = req.query;

    let query = supabase.from('equipment_transactions').select('*, users(id, name, register_number, department, mobile), equipment(id, name, code, category, image)');

    if (status && status !== 'All' && status !== 'Overdue') {
      query = query.eq('status', status);
    }
    if (studentId) query = query.eq('student_id', studentId);
    if (equipmentId) query = query.eq('equipment_id', equipmentId);

    query = query.order('issue_date', { ascending: false });

    const { data: txsRaw, error } = await query;

    let rawList = txsRaw || [];
    if (error || rawList.length === 0) {
      try {
        const localStore = require('../data/localStore');
        const storeInstance = localStore.storeInstance;
        rawList = storeInstance.getTable('equipment_transactions');
      } catch (e) { /* ignore */ }
    }

    const now = new Date();
    let transactions = rawList.map(t => {
      const item = toCamelCase(t);
      if (t.users) item.studentId = toCamelCase(t.users);
      if (t.equipment) item.equipmentId = toCamelCase(t.equipment);
      
      const isPastExpected = item.status === 'Issued' && new Date(item.expectedReturnDate) < now;
      item.isOverdue = isPastExpected;
      if (isPastExpected) {
        const diffMs = now.getTime() - new Date(item.expectedReturnDate).getTime();
        item.daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        item.daysOverdue = 0;
      }
      return item;
    });

    // Apply Overdue filter
    if (status === 'Overdue') {
      transactions = transactions.filter(t => t.isOverdue);
    } else if (status && status !== 'All') {
      transactions = transactions.filter(t => t.status === status);
    }

    // Apply Search
    if (search && search.trim() !== '') {
      const s = search.trim().toLowerCase();
      transactions = transactions.filter(t => 
        (t.studentName && t.studentName.toLowerCase().includes(s)) ||
        (t.registerNumber && t.registerNumber.toLowerCase().includes(s)) ||
        (t.equipmentName && t.equipmentName.toLowerCase().includes(s)) ||
        (t.id && String(t.id).toLowerCase().includes(s))
      );
    }

    // Apply Date filter
    if (date) {
      transactions = transactions.filter(t => t.issueDate && t.issueDate.startsWith(date));
    }

    // Compute stock & issue overview metrics
    let totalEquipment = 0;
    let availableStock = 0;
    let issuedStock = 0;
    try {
      const { data: allEq } = await supabase.from('equipment').select('total_quantity, available_quantity, issued_quantity');
      const eqItems = (allEq && allEq.length > 0) ? allEq : require('../data/localStore').storeInstance.getTable('equipment');
      (eqItems || []).forEach(e => {
        totalEquipment += Number(e.total_quantity || e.totalQuantity || 0);
        availableStock += Number(e.available_quantity || e.availableQuantity || 0);
        issuedStock += Number(e.issued_quantity || e.issuedQuantity || 0);
      });
    } catch (e) { /* ignore */ }

    const overdueCount = rawList.filter(t => t.status === 'Issued' && new Date(t.expected_return_date || t.expectedReturnDate) < now).length;

    const summaryStats = {
      totalEquipment,
      availableStock,
      issuedStock,
      overdueCount
    };

    res.json({
      success: true,
      count: transactions.length,
      transactions,
      stats: summaryStats,
      summaryStats,
      overview: summaryStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's issued and previous equipment
// @route   GET /api/equipment/my-equipment
// @access  Public / Private/Student
exports.getMyEquipment = async (req, res) => {
  try {
    const studentIdentifier = (req.user && req.user.id) || 
                              req.headers['x-student-id'] || 
                              req.headers['x-register-number'] || 
                              req.query.studentId || 
                              req.query.registerNumber || 
                              '21CS001';

    let txsRaw = [];
    const { data: dbTxs, error } = await supabase
      .from('equipment_transactions')
      .select('*, equipment(id, name, code, category, storage_location, image)')
      .or(`student_id.eq.${studentIdentifier},register_number.ilike.%${studentIdentifier}%`)
      .order('issue_date', { ascending: false });

    if (error || !dbTxs || dbTxs.length === 0) {
      try {
        const localStore = require('../data/localStore');
        const storeInstance = localStore.storeInstance;
        const allTxs = storeInstance.getTable('equipment_transactions');
        txsRaw = allTxs.filter(t => 
          t.student_id === studentIdentifier || 
          (t.register_number && t.register_number.toLowerCase().includes(studentIdentifier.toLowerCase()))
        );
      } catch (e) { /* ignore */ }
    } else {
      txsRaw = dbTxs;
    }

    const now = new Date();
    const activeIssued = [];
    const history = [];

    (txsRaw || []).forEach(t => {
      const item = toCamelCase(t);
      if (t.equipment) item.equipmentId = toCamelCase(t.equipment);
      
      const isPastExpected = item.status === 'Issued' && new Date(item.expectedReturnDate) < now;
      item.isOverdue = isPastExpected;
      if (isPastExpected) {
        const diffMs = now.getTime() - new Date(item.expectedReturnDate).getTime();
        item.daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        item.daysOverdue = 0;
      }

      if (item.status === 'Issued') {
        activeIssued.push(item);
      } else {
        history.push(item);
      }
    });

    const overdueCount = activeIssued.filter(t => t.isOverdue).length;

    res.json({
      success: true,
      activeIssued,
      history,
      stats: {
        currentlyIssued: activeIssued.length,
        returned: history.length,
        overdue: overdueCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

