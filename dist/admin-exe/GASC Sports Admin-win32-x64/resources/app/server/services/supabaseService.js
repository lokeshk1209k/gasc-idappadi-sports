const { supabase, isSupabaseConfigured } = require('../config/supabase');

class SupabaseService {
  /**
   * Health check / Connection test for Supabase
   */
  async testConnection() {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY) are not configured in .env'
      };
    }

    try {
      const { data, error } = await supabase.from('admin_settings').select('*').limit(1);
      if (error) {
        return {
          success: false,
          error: error.message,
          hint: error.hint || 'Make sure you have executed the supabase_schema.sql script in Supabase SQL Editor.'
        };
      }
      return {
        success: true,
        message: 'Supabase database is connected and active!',
        data
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Get all items from any table
   */
  async getAll(tableName, selectQuery = '*', filters = {}) {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      let query = supabase.from(tableName).select(selectQuery);
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Insert record(s) into any table
   */
  async insert(tableName, recordOrRecords) {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.from(tableName).insert(recordOrRecords).select();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update record by ID
   */
  async updateById(tableName, id, updateData) {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.from(tableName).update(updateData).eq('id', id).select();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete record by ID
   */
  async deleteById(tableName, id) {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SupabaseService();
