const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');
const notificationService = require('./notificationService');

class StockService {
  /**
   * Recalculates and updates stock for an equipment item
   */
  static async recalculateStock(equipmentId) {
    const { data: itemRaw, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', equipmentId)
      .single();

    if (error || !itemRaw) throw new Error('Equipment not found');

    const total = itemRaw.total_quantity || 0;
    const issued = itemRaw.issued_quantity || 0;
    const damaged = itemRaw.damaged_quantity || 0;
    const lost = itemRaw.lost_quantity || 0;
    const minStock = itemRaw.minimum_stock || 5;

    const available = Math.max(0, total - (issued + damaged + lost));
    let status = 'In Stock';
    if (available === 0) {
      status = 'Out of Stock';
    } else if (available <= minStock) {
      status = 'Low Stock';
    }

    const { data: updatedRaw } = await supabase
      .from('equipment')
      .update({
        available_quantity: available,
        status
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (available <= minStock) {
      await notificationService.notifyLowStock(itemRaw.name, available, minStock);
    }

    return toCamelCase(updatedRaw);
  }

  /**
   * Issue equipment to a student
   */
  static async issueEquipment({ student, equipmentId, quantity, expectedReturnDate, purpose, remarks, issuedBy }) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive number');
    }

    let eqRaw = null;
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', equipmentId)
        .maybeSingle();
      if (!error && data) eqRaw = data;
    } catch (e) {}

    if (!eqRaw) {
      try {
        const localStore = require('../data/localStore');
        const eqTable = localStore.storeInstance.getTable('equipment');
        eqRaw = eqTable.find(e => String(e.id) === String(equipmentId));
      } catch (e) {}
    }

    if (!eqRaw) {
      throw new Error('Equipment item not found');
    }

    const availableQty = (eqRaw.available_quantity !== undefined) ? eqRaw.available_quantity : (eqRaw.availableQuantity !== undefined ? eqRaw.availableQuantity : 0);
    const totalQty = (eqRaw.total_quantity !== undefined) ? eqRaw.total_quantity : (eqRaw.totalQuantity !== undefined ? eqRaw.totalQuantity : 0);
    const minStock = (eqRaw.minimum_stock !== undefined) ? eqRaw.minimum_stock : (eqRaw.minimumStock !== undefined ? eqRaw.minimumStock : 5);
    const issuedCurrent = (eqRaw.issued_quantity !== undefined) ? eqRaw.issued_quantity : (eqRaw.issuedQuantity !== undefined ? eqRaw.issuedQuantity : 0);
    const damagedCurrent = (eqRaw.damaged_quantity !== undefined) ? eqRaw.damaged_quantity : (eqRaw.damagedQuantity !== undefined ? eqRaw.damagedQuantity : 0);
    const lostCurrent = (eqRaw.lost_quantity !== undefined) ? eqRaw.lost_quantity : (eqRaw.lostQuantity !== undefined ? eqRaw.lostQuantity : 0);

    if (availableQty < qty) {
      throw new Error(`Insufficient equipment available. Requested: ${qty}, Available: ${availableQty}`);
    }

    // Deduct stock
    const newIssued = issuedCurrent + qty;
    const available = Math.max(0, totalQty - (newIssued + damagedCurrent + lostCurrent));

    let status = 'In Stock';
    if (available === 0) {
      status = 'Out of Stock';
    } else if (available <= minStock) {
      status = 'Low Stock';
    }

    try {
      await supabase
        .from('equipment')
        .update({
          issued_quantity: newIssued,
          available_quantity: available
        })
        .eq('id', equipmentId);
    } catch (supaErr) {
      console.warn('Supabase stock update notice on equipment:', supaErr.message);
    }

    const now = new Date();
    const issueDateStr = now.toISOString();
    const issueTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Create transaction record
    const newTxRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      student_id: student.id,
      student_name: student.name,
      register_number: student.registerNumber,
      equipment_id: equipmentId,
      equipment_name: eqRaw.name,
      quantity: qty,
      issue_date: issueDateStr,
      issue_time: issueTimeStr,
      expected_return_date: new Date(expectedReturnDate).toISOString(),
      status: 'Issued',
      return_condition: 'Pending',
      purpose: purpose || 'College Practice / Match',
      remarks: remarks || '',
      issued_by: issuedBy || 'Sports Incharge',
      created_at: issueDateStr,
      updated_at: issueDateStr
    };

    let txRaw = newTxRecord;
    try {
      const { data: insertedTx, error: txErr } = await supabase
        .from('equipment_transactions')
        .insert(newTxRecord)
        .select()
        .single();
      if (!txErr && insertedTx) {
        txRaw = insertedTx;
      }
    } catch (supaTxErr) {}

    // Sync localStore for 100% offline & persistent reliability
    try {
      const localStore = require('../data/localStore');
      const storeInstance = localStore.storeInstance;
      
      // Sync equipment
      const eqTable = storeInstance.getTable('equipment');
      const eqIdx = eqTable.findIndex(e => String(e.id) === String(equipmentId));
      if (eqIdx >= 0) {
        eqTable[eqIdx] = { ...eqTable[eqIdx], issued_quantity: newIssued, available_quantity: available, status };
      }

      // Sync transaction
      const txTable = storeInstance.getTable('equipment_transactions');
      const existingTxIdx = txTable.findIndex(t => String(t.id) === String(txRaw.id));
      if (existingTxIdx >= 0) {
        txTable[existingTxIdx] = txRaw;
      } else {
        txTable.unshift(txRaw);
      }
      storeInstance.save();
    } catch (e) {
      console.warn('localStore sync notice on issueEquipment:', e.message);
    }

