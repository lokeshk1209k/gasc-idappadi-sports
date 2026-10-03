// Vercel Serverless API Handler
// Routes all /api/* requests to the Express app (server/server.js)
// Environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) must be
// set in Vercel Project Settings → Environment Variables

const { app } = require('../server/server');

module.exports = (req, res) => {
  return app(req, res);
};
