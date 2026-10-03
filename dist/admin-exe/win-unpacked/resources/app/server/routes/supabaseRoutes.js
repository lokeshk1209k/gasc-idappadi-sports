const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const { isSupabaseConfigured, supabaseUrl } = require('../config/supabase');

// @route   GET /api/supabase/status
// @desc    Check Supabase connection status
// @access  Public
router.get('/status', async (req, res) => {
  const isConfigured = isSupabaseConfigured();
  
  if (!isConfigured) {
    return res.json({
      success: false,
      configured: false,
      message: 'Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env file.',
      schemaFile: 'supabase_schema.sql'
    });
  }

  const testResult = await supabaseService.testConnection();
  return res.json({
    success: testResult.success,
    configured: true,
    supabaseUrl: supabaseUrl ? supabaseUrl.replace(/^(https:\/\/[^.]+).*/, '$1.supabase.co') : null,
    testResult
  });
});

module.exports = router;