    const transaction = toCamelCase(txRaw);
    const equipment = toCamelCase({ ...eqRaw, issued_quantity: newIssued, available_quantity: available, status });

    // Notification to student
    try {
      await notificationService.notifyEquipmentIssued(
        student.id,
        eqRaw.name,
        qty,
        expectedReturnDate
      );
    } catch (e) { /* ignore */ }

    if (available <= minStock) {
      try {
        await notificationService.notifyLowStock(eqRaw.name, available, minStock);
      } catch (e) { /* ignore */ }
    }

    return { transaction, equipment };
  }

  /**
   * Return equipment with condition evaluation
   */
  static async returnEquipment({ transactionId, returnCondition, damageDescription, fineAmount, remarks }) {
    const { data: txRaw, error: txErr } = await supabase
      .from('equipment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txErr || !txRaw) {
      // Check localStore if Supabase missed it
      const localStore = require('../data/localStore');
      const storeInstance = localStore.storeInstance;
      const txTable = storeInstance.getTable('equipment_transactions');
      const localTx = txTable.find(t => String(t.id) === String(transactionId));
      if (!localTx) {
        throw new Error('Transaction record not found');
      }
    }

    const activeTx = txRaw || require('../data/localStore').storeInstance.getTable('equipment_transactions').find(t => String(t.id) === String(transactionId));

    if (activeTx.status === 'Returned' || activeTx.status === 'Damaged' || activeTx.status === 'Lost') {
      throw new Error('This equipment has already been returned or processed.');
    }

    const { data: eqRaw } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', activeTx.equipment_id)
      .single();

    const currentEq = eqRaw || require('../data/localStore').storeInstance.getTable('equipment').find(e => String(e.id) === String(activeTx.equipment_id));

    if (!currentEq) {
      throw new Error('Associated equipment not found');
    }

    const qty = activeTx.quantity || 1;
    let newStatus = 'Returned';
    let damagedInc = 0;
    let lostInc = 0;

    if (returnCondition === 'Good' || !returnCondition) {
      newStatus = 'Returned';
    } else if (returnCondition === 'Damaged') {
      newStatus = 'Damaged';
      damagedInc = qty;
    } else if (returnCondition === 'Lost') {
      newStatus = 'Lost';
      lostInc = qty;
    } else if (returnCondition === 'Partially Damaged') {
      newStatus = 'Returned';
      damagedInc = 1;
    }

    const newIssued = Math.max(0, (currentEq.issued_quantity || 0) - qty);
    const newDamaged = (currentEq.damaged_quantity || 0) + damagedInc;
    const newLost = (currentEq.lost_quantity || 0) + lostInc;
    const available = Math.max(0, currentEq.total_quantity - (newIssued + newDamaged + newLost));

    let eqStatus = 'In Stock';
    if (available === 0) {
      eqStatus = 'Out of Stock';
    } else if (available <= (currentEq.minimum_stock || 2)) {
      eqStatus = 'Low Stock';
    }

    try {
      await supabase
        .from('equipment')
        .update({
          issued_quantity: newIssued,
          available_quantity: available
        })
        .eq('id', currentEq.id);
    } catch (supaErr) {
      console.warn('Supabase stock return update notice:', supaErr.message);
    }

    const returnNow = new Date();
    const returnDateStr = returnNow.toISOString();
    const returnTimeStr = returnNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const txUpdates = {
      status: newStatus,
      return_date: returnDateStr,
      return_time: returnTimeStr,
      return_condition: returnCondition || 'Good',
      damage_description: damageDescription || '',
      fine_amount: parseFloat(fineAmount) || 0,
      remarks: remarks ? (activeTx.remarks ? `${activeTx.remarks} | ${remarks}` : remarks) : activeTx.remarks
    };

    let updatedTxRaw = null;
    const { data: supabaseUpdatedTx } = await supabase
      .from('equipment_transactions')
      .update(txUpdates)
      .eq('id', transactionId)
      .select()
      .single();

    updatedTxRaw = supabaseUpdatedTx || { ...activeTx, ...txUpdates };

    // Sync to localStore
    try {
      const localStore = require('../data/localStore');
      const storeInstance = localStore.storeInstance;
      
      const eqTable = storeInstance.getTable('equipment');
      const eqIdx = eqTable.findIndex(e => String(e.id) === String(currentEq.id));
      if (eqIdx >= 0) {
        eqTable[eqIdx] = { ...eqTable[eqIdx], issued_quantity: newIssued, damaged_quantity: newDamaged, lost_quantity: newLost, available_quantity: available, status: eqStatus };
      }

      const txTable = storeInstance.getTable('equipment_transactions');
      const txIdx = txTable.findIndex(t => String(t.id) === String(transactionId));
      if (txIdx >= 0) {
        txTable[txIdx] = { ...txTable[txIdx], ...txUpdates };
      }
      storeInstance.save();
    } catch (e) {
      console.warn('localStore sync notice on returnEquipment:', e.message);
    }

    return {
      transaction: toCamelCase(updatedTxRaw),
      equipment: toCamelCase(updatedEqRaw)
    };
  }
}

module.exports = StockService;
